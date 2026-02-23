# Bewerbungs-Tracker – Projektplan (MVP)

## Problem
Bei vielen Bewerbungen verliert man schnell den Überblick: In welchem Status ist welche Bewerbung, wann wurde sie verschickt, und was steht als Nächstes an?

## Lösung
Eine Web-App mit Kanban-Board (5 feste Status-Spalten) plus Suche/Filter. Jede Bewerbung ist eine Karte, die erstellt, bearbeitet, gelöscht und im Status geändert werden kann. Daten bleiben im Browser gespeichert (localStorage).

---

## Features (MVP)
- Kanban-Board mit 5 Status-Spalten: open, interview, test, offer, rejected
- Bewerbung anlegen (Create)
- Bewerbung bearbeiten (Edit)
- Bewerbung löschen (Delete) mit Bestätigung
- Status direkt auf der Karte ändern (Dropdown)
- Suche (company + role, case-insensitive)
- Status-Filter (all oder ein Status)
- Persistenz via localStorage (Reload behält Daten)
- Basic UX: leere Zustände pro Spalte, Pflichtfelder-Validierung, Modal sauber öffnen/schließen

## Optional 
- CSV Export aller Bewerbungen

---

## bewusst ausgeschlossene Features
- kein Login
- kein Backend
- keine Datenbank
- kein Drag-and-drop
- kein Upload
- keine Mehrbenutzer-Funktion / Sync zwischen Geräten

---

## Status-Spalten 
- **open**: Bewerbung ist versendet, noch keine Antwort
- **interview**: Einladung zum Bewerbungsgespräch
- **test**: Einladung zum Test/Assessment Center o.ä.
- **offer**: Angebot erhalten
- **rejected**: Absage erhalten

---

## Datenmodell (Bewerbungs-Eintrag)
### Nutzer-sichtbare Felder
- **company** (pflicht): Firma
- **role** (pflicht): Stelle / Berufsbezeichnung
- **status** (pflicht): open | interview | test | offer | rejected
- **appliedAt** (optional): Datum der Bewerbung (ISO yyyy-mm-dd)
- **link** (optional): Link zur Ausschreibung
- **contact** (optional): Kontakt (E-Mail und/oder Telefon)
- **notes** (optional): Notizen

### Interne Felder (nicht sichtbar)
- **id**: eindeutige ID
- **createdAt**: Erstellzeitpunkt (ISO Timestamp)
- **updatedAt**: Letzte Änderung (ISO Timestamp)

---

## Definition of Done 
- [ ] Ich kann Einträge erstellen, bearbeiten, löschen
- [ ] Ich kann den Status auf der Karte ändern und die Karte wandert in die richtige Spalte
- [ ] Suche + Statusfilter funktionieren auch kombiniert
- [ ] Nach Browser-Reload sind alle Einträge noch da (localStorage)
- [ ] UI ist benutzbar auf Desktop + schmalem Fenster (kein Layout-Crash)
- [ ] README ist vorhanden (Features, Setup, Screenshots, Live-Link Platzhalter)
- [ ] Live-Deploy ist online (Netlify) und Link steht im README
