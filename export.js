// export.js - xlsx- und CSV-Export

const EXPORT_HEADERS = [
  'Gebäude', 'Geschoss', 'Raum-Nr.', 'Raumbezeichnung', 'HK-Nr.',
  'Typ', 'Art (Flach)', 'Baulänge [mm]', 'Bauhöhe [mm]',
  'Nabenabstand [mm]', 'DN Ventil', 'Ventilform',
  'Hahnblock', 'RL-Verschraubung', 'Einbausituation', 'Bemerkung'
];

const EXPORT_FIELDS = [
  'gebaeude', 'geschoss', 'raumnr', 'raumbezeichnung', 'hkNr',
  'typ', 'artFlach', 'baulaenge', 'bauhoehe',
  'nabenabstand', 'dnVentil', 'ventilform',
  'hahnblock', 'rlVerschraubung', 'einbausituation', 'bemerkung'
];

function hkToRow(hk) {
  return EXPORT_FIELDS.map(f => {
    const val = hk[f];
    if (typeof val === 'boolean') return val ? 'Ja' : 'Nein';
    return val != null ? String(val) : '';
  });
}

// ── xlsx-Export ──

function exportXlsx(hks, projektName) {
  if (typeof XLSX === 'undefined') {
    showToast('SheetJS Bibliothek nicht geladen');
    return;
  }

  const data = [EXPORT_HEADERS, ...hks.map(hkToRow)];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Spaltenbreiten
  ws['!cols'] = EXPORT_HEADERS.map((h, i) => ({
    wch: Math.max(h.length, ...hks.map(hk => String(hkToRow(hk)[i] || '').length), 10)
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HK-Aufnahme');

  const filename = sanitizeFilename(projektName) + '_HK-Aufnahme.xlsx';
  XLSX.writeFile(wb, filename);
  showToast('xlsx-Export erstellt');
}

// ── CSV-Export ──

function exportCsv(hks, projektName) {
  const rows = [EXPORT_HEADERS, ...hks.map(hkToRow)];
  const csv = rows.map(row =>
    row.map(cell => {
      const s = String(cell);
      if (s.includes(';') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(';')
  ).join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, sanitizeFilename(projektName) + '_HK-Aufnahme.csv');
  showToast('CSV-Export erstellt');
}

// ── Hilfsfunktionen ──

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').replace(/\s+/g, '_');
}
