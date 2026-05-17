export function InspectorRow(label, value) {
  if (value === null || value === undefined || value === "" || value === "N/A") {
    return document.createDocumentFragment();
  }

  const row = document.createElement("div");
  row.className = "inspector-row";

  const key = document.createElement("dt");
  key.textContent = label;

  const val = document.createElement("dd");
  val.textContent = value ?? "N/A";

  row.append(key, val);
  return row;
}
