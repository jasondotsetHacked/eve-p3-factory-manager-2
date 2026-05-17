import { Panel } from "../primitives/Panel.js";
import { InspectorRow } from "../components/InspectorRow.js";
import { formatCycle, formatInteger } from "../../utils/format.js";

function hasValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

function MaterialList(items) {
  if (!items?.length) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "material-list";

  const title = document.createElement("h3");
  title.textContent = "Materials in Pin";
  section.append(title);

  const list = document.createElement("dl");
  list.className = "material-list__rows";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "material-list__row";

    const name = document.createElement("dt");
    name.textContent = item.name;

    const amount = document.createElement("dd");
    amount.textContent = formatInteger(item.amount);

    row.append(name, amount);
    list.append(row);
  });

  section.append(list);
  return section;
}

function RecipeList(pin) {
  if (!pin.inputs?.length && !pin.output) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "material-list";

  const title = document.createElement("h3");
  title.textContent = "Schematic Recipe";
  section.append(title);

  const list = document.createElement("dl");
  list.className = "material-list__rows";

  [...(pin.inputs ?? []), pin.output].filter(Boolean).forEach((item) => {
    const row = document.createElement("div");
    row.className = item.isInput ? "material-list__row" : "material-list__row material-list__row--output";

    const name = document.createElement("dt");
    name.textContent = `${item.isInput ? "Input" : "Output"}: ${item.name}`;

    const amount = document.createElement("dd");
    amount.textContent = formatInteger(item.quantity);

    row.append(name, amount);
    list.append(row);
  });

  section.append(list);
  return section;
}

function formatVolume(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return `${formatInteger(Math.round(value))} m3`;
}

export function PinInspector({ pin, isPreview = false }) {
  const content = document.createElement("div");
  content.className = "inspector-content";

  if (!pin) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Select a pin to inspect building details.";
    content.append(empty);
  } else {
    const heading = document.createElement("div");
    heading.className = "inspector-heading";

    const title = document.createElement("h2");
    title.textContent = isPreview ? `${pin.name} Preview` : pin.name;

    heading.append(title);

    const rows = document.createElement("dl");
    rows.className = "inspector-rows";
    [
      ["Status", pin.status],
      ["Cycle", formatCycle(pin.cycleMinutes)],
      ["Name (Type Name)", pin.typeName],
      ["Schematic", pin.schematicName],
      [
        "Storage Fill",
        pin.storageCapacity
          ? `${Math.round((pin.storageFillRatio ?? 0) * 100)}% (${formatVolume(pin.storageUsedVolume)} / ${formatVolume(pin.storageCapacity)})`
          : null,
      ],
    ].forEach(([label, value]) => {
      if (hasValue(value)) {
        rows.append(InspectorRow(label, value));
      }
    });

    content.append(heading);
    if (rows.children.length) {
      content.append(rows);
    }

    [RecipeList(pin), MaterialList(pin.materialItems)].filter(Boolean).forEach((section) => content.append(section));
  }

  const inspector = document.createElement("aside");
  inspector.className = "inspector";
  inspector.append(Panel({ title: "Pin Inspector", children: [content] }));
  return inspector;
}
