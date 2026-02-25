// app.js - Hauptlogik, Navigation, Event-Handling

// ── Dropdown-Konfiguration ──
const CONFIG = {
  typ: ['Flach-HK profiliert', 'Flach-HK glatt', 'Glieder', 'Konvektor', 'Bad'],
  artFlach: ['10', '11', '20', '21', '22', '30', '33'],
  baulaenge: [400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1800,2000,2200,2400,2600,2800,3000],
  bauhoehe: [350, 500, 600, 900],
  nabenabstand: [100, 200],
  dnVentil: ['DN10', 'DN15', 'DN20', 'DN25'],
  ventilform: ['Durchgang', 'Eck', 'Axial', 'Winkeleck li.', 'Winkeleck re.'],
  einbausituation: ['normal', 'freistehend', 'hinter Verkleidung', 'unter Brüstung', 'sonstige']
};

let currentProjektId = null;
let currentHkId = null;
let formPhotos = [null, null, null];

// ── Navigation ──

function navigate(screen, pushState = true) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screen).classList.add('active');
  if (pushState) {
    const hash = screen === 'screen-projekte' ? '' : screen;
    history.pushState({ screen }, '', hash ? '#' + hash : window.location.pathname);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.screen) {
    navigate(e.state.screen, false);
  } else {
    navigate('screen-projekte', false);
  }
});

// ── Toast ──

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Projektliste ──

async function renderProjekte() {
  const list = document.getElementById('projekt-list');
  const projekte = await getAllProjekte();
  if (projekte.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128203;</div>
        <p>Noch keine Projekte vorhanden.<br>Erstellen Sie ein neues Projekt.</p>
      </div>`;
    return;
  }
  projekte.sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
  let html = '';
  for (const p of projekte) {
    const hks = await getHeizkoerperByProjekt(p.id);
    const datum = new Date(p.erstelltAm).toLocaleDateString('de-DE');
    html += `
      <div class="card" data-id="${p.id}" onclick="openProjekt('${p.id}')">
        <div class="card-title">${esc(p.name)}</div>
        <div class="card-sub">${datum} &middot; ${hks.length} HK</div>
      </div>`;
  }
  list.innerHTML = html;
}

function showNewProjektDialog() {
  document.getElementById('modal-new-projekt').style.display = 'flex';
  const inp = document.getElementById('input-projekt-name');
  inp.value = '';
  inp.focus();
}

function closeNewProjektDialog() {
  document.getElementById('modal-new-projekt').style.display = 'none';
}

async function createNewProjekt() {
  const name = document.getElementById('input-projekt-name').value.trim();
  if (!name) return;
  await createProjekt(name);
  closeNewProjektDialog();
  await renderProjekte();
  showToast('Projekt erstellt');
}

async function openProjekt(id) {
  currentProjektId = id;
  const p = await getProjekt(id);
  document.getElementById('header-projekt-name').textContent = p.name;
  await renderHkList();
  navigate('screen-hk-list');
}

async function confirmDeleteProjekt(id) {
  const p = await getProjekt(id);
  if (confirm(`Projekt "${p.name}" und alle Heizkörper wirklich löschen?`)) {
    await deleteProjekt(id);
    await renderProjekte();
    showToast('Projekt gelöscht');
  }
}

// ── Heizkörper-Liste ──

async function renderHkList() {
  const list = document.getElementById('hk-list');
  let hks = await getHeizkoerperByProjekt(currentProjektId);

  // Filter
  const filterText = document.getElementById('filter-text')?.value?.toLowerCase() || '';
  if (filterText) {
    hks = hks.filter(hk =>
      (hk.gebaeude || '').toLowerCase().includes(filterText) ||
      (hk.geschoss || '').toLowerCase().includes(filterText) ||
      (hk.raumnr || '').toLowerCase().includes(filterText) ||
      (hk.raumbezeichnung || '').toLowerCase().includes(filterText)
    );
  }

  // Sortierung: Gebäude > Geschoss > Raum > HK-Nr
  hks.sort((a, b) =>
    (a.gebaeude || '').localeCompare(b.gebaeude || '') ||
    (a.geschoss || '').localeCompare(b.geschoss || '') ||
    (a.raumnr || '').localeCompare(b.raumnr || '') ||
    (Number(a.hkNr) || 0) - (Number(b.hkNr) || 0)
  );

  document.getElementById('hk-count').textContent = hks.length;

  if (hks.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128293;</div>
        <p>Noch keine Heizkörper erfasst.<br>Tippen Sie auf + um einen hinzuzufügen.</p>
      </div>`;
    return;
  }

  let html = '';
  for (const hk of hks) {
    const info = [hk.gebaeude, hk.geschoss, `R${hk.raumnr}`].filter(Boolean).join(' / ');
    html += `
      <div class="card" onclick="openHkForm('${hk.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-title">HK ${esc(String(hk.hkNr || '-'))}</div>
          ${hk.typ ? `<span class="badge">${esc(hk.typ)}</span>` : ''}
        </div>
        <div class="card-sub">${esc(info)}${hk.raumbezeichnung ? ' &middot; ' + esc(hk.raumbezeichnung) : ''}</div>
      </div>`;
  }
  list.innerHTML = html;
}

// ── Erfassungsformular ──

async function openHkForm(hkId) {
  currentHkId = hkId || null;
  let hk;

  if (hkId) {
    // Bearbeiten
    hk = await getHeizkoerper(hkId);
    document.getElementById('header-form-title').textContent = 'HK bearbeiten';
    document.getElementById('btn-delete-hk').style.display = 'inline-flex';
  } else {
    // Neu: Smart-Defaults vom letzten Eintrag
    const last = await getLastHeizkoerper(currentProjektId);
    hk = newHeizkoerper(currentProjektId, last ? {
      gebaeude: last.gebaeude,
      geschoss: last.geschoss,
      raumnr: last.raumnr
    } : null);
    // Nächste HK-Nr ermitteln
    const all = await getHeizkoerperByProjekt(currentProjektId);
    const maxNr = all.reduce((max, h) => Math.max(max, Number(h.hkNr) || 0), 0);
    hk.hkNr = maxNr + 1;
    document.getElementById('header-form-title').textContent = 'Neuer Heizkörper';
    document.getElementById('btn-delete-hk').style.display = 'none';
  }

  fillForm(hk);
  navigate('screen-form');
}

function fillForm(hk) {
  document.getElementById('f-gebaeude').value = hk.gebaeude || '';
  document.getElementById('f-geschoss').value = hk.geschoss || '';
  document.getElementById('f-raumnr').value = hk.raumnr || '';
  document.getElementById('f-raumbezeichnung').value = hk.raumbezeichnung || '';
  document.getElementById('f-hkNr').value = hk.hkNr || '';
  document.getElementById('f-typ').value = hk.typ || '';
  document.getElementById('f-artFlach').value = hk.artFlach || '';
  document.getElementById('f-baulaenge').value = hk.baulaenge || '';
  document.getElementById('f-bauhoehe').value = hk.bauhoehe || '';
  document.getElementById('f-nabenabstand').value = hk.nabenabstand || '';
  document.getElementById('f-dnVentil').value = hk.dnVentil || '';
  document.getElementById('f-ventilform').value = hk.ventilform || '';
  document.getElementById('f-einbausituation').value = hk.einbausituation || '';
  document.getElementById('f-bemerkung').value = hk.bemerkung || '';

  setToggle('f-hahnblock', hk.hahnblock);
  setToggle('f-rlVerschraubung', hk.rlVerschraubung);

  // Art-Dropdown Sichtbarkeit
  updateArtVisibility();

  // Fotos
  formPhotos = [null, null, null];
  if (hk.fotos) {
    for (let i = 0; i < 3; i++) {
      formPhotos[i] = hk.fotos[i] || null;
    }
  }
  renderPhotoSlots();
}

function updateArtVisibility() {
  const typ = document.getElementById('f-typ').value;
  const artGroup = document.getElementById('group-artFlach');
  const isFlach = typ.startsWith('Flach-HK');
  artGroup.style.display = isFlach ? 'block' : 'none';
  if (!isFlach) document.getElementById('f-artFlach').value = '';
}

function setToggle(name, value) {
  document.querySelectorAll(`[data-toggle="${name}"]`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === String(value));
  });
}

function handleToggle(name, value) {
  setToggle(name, value);
}

function getToggleValue(name) {
  const active = document.querySelector(`[data-toggle="${name}"].active`);
  return active ? active.dataset.value === 'true' : false;
}

async function saveForm() {
  const hk = currentHkId ? await getHeizkoerper(currentHkId) : newHeizkoerper(currentProjektId);

  hk.gebaeude = document.getElementById('f-gebaeude').value.trim();
  hk.geschoss = document.getElementById('f-geschoss').value.trim();
  hk.raumnr = document.getElementById('f-raumnr').value.trim();
  hk.raumbezeichnung = document.getElementById('f-raumbezeichnung').value.trim();
  hk.hkNr = document.getElementById('f-hkNr').value.trim();
  hk.typ = document.getElementById('f-typ').value;
  hk.artFlach = document.getElementById('f-artFlach').value;
  hk.baulaenge = document.getElementById('f-baulaenge').value;
  hk.bauhoehe = document.getElementById('f-bauhoehe').value;
  hk.nabenabstand = document.getElementById('f-nabenabstand').value;
  hk.dnVentil = document.getElementById('f-dnVentil').value;
  hk.ventilform = document.getElementById('f-ventilform').value;
  hk.hahnblock = getToggleValue('f-hahnblock');
  hk.rlVerschraubung = getToggleValue('f-rlVerschraubung');
  hk.einbausituation = document.getElementById('f-einbausituation').value;
  hk.bemerkung = document.getElementById('f-bemerkung').value.trim();
  hk.fotos = formPhotos.filter(Boolean);

  await saveHeizkoerper(hk);
  await renderHkList();
  navigate('screen-hk-list');
  showToast('Heizkörper gespeichert');
}

async function deleteCurrentHk() {
  if (!currentHkId) return;
  if (confirm('Heizkörper wirklich löschen?')) {
    await deleteHeizkoerper(currentHkId);
    await renderHkList();
    navigate('screen-hk-list');
    showToast('Heizkörper gelöscht');
  }
}

// ── Fotos ──

function renderPhotoSlots() {
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`photo-slot-${i}`);
    if (formPhotos[i]) {
      slot.innerHTML = `
        <img src="${formPhotos[i]}" alt="Foto ${i + 1}">
        <button class="remove-photo" onclick="event.stopPropagation(); removePhoto(${i})">&times;</button>`;
    } else {
      slot.innerHTML = `<div class="placeholder">Foto ${i + 1}</div>`;
    }
  }
}

function triggerPhoto(index) {
  const input = document.getElementById('photo-input');
  input.dataset.index = index;
  input.click();
}

function handlePhotoInput(input) {
  const file = input.files[0];
  if (!file) return;
  const index = parseInt(input.dataset.index);
  compressImage(file, (dataUrl) => {
    formPhotos[index] = dataUrl;
    renderPhotoSlots();
  });
  input.value = '';
}

function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxW = 1920;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removePhoto(index) {
  formPhotos[index] = null;
  renderPhotoSlots();
}

// ── Export ──

async function exportData(format) {
  const hks = await getHeizkoerperByProjekt(currentProjektId);
  const projekt = await getProjekt(currentProjektId);

  hks.sort((a, b) =>
    (a.gebaeude || '').localeCompare(b.gebaeude || '') ||
    (a.geschoss || '').localeCompare(b.geschoss || '') ||
    (a.raumnr || '').localeCompare(b.raumnr || '') ||
    (Number(a.hkNr) || 0) - (Number(b.hkNr) || 0)
  );

  if (format === 'xlsx') {
    exportXlsx(hks, projekt.name);
  } else {
    exportCsv(hks, projekt.name);
  }
}

// ── Dropdown füllen ──

function populateDropdowns() {
  fillSelect('f-typ', CONFIG.typ);
  fillSelect('f-artFlach', CONFIG.artFlach);
  fillSelect('f-baulaenge', CONFIG.baulaenge.map(String));
  fillSelect('f-bauhoehe', CONFIG.bauhoehe.map(String));
  fillSelect('f-nabenabstand', CONFIG.nabenabstand.map(String));
  fillSelect('f-dnVentil', CONFIG.dnVentil);
  fillSelect('f-ventilform', CONFIG.ventilform);
  fillSelect('f-einbausituation', CONFIG.einbausituation);
}

function fillSelect(id, options) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">-- Auswahl --</option>';
  for (const opt of options) {
    sel.innerHTML += `<option value="${esc(opt)}">${esc(opt)}</option>`;
  }
}

// ── Hilfsfunktionen ──

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Init ──

document.addEventListener('DOMContentLoaded', async () => {
  await openDB();
  populateDropdowns();
  await renderProjekte();

  // Event-Listener für Typ-Dropdown
  document.getElementById('f-typ').addEventListener('change', updateArtVisibility);

  // Filter
  document.getElementById('filter-text').addEventListener('input', renderHkList);

  // Enter in Projekt-Name -> erstellen
  document.getElementById('input-projekt-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewProjekt();
  });

  // Startseite oder Hash-Navigation
  const hash = location.hash.replace('#', '');
  if (hash) {
    navigate(hash, false);
  }
});

// ── Service Worker Registrierung ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
