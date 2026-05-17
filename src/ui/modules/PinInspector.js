import { Panel } from "../primitives/Panel.js";
import { InspectorRow } from "../components/InspectorRow.js";
import { formatCycle, formatInteger, formatPinType } from "../../utils/format.js";

export function PinInspector({ pin }) {
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
    title.textContent = pin.name;

    const type = document.createElement("p");
    type.className = "meta";
    type.textContent = formatPinType(pin.type);

    heading.append(title, type);

    const rows = document.createElement("dl");
    rows.className = "inspector-rows";
    rows.append(
      InspectorRow("Status", pin.status),
      InspectorRow("Product", pin.product),
      InspectorRow("Cycle", formatCycle(pin.cycleMinutes)),
      InspectorRow("Type ID", formatInteger(pin.typeId)),
      InspectorRow("Notes", pin.details),
    );

    content.append(heading, rows);
  }

  const inspector = document.createElement("aside");
  inspector.className = "inspector";
  inspector.append(Panel({ title: "Pin Inspector", children: [content] }));
  return inspector;
}
