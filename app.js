const form = document.querySelector("#workForm");
const inputs = {
  date: document.querySelector("#date"),
  orderNumber: document.querySelector("#orderNumber"),
  identNumber: document.querySelector("#identNumber"),
  quantity: document.querySelector("#quantity"),
  timePerPart: document.querySelector("#timePerPart"),
  setupTime: document.querySelector("#setupTime"),
  downtime: document.querySelector("#downtime"),
  availableTime: document.querySelector("#availableTime"),
  notes: document.querySelector("#notes"),
};
const totalTimeOutput = document.querySelector("#totalTime");
const percentageOutput = document.querySelector("#percentage");
const statusBadge = document.querySelector("#statusBadge");
const saveButton = document.querySelector("#saveEntry");
const clearButton = document.querySelector("#clearEntries");
const entryList = document.querySelector("#entryList");
const exportBackupButton = document.querySelector("#exportBackup");
const importBackupButton = document.querySelector("#importBackup");
const backupFileInput = document.querySelector("#backupFile");
const exportMonthPdfButton = document.querySelector("#exportMonthPdf");
const printReport = document.querySelector("#printReport");
const monthlyOverviewLink = document.querySelector("#monthlyOverviewLink");
const calendarToggle = document.querySelector("#calendarToggle");
const calendarPanel = document.querySelector("#calendarPanel");
const calendarTitle = document.querySelector("#calendarTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const previousMonthButton = document.querySelector("#previousMonth");
const nextMonthButton = document.querySelector("#nextMonth");
const scannerDialog = document.querySelector("#scannerDialog");
const scannerVideo = document.querySelector("#scannerVideo");
const scannerTitle = document.querySelector("#scannerTitle");
const scannerStatus = document.querySelector("#scannerStatus");
const closeScannerButton = document.querySelector("#closeScanner");
const scanButtons = document.querySelectorAll("[data-scan-target]");
const scannerResult = document.querySelector("#scannerResult");
const scannerResultValue = document.querySelector("#scannerResultValue");
const rescanBarcodeButton = document.querySelector("#rescanBarcode");
const confirmBarcodeButton = document.querySelector("#confirmBarcode");
const noteEditorDialog = document.querySelector("#noteEditorDialog");
const noteEditorValue = document.querySelector("#noteEditorValue");
const closeNoteEditorButton = document.querySelector("#closeNoteEditor");
const cancelNoteEditButton = document.querySelector("#cancelNoteEdit");
const saveNoteEditButton = document.querySelector("#saveNoteEdit");

const storageKey = "akkordzeit.entriesByDate";
const legacyStorageKey = "akkordzeit.entries";
const performanceFactor = 1.35;
let scannerStream = null;
let scannerAnimationFrame = null;
let scannerTargetInput = null;
let barcodeDetector = null;
let scannerEngine = null;
let zxingReader = null;
let zxingControls = null;
let pendingScanResult = "";
let editingEntryDate = null;
let editingEntryId = null;

function toNumber(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = round(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function createEntryId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function calculateEntry() {
  const quantity = toNumber(inputs.quantity.value);
  const timePerPart = toNumber(inputs.timePerPart.value);
  const setupTime = toNumber(inputs.setupTime.value);
  const downtime = toNumber(inputs.downtime.value);
  const availableTime = toNumber(inputs.availableTime.value);
  const totalTime = quantity * timePerPart + setupTime + downtime;
  const percentage = availableTime > 0 ? (totalTime / availableTime) * 100 * performanceFactor : 0;

  return {
    totalTime: round(totalTime),
    percentage: round(percentage),
  };
}

function hasDraftEntry() {
  return toNumber(inputs.quantity.value) > 0
    || toNumber(inputs.timePerPart.value) > 0
    || toNumber(inputs.setupTime.value) > 0
    || toNumber(inputs.downtime.value) > 0;
}

function sumEntries(entries) {
  return entries.reduce(
    (sum, entry) => ({
      totalTime: round(sum.totalTime + toNumber(entry.totalTime)),
      percentage: round(sum.percentage + toNumber(entry.percentage)),
    }),
    { totalTime: 0, percentage: 0 },
  );
}

function getMonthKey(date) {
  return date.slice(0, 7);
}

function formatDate(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function formatDisplayDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("de-DE");
}

function getMonthTitle(monthKey) {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function getMonthlyAveragePercentage(selectedDate, draftTotal) {
  const selectedMonth = getMonthKey(selectedDate);
  const entriesByDate = loadEntriesByDate();
  const dayPercentages = Object.entries(entriesByDate)
    .filter(([date, entries]) => getMonthKey(date) === selectedMonth && entries.length > 0)
    .map(([, entries]) => sumEntries(entries).percentage);

  if (draftTotal && draftTotal.percentage > 0) {
    const selectedDateIndex = Object.keys(entriesByDate)
      .filter((date) => getMonthKey(date) === selectedMonth && entriesByDate[date].length > 0)
      .indexOf(selectedDate);

    if (selectedDateIndex >= 0) {
      dayPercentages[selectedDateIndex] = round(dayPercentages[selectedDateIndex] + draftTotal.percentage);
    } else {
      dayPercentages.push(draftTotal.percentage);
    }
  }

  if (dayPercentages.length === 0) {
    return 0;
  }

  const totalPercentage = dayPercentages.reduce((sum, percentage) => sum + percentage, 0);
  return round(totalPercentage / dayPercentages.length);
}

function updateResults() {
  const selectedDate = inputs.date.value;
  const dayEntries = getEntriesForDate(selectedDate);
  const savedTotal = sumEntries(dayEntries);
  const draftTotal = hasDraftEntry() ? calculateEntry() : { totalTime: 0, percentage: 0 };
  const dayTotal = {
    totalTime: round(savedTotal.totalTime + draftTotal.totalTime),
    percentage: round(savedTotal.percentage + draftTotal.percentage),
  };

  totalTimeOutput.textContent = formatMinutes(dayTotal.totalTime);
  percentageOutput.textContent = `${dayTotal.percentage}%`;
  statusBadge.textContent = `Ø ${getMonthlyAveragePercentage(selectedDate, draftTotal)}%`;
  monthlyOverviewLink.href = `monthly.html?date=${encodeURIComponent(selectedDate)}`;
}

function normalizeEntriesByDate(rawEntries) {
  if (Array.isArray(rawEntries)) {
    return rawEntries.reduce((entriesByDate, entry) => {
      const date = entry.date || new Date().toISOString().slice(0, 10);
      entriesByDate[date] ||= [];
      entriesByDate[date].push({ ...entry, id: entry.id || createEntryId() });
      return entriesByDate;
    }, {});
  }

  if (!rawEntries || typeof rawEntries !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawEntries).map(([date, entries]) => [
      date,
      Array.isArray(entries)
        ? entries.map((entry) => ({ ...entry, id: entry.id || createEntryId() }))
        : [],
    ]),
  );
}

function loadEntriesByDate() {
  try {
    const savedEntries = JSON.parse(localStorage.getItem(storageKey));
    if (savedEntries) {
      const normalizedEntries = normalizeEntriesByDate(savedEntries);
      saveEntriesByDate(normalizedEntries);
      return normalizedEntries;
    }

    const legacyEntries = JSON.parse(localStorage.getItem(legacyStorageKey));
    const migratedEntries = normalizeEntriesByDate(legacyEntries);
    saveEntriesByDate(migratedEntries);
    localStorage.removeItem(legacyStorageKey);
    return migratedEntries;
  } catch {
    return {};
  }
}

function saveEntriesByDate(entriesByDate) {
  localStorage.setItem(storageKey, JSON.stringify(entriesByDate));
}

function getEntriesForDate(date) {
  const entriesByDate = loadEntriesByDate();
  return entriesByDate[date] || [];
}

function getEntriesForMonth(monthKey) {
  const entriesByDate = loadEntriesByDate();
  return Object.entries(entriesByDate)
    .filter(([date, entries]) => getMonthKey(date) === monthKey && entries.length > 0)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
}

function setCalendarOpen(isOpen) {
  calendarPanel.classList.toggle("is-collapsed", !isOpen);
  calendarToggle.setAttribute("aria-expanded", String(isOpen));
  calendarToggle.textContent = isOpen
    ? "Monatsübersicht ausblenden"
    : "Monatsübersicht anzeigen";
}

function renderEntries() {
  const selectedDate = inputs.date.value;
  const entries = getEntriesForDate(selectedDate);
  entryList.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Für dieses Datum sind noch keine Einträge gespeichert.";
    entryList.append(empty);
    return;
  }

  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "entry-card";

    const title = document.createElement("div");
    title.className = "entry-title";

    const entryHead = document.createElement("div");
    entryHead.className = "entry-head";

    const identNumber = document.createElement("span");
    identNumber.className = "entry-ident";
    identNumber.textContent = entry.identNumber || "Ohne Identnr.";

    const orderNumber = document.createElement("span");
    orderNumber.className = "entry-order";
    orderNumber.textContent = entry.orderNumber || "Ohne Auftrag";

    const percent = document.createElement("span");
    percent.className = "entry-percent";
    percent.textContent = `${entry.percentage}%`;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-entry";
    deleteButton.type = "button";
    deleteButton.textContent = "Löschen";
    deleteButton.addEventListener("click", () => {
      deleteEntry(selectedDate, entry.id);
    });

    const editButton = document.createElement("button");
    editButton.className = "edit-entry";
    editButton.type = "button";
    editButton.textContent = "Bearbeiten";
    editButton.addEventListener("click", () => {
      openNoteEditor(selectedDate, entry);
    });

    const entryActions = document.createElement("div");
    entryActions.className = "entry-actions";
    entryActions.append(editButton, deleteButton);

    const isDowntimeOnly = toNumber(entry.downtime) > 0
      && toNumber(entry.quantity) === 0
      && toNumber(entry.timePerPart) === 0
      && toNumber(entry.setupTime) === 0
      && !String(entry.identNumber || "").trim()
      && !String(entry.orderNumber || "").trim();

    if (isDowntimeOnly) {
      const downtimeTitle = document.createElement("strong");
      downtimeTitle.className = "entry-downtime-title";
      downtimeTitle.textContent = "D-Stunden";

      const downtimeValue = document.createElement("p");
      downtimeValue.className = "entry-downtime-value";
      downtimeValue.textContent = formatMinutes(entry.downtime);

      item.append(downtimeTitle, downtimeValue);

      if (entry.notes) {
        const notes = document.createElement("p");
        notes.className = "entry-note";
        notes.textContent = entry.notes;
        item.append(notes);
      }

      item.append(entryActions);
      entryList.append(item);
      continue;
    }

    const meta = document.createElement("p");
    meta.className = "entry-meta";
    meta.textContent = `${entry.quantity} Stk. · ${entry.timePerPart} min/Teil · Rüstzeit ${entry.setupTime || 0} min · D-Stunden ${entry.downtime || 0} min · Faktor ${performanceFactor}`;

    const total = document.createElement("p");
    total.textContent = `${formatMinutes(entry.totalTime)} Gesamtzeit`;

    item.append(title, meta, total);

    if (entry.notes) {
      const notes = document.createElement("p");
      notes.className = "entry-note";
      notes.textContent = entry.notes;
      item.append(notes);
    }

    entryHead.append(identNumber, orderNumber);
    title.append(entryHead, percent);
    item.append(entryActions);
    entryList.append(item);
  }
}

function openNoteEditor(date, entry) {
  editingEntryDate = date;
  editingEntryId = entry.id;
  noteEditorValue.value = entry.notes || "";
  noteEditorDialog.showModal();
  noteEditorValue.focus();
}

function closeNoteEditor() {
  editingEntryDate = null;
  editingEntryId = null;
  noteEditorValue.value = "";

  if (noteEditorDialog.open) {
    noteEditorDialog.close();
  }
}

function saveEditedNote() {
  if (!editingEntryDate || !editingEntryId) {
    return;
  }

  const entriesByDate = loadEntriesByDate();
  const entry = (entriesByDate[editingEntryDate] || [])
    .find((savedEntry) => savedEntry.id === editingEntryId);

  if (!entry) {
    closeNoteEditor();
    return;
  }

  entry.notes = noteEditorValue.value.trim();
  saveEntriesByDate(entriesByDate);
  closeNoteEditor();
  renderEntries();
}

function deleteEntry(date, entryId) {
  const entriesByDate = loadEntriesByDate();
  entriesByDate[date] = (entriesByDate[date] || []).filter((entry) => entry.id !== entryId);

  if (entriesByDate[date].length === 0) {
    delete entriesByDate[date];
  }

  saveEntriesByDate(entriesByDate);
  renderEntries();
  renderCalendar();
  updateResults();
}

function saveCurrentEntry() {
  if (!hasDraftEntry()) {
    return;
  }

  const result = calculateEntry();
  const selectedDate = inputs.date.value;
  const entry = {
    id: createEntryId(),
    date: selectedDate,
    orderNumber: inputs.orderNumber.value.trim(),
    identNumber: inputs.identNumber.value.trim(),
    quantity: toNumber(inputs.quantity.value),
    timePerPart: toNumber(inputs.timePerPart.value),
    setupTime: toNumber(inputs.setupTime.value),
    downtime: toNumber(inputs.downtime.value),
    availableTime: toNumber(inputs.availableTime.value),
    notes: inputs.notes.value.trim(),
    totalTime: result.totalTime,
    percentage: result.percentage,
    savedAt: new Date().toISOString(),
  };

  const entriesByDate = loadEntriesByDate();
  entriesByDate[selectedDate] ||= [];
  entriesByDate[selectedDate].unshift(entry);
  saveEntriesByDate(entriesByDate);
  clearDraftFields();
  renderEntries();
  renderCalendar();
  updateResults();
}

function clearDraftFields() {
  inputs.orderNumber.value = "";
  inputs.identNumber.value = "";
  inputs.quantity.value = "";
  inputs.timePerPart.value = "";
  inputs.setupTime.value = "";
  inputs.downtime.value = "";
  inputs.notes.value = "";
}

function setToday() {
  const requestedDate = new URLSearchParams(window.location.search).get("date");
  inputs.date.value = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate || "")
    ? requestedDate
    : new Date().toISOString().slice(0, 10);
}

function renderCalendar() {
  const selectedDate = inputs.date.value;
  const [selectedYear, selectedMonth, selectedDay] = selectedDate.split("-").map(Number);
  const monthIndex = selectedMonth - 1;
  const entriesByDate = loadEntriesByDate();
  const firstDay = new Date(selectedYear, monthIndex, 1);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const emptyDays = (firstDay.getDay() + 6) % 7;
  const monthName = firstDay.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  calendarTitle.textContent = monthName;
  calendarGrid.innerHTML = "";

  for (let i = 0; i < emptyDays; i += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-spacer";
    calendarGrid.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDate(selectedYear, monthIndex, day);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;

    if ((entriesByDate[date] || []).length > 0) {
      button.classList.add("has-entries");
    }

    if (day === selectedDay) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      inputs.date.value = date;
      renderEntries();
      renderCalendar();
      updateResults();
      setCalendarOpen(false);
    });

    calendarGrid.append(button);
  }
}

function changeSelectedMonth(offset) {
  const [year, month, day] = inputs.date.value.split("-").map(Number);
  const target = new Date(year, month - 1 + offset, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  inputs.date.value = formatDate(
    target.getFullYear(),
    target.getMonth(),
    Math.min(day, daysInTargetMonth),
  );
  renderEntries();
  renderCalendar();
  updateResults();
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBackup() {
  const backup = {
    app: "Akkordzeit",
    version: 1,
    exportedAt: new Date().toISOString(),
    storageKey,
    entriesByDate: loadEntriesByDate(),
  };
  const fileName = `akkordzeit-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  downloadBlob(blob, fileName);
}

function importBackupFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsedBackup = JSON.parse(reader.result);
      const importedEntries = normalizeEntriesByDate(parsedBackup.entriesByDate || parsedBackup);

      if (!Object.keys(importedEntries).length) {
        alert("In dieser Backup-Datei wurden keine Einträge gefunden.");
        return;
      }

      const shouldImport = confirm("Backup importieren? Die aktuellen Einträge werden dadurch ersetzt.");
      if (!shouldImport) {
        return;
      }

      saveEntriesByDate(importedEntries);
      renderEntries();
      renderCalendar();
      updateResults();
      alert("Backup wurde importiert.");
    } catch {
      alert("Die Backup-Datei konnte nicht gelesen werden.");
    } finally {
      backupFileInput.value = "";
    }
  });
  reader.readAsText(file);
}

function appendReportCell(row, text, tagName = "td") {
  const cell = document.createElement(tagName);
  cell.textContent = text;
  row.append(cell);
  return cell;
}

function renderMonthlyReport() {
  const monthKey = getMonthKey(inputs.date.value);
  const monthEntries = getEntriesForMonth(monthKey);
  const allEntries = monthEntries.flatMap(([, entries]) => entries);
  const monthTotal = sumEntries(allEntries);
  const monthAverage = getMonthlyAveragePercentage(`${monthKey}-01`, { totalTime: 0, percentage: 0 });

  printReport.innerHTML = "";

  const header = document.createElement("header");
  header.className = "report-header";

  const title = document.createElement("h1");
  title.textContent = "Akkordzeit Monatsbericht";

  const subtitle = document.createElement("p");
  subtitle.textContent = getMonthTitle(monthKey);
  header.append(title, subtitle);

  const summary = document.createElement("div");
  summary.className = "report-summary";
  const summaryItems = [
    ["Monatsdurchschnitt", `${monthAverage}%`],
    ["Gesamtzeit", formatMinutes(monthTotal.totalTime)],
    ["Tage mit Einträgen", String(monthEntries.length)],
    ["Einträge", String(allEntries.length)],
  ];

  for (const [label, value] of summaryItems) {
    const box = document.createElement("div");
    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    const valueElement = document.createElement("strong");
    valueElement.textContent = value;
    box.append(labelElement, valueElement);
    summary.append(box);
  }

  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Datum", "Identnr.", "Auftragsnr.", "Stk.", "min/Teil", "Rüstzeit", "D-Stunden", "Gesamtzeit", "%", "Anmerkung"]
    .forEach((heading) => appendReportCell(headRow, heading, "th"));
  head.append(headRow);
  table.append(head);

  const body = document.createElement("tbody");

  for (const [date, entries] of monthEntries) {
    for (const entry of entries) {
      const row = document.createElement("tr");
      appendReportCell(row, formatDisplayDate(date));
      appendReportCell(row, entry.identNumber || "-");
      appendReportCell(row, entry.orderNumber || "-");
      appendReportCell(row, entry.quantity ?? "0");
      appendReportCell(row, entry.timePerPart ?? "0");
      appendReportCell(row, entry.setupTime ?? "0");
      appendReportCell(row, entry.downtime ?? "0");
      appendReportCell(row, formatMinutes(entry.totalTime || 0));
      appendReportCell(row, `${entry.percentage || 0}%`);
      appendReportCell(row, entry.notes || "");
      body.append(row);
    }

    const dayTotal = sumEntries(entries);
    const totalRow = document.createElement("tr");
    totalRow.className = "report-day-total";
    appendReportCell(totalRow, `${formatDisplayDate(date)} Summe`);
    appendReportCell(totalRow, "");
    appendReportCell(totalRow, "");
    appendReportCell(totalRow, "");
    appendReportCell(totalRow, "");
    appendReportCell(totalRow, "");
    appendReportCell(totalRow, "");
    appendReportCell(totalRow, formatMinutes(dayTotal.totalTime));
    appendReportCell(totalRow, `${dayTotal.percentage}%`);
    appendReportCell(totalRow, "");
    body.append(totalRow);
  }

  if (monthEntries.length === 0) {
    const row = document.createElement("tr");
    const cell = appendReportCell(row, "Für diesen Monat sind keine Einträge gespeichert.");
    cell.colSpan = 10;
    body.append(row);
  }

  table.append(body);
  printReport.append(header, summary, table);
}

function exportMonthPdf() {
  renderMonthlyReport();
  window.print();
}

function stopScanner() {
  if (scannerAnimationFrame) {
    cancelAnimationFrame(scannerAnimationFrame);
    scannerAnimationFrame = null;
  }

  if (zxingControls) {
    zxingControls.stop();
    zxingControls = null;
  }

  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }

  scannerVideo.srcObject = null;
  scannerEngine = null;
  pendingScanResult = "";
  scannerResultValue.value = "";
  scannerResult.classList.add("is-hidden");

  if (scannerDialog.open) {
    scannerDialog.close();
  }
}

function applyScanResult(value) {
  if (!scannerTargetInput) {
    return;
  }

  scannerTargetInput.value = value;
  scannerTargetInput.dispatchEvent(new Event("input", { bubbles: true }));
  stopScanner();
}

function showScanResult(value) {
  pendingScanResult = value;
  scannerResultValue.value = value;
  scannerResult.classList.remove("is-hidden");
  scannerStatus.textContent = "Ergebnis prüfen und bestätigen.";
  scannerVideo.pause();

  if (scannerAnimationFrame) {
    cancelAnimationFrame(scannerAnimationFrame);
    scannerAnimationFrame = null;
  }
}

async function rescanBarcode() {
  pendingScanResult = "";
  scannerResultValue.value = "";
  scannerResult.classList.add("is-hidden");
  scannerStatus.textContent = "Barcode in den Rahmen halten.";

  if (scannerEngine === "zxing") {
    startZxingScanner();
    return;
  }

  await scannerVideo.play();
  detectBarcodeLoop();
}

async function detectBarcodeLoop() {
  if (!barcodeDetector || !scannerStream) {
    return;
  }

  try {
    const barcodes = await barcodeDetector.detect(scannerVideo);
    if (barcodes.length > 0) {
      const detectedValue = barcodes[0].rawValue.trim();
      if (detectedValue) {
        showScanResult(detectedValue);
        return;
      }
    }
  } catch {
    scannerStatus.textContent = "Barcode konnte nicht gelesen werden. Bitte erneut ausrichten.";
  }

  scannerAnimationFrame = requestAnimationFrame(detectBarcodeLoop);
}

function canUseZxingScanner() {
  return Boolean(window.ZXingBrowser?.BrowserMultiFormatReader);
}

async function startZxingScanner() {
  if (!canUseZxingScanner()) {
    alert("Der iOS-Scanner konnte nicht geladen werden. Bitte pruefen, ob vendor/zxing-browser.min.js vorhanden ist.");
    return;
  }

  if (zxingControls) {
    zxingControls.stop();
    zxingControls = null;
  }

  scannerEngine = "zxing";
  scannerStatus.textContent = "Barcode in den Rahmen halten.";
  if (!zxingReader) {
    zxingReader = new ZXingBrowser.BrowserMultiFormatReader();
  }

  try {
    zxingControls = await zxingReader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      scannerVideo,
      (result, error, controls) => {
        if (result) {
          controls.stop();
          zxingControls = null;
          showScanResult(result.getText().trim());
          return;
        }

        if (error?.name && !["NotFoundException", "ChecksumException", "FormatException"].includes(error.name)) {
          scannerStatus.textContent = "Barcode konnte nicht gelesen werden. Bitte erneut ausrichten.";
        }
      },
    );
  } catch {
    stopScanner();
    alert("Kamera konnte nicht gestartet werden. Auf iOS muss die App ueber HTTPS oder als installierte PWA geoeffnet werden.");
  }
}

async function startScanner(targetName) {
  scannerTargetInput = inputs[targetName];
  scannerTitle.textContent = targetName === "orderNumber"
    ? "Auftragsnr. scannen"
    : "Identnr. scannen";
  scannerStatus.textContent = "Kamera wird gestartet...";
  pendingScanResult = "";
  scannerResultValue.value = "";
  scannerResult.classList.add("is-hidden");

  if (!("BarcodeDetector" in window)) {
    alert("Barcode-Scanner wird von diesem Browser nicht unterstützt. Auf Android Chrome oder in einer APK sollte es eher funktionieren.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Die Kamera ist in dieser Umgebung nicht verfügbar. Eventuell blockiert file:// den Kamerazugriff.");
    return;
  }

  try {
    barcodeDetector = new BarcodeDetector({
      formats: [
        "code_128",
        "code_39",
        "code_93",
        "ean_13",
        "ean_8",
        "itf",
        "qr_code",
        "upc_a",
        "upc_e",
      ],
    });

    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    scannerVideo.srcObject = scannerStream;
    scannerDialog.showModal();
    await scannerVideo.play();
    scannerStatus.textContent = "Barcode in den Rahmen halten.";
    detectBarcodeLoop();
  } catch {
    stopScanner();
    alert("Kamera konnte nicht gestartet werden. Bitte Kameraberechtigung prüfen.");
  }
}

async function startScannerWithFallback(targetName) {
  scannerTargetInput = inputs[targetName];
  scannerTitle.textContent = targetName === "orderNumber"
    ? "Auftragsnr. scannen"
    : "Identnr. scannen";
  scannerStatus.textContent = "Kamera wird gestartet...";
  pendingScanResult = "";
  scannerResultValue.value = "";
  scannerResult.classList.add("is-hidden");

  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Die Kamera ist in dieser Umgebung nicht verfuegbar. Auf iOS bitte ueber HTTPS oder als installierte PWA oeffnen.");
    return;
  }

  scannerDialog.showModal();

  if (!("BarcodeDetector" in window)) {
    startZxingScanner();
    return;
  }

  try {
    scannerEngine = "native";
    barcodeDetector = new BarcodeDetector({
      formats: [
        "code_128",
        "code_39",
        "code_93",
        "ean_13",
        "ean_8",
        "itf",
        "qr_code",
        "upc_a",
        "upc_e",
      ],
    });

    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    scannerVideo.srcObject = scannerStream;
    await scannerVideo.play();
    scannerStatus.textContent = "Barcode in den Rahmen halten.";
    detectBarcodeLoop();
  } catch {
    stopScanner();
    alert("Kamera konnte nicht gestartet werden. Bitte Kameraberechtigung pruefen.");
  }
}

form.addEventListener("input", updateResults);
inputs.date.addEventListener("change", () => {
  renderEntries();
  renderCalendar();
  updateResults();
});
saveButton.addEventListener("click", saveCurrentEntry);
clearButton.addEventListener("click", () => {
  const selectedDate = inputs.date.value;
  const entriesByDate = loadEntriesByDate();
  delete entriesByDate[selectedDate];
  saveEntriesByDate(entriesByDate);
  renderEntries();
  renderCalendar();
  updateResults();
});
previousMonthButton.addEventListener("click", () => changeSelectedMonth(-1));
nextMonthButton.addEventListener("click", () => changeSelectedMonth(1));
calendarToggle.addEventListener("click", () => {
  setCalendarOpen(calendarPanel.classList.contains("is-collapsed"));
});
exportBackupButton.addEventListener("click", exportBackup);
importBackupButton.addEventListener("click", () => backupFileInput.click());
backupFileInput.addEventListener("change", () => {
  const [file] = backupFileInput.files;
  if (file) {
    importBackupFile(file);
  }
});
exportMonthPdfButton.addEventListener("click", exportMonthPdf);
scanButtons.forEach((button) => {
  button.addEventListener("click", () => startScannerWithFallback(button.dataset.scanTarget));
});
closeScannerButton.addEventListener("click", stopScanner);
rescanBarcodeButton.addEventListener("click", rescanBarcode);
confirmBarcodeButton.addEventListener("click", () => {
  if (pendingScanResult) {
    applyScanResult(pendingScanResult);
  }
});
scannerDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  stopScanner();
});
closeNoteEditorButton.addEventListener("click", closeNoteEditor);
cancelNoteEditButton.addEventListener("click", closeNoteEditor);
saveNoteEditButton.addEventListener("click", saveEditedNote);
noteEditorDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeNoteEditor();
});

setToday();
updateResults();
renderEntries();
renderCalendar();
setCalendarOpen(false);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
