const themeStorageKey = "akkordzeit.colorScheme";

const colorSchemes = [
  { value: "teal", label: "Akkordzeit Grün", themeColor: "#0f766e" },
  { value: "blue", label: "Industrie Blau", themeColor: "#2563eb" },
  { value: "graphite", label: "Graphit", themeColor: "#334155" },
  { value: "wine", label: "Weinrot", themeColor: "#9f1239" },
  { value: "forest", label: "Wald", themeColor: "#166534" },
  { value: "violet", label: "Violett", themeColor: "#7c3aed" },
  { value: "amber", label: "Bernstein", themeColor: "#b45309" },
];

function getSavedColorScheme() {
  const savedTheme = localStorage.getItem(themeStorageKey);
  return colorSchemes.some((scheme) => scheme.value === savedTheme)
    ? savedTheme
    : colorSchemes[0].value;
}

function applyColorScheme(themeName) {
  const scheme = colorSchemes.find((item) => item.value === themeName) || colorSchemes[0];
  document.documentElement.dataset.theme = scheme.value;
  localStorage.setItem(themeStorageKey, scheme.value);

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", scheme.themeColor);
  }
}

function setupColorSchemeSelect() {
  const select = document.querySelector("#colorSchemeSelect");
  if (!select) {
    return;
  }

  for (const scheme of colorSchemes) {
    const option = document.createElement("option");
    option.value = scheme.value;
    option.textContent = scheme.label;
    select.append(option);
  }

  select.value = getSavedColorScheme();
  select.addEventListener("change", () => applyColorScheme(select.value));
}

applyColorScheme(getSavedColorScheme());
setupColorSchemeSelect();
