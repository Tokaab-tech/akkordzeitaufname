const storageKey = "akkordzeit.entriesByDate";
const performanceFactor = 1.35;
const defaultAvailableTime = 420;

const monthSelect = document.querySelector("#monthSelect");
const yearSelect = document.querySelector("#yearSelect");
const monthAverageOutput = document.querySelector("#monthAverage");
const monthAverageWithoutDowntimeOutput = document.querySelector("#monthAverageWithoutDowntime");
const activeDaysOutput = document.querySelector("#activeDays");
const productionTimeTotalOutput = document.querySelector("#productionTimeTotal");
const setupTimeTotalOutput = document.querySelector("#setupTimeTotal");
const downtimeTotalOutput = document.querySelector("#downtimeTotal");
const chartTitle = document.querySelector("#chartTitle");
const chartContent = document.querySelector("#chartContent");
const backToApp = document.querySelector("#backToApp");

const monthNames = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function toNumber(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function formatMinutes(minutes) {
  const rounded = round(minutes);
  if (rounded < 60) {
    return `${rounded} min`;
  }

  const hours = Math.floor(rounded / 60);
  const rest = round(rounded % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function loadEntriesByDate() {
  try {
    const entries = JSON.parse(localStorage.getItem(storageKey));
    return entries && typeof entries === "object" ? entries : {};
  } catch {
    return {};
  }
}

function getRequestedDate() {
  const requestedDate = new URLSearchParams(window.location.search).get("date");
  return /^\d{4}-\d{2}-\d{2}$/.test(requestedDate || "")
    ? requestedDate
    : new Date().toISOString().slice(0, 10);
}

function populateSelectors() {
  monthNames.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1).padStart(2, "0");
    option.textContent = name;
    monthSelect.append(option);
  });

  const entriesByDate = loadEntriesByDate();
  const requestedYear = Number(getRequestedDate().slice(0, 4));
  const storedYears = Object.keys(entriesByDate)
    .map((date) => Number(date.slice(0, 4)))
    .filter(Number.isFinite);
  const years = [...new Set([requestedYear, new Date().getFullYear(), ...storedYears])]
    .sort((a, b) => b - a);

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = year;
    yearSelect.append(option);
  });

  const requestedDate = getRequestedDate();
  monthSelect.value = requestedDate.slice(5, 7);
  yearSelect.value = requestedDate.slice(0, 4);
}

function calculateDay(date, entries) {
  const totalPercentage = entries.reduce(
    (sum, entry) => sum + toNumber(entry.percentage),
    0,
  );
  const productionTime = entries.reduce((sum, entry) => (
    sum + toNumber(entry.quantity) * toNumber(entry.timePerPart)
  ), 0);
  const setupPercentage = entries.reduce((sum, entry) => {
    const availableTime = toNumber(entry.availableTime) || defaultAvailableTime;
    const setupTime = toNumber(entry.setupTime);
    return sum + (setupTime / availableTime) * 100 * performanceFactor;
  }, 0);
  const setupTime = entries.reduce((sum, entry) => sum + toNumber(entry.setupTime), 0);
  const downtimePercentage = entries.reduce((sum, entry) => {
    const availableTime = toNumber(entry.availableTime) || defaultAvailableTime;
    const downtime = toNumber(entry.downtime);
    return sum + (downtime / availableTime) * 100 * performanceFactor;
  }, 0);
  const downtime = entries.reduce((sum, entry) => sum + toNumber(entry.downtime), 0);
  const nonProductionPercentage = setupPercentage + downtimePercentage;
  const nonProductionScale = nonProductionPercentage > totalPercentage && nonProductionPercentage > 0
    ? totalPercentage / nonProductionPercentage
    : 1;

  return {
    date,
    day: Number(date.slice(8, 10)),
    percentage: round(totalPercentage),
    percentageWithoutDowntime: round(Math.max(totalPercentage - downtimePercentage, 0)),
    productionTime: round(productionTime),
    setupPercentage: round(setupPercentage * nonProductionScale),
    downtimePercentage: round(downtimePercentage * nonProductionScale),
    setupTime: round(setupTime),
    downtime: round(downtime),
  };
}

function getSelectedMonthDays() {
  const monthKey = `${yearSelect.value}-${monthSelect.value}`;
  return Object.entries(loadEntriesByDate())
    .filter(([date, entries]) => date.startsWith(monthKey) && Array.isArray(entries) && entries.length > 0)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, entries]) => calculateDay(date, entries));
}

function createBar(day, scale) {
  const column = document.createElement("div");
  column.className = "chart-column";
  column.title = `${day.date}: ${day.percentage}% davon Rüstzeit ${day.setupPercentage}% und D-Stunden ${day.downtimePercentage}%`;

  const barArea = document.createElement("div");
  barArea.className = "bar-area";
  const totalHeight = Math.max((day.percentage / scale) * 100, 1);
  barArea.style.setProperty("--bar-height", `${totalHeight}%`);

  const value = document.createElement("span");
  value.className = "bar-value";
  value.textContent = `${day.percentage}%`;

  const bar = document.createElement("div");
  bar.className = "stacked-bar";
  const setupShare = day.percentage > 0 ? (day.setupPercentage / day.percentage) * 100 : 0;
  const downtimeShare = day.percentage > 0 ? (day.downtimePercentage / day.percentage) * 100 : 0;

  const production = document.createElement("div");
  production.className = "bar-production";
  production.style.height = `${Math.max(100 - setupShare - downtimeShare, 0)}%`;

  const setup = document.createElement("div");
  setup.className = "bar-setup";
  setup.style.height = `${setupShare}%`;

  const downtime = document.createElement("div");
  downtime.className = "bar-downtime";
  downtime.style.height = `${downtimeShare}%`;

  const label = document.createElement("span");
  label.className = "bar-date";
  label.textContent = `${String(day.day).padStart(2, "0")}.${monthSelect.value}.`;

  bar.append(production, setup, downtime);
  barArea.append(value, bar);
  column.append(barArea, label);
  return column;
}

function renderOverview() {
  const days = getSelectedMonthDays();
  const percentageSum = days.reduce((sum, day) => sum + day.percentage, 0);
  const percentageWithoutDowntimeSum = days.reduce((sum, day) => (
    sum + day.percentageWithoutDowntime
  ), 0);
  const average = days.length > 0 ? round(percentageSum / days.length) : 0;
  const averageWithoutDowntime = days.length > 0
    ? round(percentageWithoutDowntimeSum / days.length)
    : 0;
  const productionTimeTotal = days.reduce((sum, day) => sum + day.productionTime, 0);
  const setupTimeTotal = days.reduce((sum, day) => sum + day.setupTime, 0);
  const downtimeTotal = days.reduce((sum, day) => sum + day.downtime, 0);
  const selectedMonthName = monthNames[Number(monthSelect.value) - 1];

  monthAverageOutput.textContent = `${average}%`;
  monthAverageWithoutDowntimeOutput.textContent = `${averageWithoutDowntime}%`;
  activeDaysOutput.textContent = days.length;
  productionTimeTotalOutput.textContent = formatMinutes(productionTimeTotal);
  setupTimeTotalOutput.textContent = formatMinutes(setupTimeTotal);
  downtimeTotalOutput.textContent = formatMinutes(downtimeTotal);
  chartTitle.textContent = `${selectedMonthName} ${yearSelect.value}`;
  backToApp.href = "index.html";
  chartContent.innerHTML = "";

  if (days.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "Für diesen Monat sind keine Einträge gespeichert.";
    chartContent.append(empty);
    return;
  }

  const maximum = Math.max(...days.map((day) => day.percentage), 100);
  const scale = Math.ceil(maximum / 25) * 25;
  const scroll = document.createElement("div");
  scroll.className = "chart-scroll";
  const chart = document.createElement("div");
  chart.className = "bar-chart";
  chart.setAttribute("aria-label", `Säulendiagramm bis ${scale} Prozent`);

  days.forEach((day) => chart.append(createBar(day, scale)));
  scroll.append(chart);
  chartContent.append(scroll);
}

monthSelect.addEventListener("change", renderOverview);
yearSelect.addEventListener("change", renderOverview);

populateSelectors();
renderOverview();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
