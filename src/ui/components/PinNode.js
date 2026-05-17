import { createSvgElement } from "../../utils/dom.js";
import { formatPinType } from "../../utils/format.js";

const PIN_COLORS = {
  "extractor-control-unit": "var(--color-extractor)",
  "basic-industry-facility": "var(--color-factory)",
  "advanced-industry-facility": "var(--color-warning)",
  "storage-facility": "var(--color-storage)",
  launchpad: "var(--color-launchpad)",
  "command-center": "var(--color-command)",
};

function describePinClass(pin, isSelected) {
  return [
    "pin-node",
    isSelected ? "is-selected" : "",
    pin.isWorking ? "is-running" : "",
    pin.storageFillRatio !== null && pin.storageFillRatio !== undefined ? "has-storage-fill" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function pieSlicePath(radius, ratio) {
  const clamped = Math.max(0, Math.min(ratio ?? 0, 0.9999));
  if (!clamped) {
    return "";
  }

  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + clamped * Math.PI * 2;
  const startX = Math.cos(startAngle) * radius;
  const startY = Math.sin(startAngle) * radius;
  const endX = Math.cos(endAngle) * radius;
  const endY = Math.sin(endAngle) * radius;
  const largeArc = clamped > 0.5 ? 1 : 0;

  return `M 0 0 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

export function PinNode({ pin, isSelected, onHover, onMove, onLeave, onSelect, onPointerDown }) {
  const node = createSvgElement("g", {
    class: describePinClass(pin, isSelected),
    tabindex: "0",
    role: "button",
    "aria-label": `${pin.name}, ${formatPinType(pin.type)}`,
    transform: `translate(${pin.x} ${pin.y})`,
  });

  const radius = pin.type === "launchpad" ? 17 : 14;
  const circle = createSvgElement("circle", {
    class: "pin-node__base",
    r: radius,
    fill: PIN_COLORS[pin.type] || "var(--color-accent)",
  });

  const children = [circle];

  if (pin.storageFillRatio !== null && pin.storageFillRatio !== undefined) {
    const fill = createSvgElement("path", {
      class: "pin-node__fill",
      d: pieSlicePath(radius - 3, pin.storageFillRatio),
    });
    children.push(fill);
  }

  const label = createSvgElement("text", {
    class: "pin-node__label",
    y: radius + 13,
    "text-anchor": "middle",
  });
  label.textContent = pin.name;

  node.append(...children, label);

  node.addEventListener("pointerenter", (event) => onHover(pin, event));
  node.addEventListener("pointermove", (event) => onMove(event));
  node.addEventListener("pointerleave", onLeave);
  node.addEventListener("pointerdown", (event) => onPointerDown?.(pin, event, node));
  node.addEventListener("click", () => onSelect(pin.id));
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(pin.id);
    }
  });

  return node;
}
