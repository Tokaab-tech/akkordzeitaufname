# Akkordzeit

Eine einfache Smartphone-Web-App für Akkordarbeit.

## Berechnung

- Gesamtzeit = Stückzahl × Zeit pro Teil + Rüstzeit + D-Stunden
- Erreichte Prozent = Gesamtzeit ÷ Arbeitszeit × 100 × 1,35

Reine D-Stunden-Einträge werden in der Tagesliste reduziert dargestellt: Überschrift, Dauer und optionale Anmerkung.

Die Arbeitszeit ist standardmäßig auf 420 Minuten gesetzt und kann im Formular geändert werden. Einträge werden nach Datum gespeichert. Angezeigt und addiert werden immer nur die Einträge des ausgewählten Datums. Die aufklappbare Monatsübersicht markiert Tage mit Einträgen farbig. Die Anzeige oben rechts zeigt den Durchschnitt der Tagesprozente im Monat des ausgewählten Datums.

## Backup und PDF

Über den Bereich `Daten` können alle Einträge als JSON-Backup exportiert und später wieder importiert werden. Der Monatsbericht wird als druckfertige Ansicht geöffnet und kann im Druckdialog als PDF gespeichert werden. Im Bericht wird der Monatsdurchschnitt der Tagesprozente angezeigt.

## Barcode-Scan

Neben Auftragsnr. und Identnr. gibt es jeweils einen Scan-Button. Wenn Kamera und Barcode-Erkennung auf dem Gerät verfügbar sind, wird der erkannte Wert zuerst zur Kontrolle angezeigt und erst nach Bestätigung in das passende Feld übernommen.

Anmerkungen gespeicherter Einträge können über den Button `Bearbeiten` nachträglich korrigiert werden.

Als Startbildschirm-Symbol verwendet die App `icon-192.png` und `icon-512.png`. Für iOS wird zusätzlich `apple-touch-icon.png` verwendet.

Über den Button `Monatsübersicht` öffnet sich eine zweite Seite mit gestapelten Säulen für alle Arbeitstage. Stückzeit, Rüstzeit und D-Stunden werden farblich getrennt dargestellt; Monat und Jahr sind auswählbar.

## Start

Öffne `index.html` im Browser. Auf dem Smartphone kann die Seite über die Browserfunktion „Zum Startbildschirm hinzufügen“ wie eine App installiert werden.
