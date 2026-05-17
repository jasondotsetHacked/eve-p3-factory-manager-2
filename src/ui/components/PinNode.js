import { createSvgElement } from "../../utils/dom.js";
import { formatPinType } from "../../utils/format.js";

const PIN_COLORS = {
  "extractor-control-unit": "var(--color-extractor)",
  "basic-industry-facility": "var(--color-factory)",
  "advanced-industry-facility": "var(--color-warning)",
  "storage-facility": "var(--color-storage)",
  launchpad: "var(--color-launchpad)",
};

export function PinNode({ pin, isSelected, onHover, onMove, onLeave, onSelect }) {
  const node = createSvgElement("g", {
    class: isSelected ? "pin-node is-selected" : "pin-node",
    tabindex: "0",
    role: "button",
    "aria-label": `${pin.name}, ${formatPinType(pin.type)}`,
    transform: `translate(${pin.x} ${pin.y})`,
  });

  const radius = pin.type === "launchpad" ? 25 : 20;
  const circle = createSvgElement("circle", {
    r: radius,
    fill: PIN_COLORS[pin.type] || "var(--color-accent)",
  });

  const label = createSvgElement("text", {
    y: radius + 17,
    "text-anchor": "middle",
  });
  label.textContent = pin.name;

  node.append(circle, label);

  node.addEventListener("pointerenter", (event) => onHover(pin, event));
  node.addEventListener("pointermove", (event) => onMove(event));
  node.addEventListener("pointerleave", onLeave);
  node.addEventListener("click", () => onSelect(pin.id));
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(pin.id);
    }
  });

  return node;
}
