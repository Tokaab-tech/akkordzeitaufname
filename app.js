const form = document.querySelector("#workForm");
const inputs = {
  date: document.querySelector("#date"),
  orderNumber: document.querySelector("#orderNumber"),
  identNumber: document.querySelector("#identNumber"),
  quantity: document.querySelector("#quantity"),
  timePerPart: document.querySelector("#timePerPart"),
  setupTime: document.querySelector("#setupTime"),
  availableTime: document.querySelector("#availableTime"),
  notes: document.querySelector("#notes"),
};
const totalTimeOutput = document.querySelector("#totalTime");
const percentageOutput = document.querySelector("#percentage");
const statusBadge = document.querySelector("#statusBadge");
const saveButton = document.querySelector("#saveEntry");
const clearButton = document.querySelector("#clearEntries");
const entryList = document.querySelector("#entryList");
const calendarToggle = document.querySelector("#calendarToggle");
const calendarPanel = document.querySelector("#calendarPanel");
const calendarTitle = document.querySelector("#calendarTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const previousMonthButton = document.querySelector("#previousMonth");
const nextMonthButton = document.querySelector("#nextMonth");

const storageKey = "akkordzeit.entriesByDate";
const legacyStorageKey = "akkordzeit.entries";
const performanceFactor = 1.35;

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
  const availableTime = toNumber(inputs.availableTime.value);
  const totalTime = quantity * timePerPart + setupTime;
  const percentage = availableTime > 0 ? (totalTime / availableTime) * 100 * performanceFactor : 0;

  return {
    totalTime: round(totalTime),
    percentage: round(percentage),
  };
}

function hasDraftEntry() {
  return toNumber(inputs.quantity.value) > 0
    || toNumber(inputs.timePerPart.value) > 0
    || toNumber(inputs.setupTime.value) > 0;
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

    const meta = document.createElement("p");
    meta.className = "entry-meta";
    meta.textContent = `${entry.quantity} Stk. · ${entry.timePerPart} min/Teil · Faktor ${performanceFactor}`;

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
    item.append(deleteButton);
    entryList.append(item);
  }
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
  inputs.notes.value = "";
}

function setToday() {
  inputs.date.value = new Date().toISOString().slice(0, 10);
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

setToday();
updateResults();
renderEntries();
renderCalendar();
setCalendarOpen(false);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
