import { createSvgElement } from "../../utils/dom.js";
import { getPinById, linkPath } from "../../utils/geometry.js";
import { formatPinType } from "../../utils/format.js";
import { Tooltip } from "../primitives/Tooltip.js";
import { PinNode } from "../components/PinNode.js";

export function ColonyMap({ colony, selectedPinId, onSelectPin }) {
  const wrap = document.createElement("section");
  wrap.className = "map-module card";

  const header = document.createElement("div");
  header.className = "map-module__header";

  const titleBlock = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = colony.planetName;
  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `${colony.planetType} planet in ${colony.solarSystemName}`;
  titleBlock.append(title, meta);

  const badge = document.createElement("span");
  badge.className = "map-module__badge";
  badge.textContent = "Mock ESI layout";

  header.append(titleBlock, badge);

  const stage = document.createElement("div");
  stage.className = "map-stage";

  const svg = createSvgElement("svg", {
    class: "colony-svg",
    viewBox: "0 0 820 520",
    role: "img",
    "aria-label": `Mock colony layout for ${colony.planetName}`,
  });

  const grid = createSvgElement("g", { class: "map-grid" });
  for (let x = 80; x <= 760; x += 80) {
    grid.append(createSvgElement("line", { x1: x, y1: 48, x2: x, y2: 472 }));
  }
  for (let y = 72; y <= 448; y += 64) {
    grid.append(createSvgElement("line", { x1: 52, y1: y, x2: 768, y2: y }));
  }

  const links = createSvgElement("g", { class: "map-links" });
  colony.links.forEach((link) => {
    const source = getPinById(colony, link.sourcePinId);
    const target = getPinById(colony, link.targetPinId);
    if (!source || !target) {
      return;
    }

    links.append(
      createSvgElement("path", {
        class: "map-link",
        d: linkPath(source, target),
        "data-bandwidth": link.bandwidth,
      }),
    );
  });

  const pins = createSvgElement("g", { class: "map-pins" });
  const tooltip = Tooltip();

  colony.pins.forEach((pin) => {
    pins.append(
      PinNode({
        pin,
        isSelected: pin.id === selectedPinId,
        onHover: (hoveredPin, event) => {
          tooltip.show(`${hoveredPin.name} - ${formatPinType(hoveredPin.type)}`, event.clientX, event.clientY);
        },
        onMove: (event) => tooltip.move(event.clientX, event.clientY),
        onLeave: tooltip.hide,
        onSelect: onSelectPin,
      }),
    );
  });

  svg.append(grid, links, pins);
  stage.append(svg, tooltip.element);
  wrap.append(header, stage);

  return wrap;
}
