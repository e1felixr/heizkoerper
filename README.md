# Heizkörper-Erfassung (HK-Aufnahme)

Progressive Web App (PWA) zur mobilen Erfassung von Heizkörperdaten bei Gebäudebegehungen. Läuft komplett im Browser, funktioniert offline und kann auf dem Smartphone wie eine native App installiert werden.

## Installation auf dem Smartphone

1. Seite im Browser öffnen (Chrome/Safari empfohlen)
2. **Android (Chrome):** Menü (drei Punkte) > "Zum Startbildschirm hinzufügen"
3. **iPhone (Safari):** Teilen-Button > "Zum Home-Bildschirm"
4. Die App erscheint als Icon auf dem Startbildschirm

## Updates & Versionierung

### Wie bekomme ich die neueste Version?

Die App nutzt eine **Network-first-Strategie**: Solange das Gerät online ist, werden bei jedem Öffnen automatisch die aktuellsten Dateien vom Server geladen. Ein Update läuft so ab:

1. App öffnen (vom Startbildschirm oder Browser)
2. Falls eine neue Version verfügbar ist, erscheint ein **gelbes Banner**: "Neue Version verfügbar!"
3. Auf **"Jetzt aktualisieren"** tippen
4. Die App lädt automatisch neu mit der aktuellen Version

Die aktuelle Version und das Datum der letzten Änderung werden im Header der App angezeigt.

### Wann muss ich den Cache manuell löschen?

Im Normalfall **nie** - das Update-System erledigt alles automatisch. Nur in diesen Ausnahmefällen ist ein manuelles Eingreifen nötig:

| Problem | Lösung |
|---------|--------|
| App zeigt trotz Internet eine alte Version und kein Update-Banner erscheint | Cache löschen (siehe unten) |
| App startet nicht oder zeigt eine leere Seite | Cache löschen und neu installieren |
| Nach einem fehlgeschlagenen Update hängt die App | Cache löschen |

**Cache löschen auf Android (Chrome):**
- Chrome > Einstellungen > Datenschutz > Browserdaten löschen > "Bilder und Dateien im Cache" auswählen
- Oder: Lange auf das App-Icon drücken > App-Info > Speicher > Cache leeren

**Cache löschen auf iPhone (Safari):**
- Einstellungen > Safari > Verlauf und Websitedaten löschen

**Wichtig:** Beim Cache-Löschen gehen **keine Projektdaten verloren!** Projekte und Heizkörper werden in der IndexedDB gespeichert, die vom Cache-Löschen nicht betroffen ist.

### Wann muss ich die App neu installieren?

Nur wenn sich die `manifest.json` ändert (z.B. App-Name, Icons, Orientierung). In diesem Fall:
1. App vom Startbildschirm entfernen
2. Seite im Browser neu öffnen
3. Erneut zum Startbildschirm hinzufügen

## Datenspeicherung

| Was | Wo | Überlebt Cache-Löschen? |
|-----|-----|------------------------|
| Projekte & Heizkörper | IndexedDB (im Browser) | Ja |
| Gebäudedaten (Import) | localStorage (pro Projekt) | Ja |
| Einstellungen (Erfasser, Schriftgröße) | localStorage | Ja |
| App-Dateien (HTML, CSS, JS) | Service Worker Cache | Nein (wird automatisch neu geladen) |

Alle Nutzerdaten bleiben lokal auf dem Gerät. Es werden keine Daten an einen Server übertragen.

### Daten zurücksetzen

Unter **Einstellungen > Gefahrenzone > "Alle Daten zurücksetzen"** können sämtliche Projekte, Heizkörper und importierte Gebäudedaten unwiderruflich gelöscht werden. Vor dem endgültigen Löschen erfolgt eine doppelte Sicherheitsabfrage.

## Gebäudedaten importieren

Über den Button **"Gebäudedaten"** in der Heizkörper-Liste können vordefinierte Vorschlagslisten für Gebäude, Etagen und Räume aus einer xlsx-Datei importiert werden. Beim Ausfüllen des Formulars erscheinen diese dann als Autovervollständigung.

### Datei-Anforderungen

- **Format:** `.xlsx` (Excel)
- **Speicherort:** Die Datei muss auf dem Gerät erreichbar sein (z.B. lokaler Speicher, Downloads-Ordner, OneDrive, Google Drive). Beim Antippen des Buttons öffnet sich der Datei-Picker des Geräts.

### Aufbau der xlsx-Datei

Die Datei muss folgende Spaltenstruktur haben (Zeile 1 = Überschrift, wird übersprungen):

| Spalte A | Spalte B | Spalte C | Spalte D | Spalte E |
|----------|----------|----------|----------|----------|
| **Gebäude** | *(frei)* | **Etage** | *(frei)* | **Raum** |
| Haus 1 | | UG | | Raum 1 |
| Haus 2 | | EG | | Raum 2 |
| Haus Norbert | | OG 1 | | Raum 12 |
| | | OG 2 | | |

- Nur die Spalten **A**, **C** und **E** werden ausgelesen
- Spalten B und D werden ignoriert (können leer sein oder andere Daten enthalten)
- Leere Zellen und Duplikate werden automatisch gefiltert
- Die Listen müssen nicht gleich lang sein (z.B. 3 Gebäude, 5 Etagen, 20 Räume)

### Hinweise

- Die Gebäudedaten werden **pro Projekt** gespeichert - verschiedene Projekte können unterschiedliche Gebäudedaten haben
- Ein erneuter Import überschreibt die bisherigen Gebäudedaten des Projekts
- Nach erfolgreichem Import erscheint ein Toast mit der Anzahl der importierten Einträge

## Features

- Projekte anlegen und verwalten
- Heizkörper mit Standort, Typ, Maßen, Ventil- und Einbaudaten erfassen
- Fotos direkt über die Kamera aufnehmen
- Gebäudedaten aus xlsx-Datei importieren (Autovervollständigung für Gebäude, Etagen, Räume)
- Export als xlsx oder CSV
- Offline-fähig
- Hoch- und Querformat

## Technischer Aufbau

```
index.html          Haupt-HTML mit allen Screens
app.js              Hauptlogik, Navigation, Event-Handling
db.js               IndexedDB-Wrapper (Projekte & Heizkörper)
export.js           Export-Funktionen (xlsx, CSV)
style.css           Mobile-first CSS
sw.js               Service Worker (Offline-Cache)
manifest.json       PWA-Manifest
lib/xlsx.mini.min.js  SheetJS für xlsx-Import/Export
```
