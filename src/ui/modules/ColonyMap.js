import { createSvgElement } from "../../utils/dom.js";
import { getPinById, getSvgPoint, linkPath } from "../../utils/geometry.js";
import { formatPinType } from "../../utils/format.js";
import { Tooltip } from "../primitives/Tooltip.js";
import { PinNode } from "../components/PinNode.js";

const SVG_WIDTH = 820;
const SVG_HEIGHT = 520;
const NODE_PADDING = 42;

function createLiveSimulation({ colony, svg, pinElements, linkElements }) {
  const nodes = new Map(
    colony.pins.map((pin) => [
      pin.id,
      {
        ...pin,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      },
    ]),
  );
  const links = colony.links
    .map((link) => ({
      ...link,
      source: nodes.get(link.sourcePinId),
      target: nodes.get(link.targetPinId),
    }))
    .filter((link) => link.source && link.target);
  const physicsLinks = links.filter((link) => link.source.type !== "command-center" && link.target.type !== "command-center");
  const nodeList = [...nodes.values()];
  const simulatedNodes = nodeList.filter((node) => node.type !== "command-center");
  let animationFrame = null;
  let running = true;
  let heat = 0.75;

  function warm(amount = 0.65) {
    heat = Math.max(heat, amount);
  }

  function step() {
    heat = Math.max(0.08, heat * 0.992);

    for (const node of simulatedNodes) {
      if (node.fx !== null && node.fy !== null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      node.vx += (node.anchorX - node.x) * 0.006 * heat;
      node.vy += (node.anchorY - node.y) * 0.006 * heat;
    }

    for (const link of physicsLinks) {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const distance = Math.hypot(dx, dy) || 1;
      const anchorDistance = Math.hypot(link.target.anchorX - link.source.anchorX, link.target.anchorY - link.source.anchorY);
      const desired = Math.max(44, Math.min(240, anchorDistance));
      const strength = (distance - desired) * 0.009 * heat;
      const offsetX = (dx / distance) * strength;
      const offsetY = (dy / distance) * strength;

      if (link.source.fx === null) {
        link.source.vx += offsetX;
        link.source.vy += offsetY;
      }
      if (link.target.fx === null) {
        link.target.vx -= offsetX;
        link.target.vy -= offsetY;
      }
    }

    for (let leftIndex = 0; leftIndex < simulatedNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < simulatedNodes.length; rightIndex += 1) {
        const left = simulatedNodes[leftIndex];
        const right = simulatedNodes[rightIndex];
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        let distance = Math.hypot(dx, dy);

        if (!distance) {
          dx = 1;
          dy = 0;
          distance = 1;
        }

        const minimumDistance = 36;
        const repelDistance = 82;
        if (distance < repelDistance) {
          const force = ((repelDistance - distance) / repelDistance) * 0.48 * heat + Math.max(0, minimumDistance - distance) * 0.08;
          const offsetX = (dx / distance) * force;
          const offsetY = (dy / distance) * force;

          if (left.fx === null) {
            left.vx -= offsetX;
            left.vy -= offsetY;
          }
          if (right.fx === null) {
            right.vx += offsetX;
            right.vy += offsetY;
          }
        }
      }
    }

    for (const node of simulatedNodes) {
      if (node.fx === null) {
        node.vx *= 0.84;
        node.vy *= 0.84;
        node.x = Math.max(NODE_PADDING, Math.min(SVG_WIDTH - NODE_PADDING, node.x + node.vx));
        node.y = Math.max(NODE_PADDING, Math.min(SVG_HEIGHT - NODE_PADDING, node.y + node.vy));
      }
    }

    render();
    if (running) {
      animationFrame = requestAnimationFrame(step);
    }
  }

  function render() {
    for (const node of nodeList) {
      pinElements.get(node.id)?.setAttribute("transform", `translate(${node.x} ${node.y})`);
    }

    for (const link of links) {
      linkElements.get(link.id)?.setAttribute("d", linkPath(link.source, link.target));
    }
  }

  function dragNode(pinId, event, element) {
    const node = nodes.get(pinId);
    if (!node || node.type === "command-center") {
      return { moved: false };
    }

    let moved = false;
    const start = getSvgPoint(svg, event.clientX, event.clientY);
    const offsetX = node.x - start.x;
    const offsetY = node.y - start.y;

    node.fx = node.x;
    node.fy = node.y;
    element.setPointerCapture(event.pointerId);
    warm(1);

    function move(moveEvent) {
      const point = getSvgPoint(svg, moveEvent.clientX, moveEvent.clientY);
      node.fx = Math.max(NODE_PADDING, Math.min(SVG_WIDTH - NODE_PADDING, point.x + offsetX));
      node.fy = Math.max(NODE_PADDING, Math.min(SVG_HEIGHT - NODE_PADDING, point.y + offsetY));
      node.anchorX = node.fx;
      node.anchorY = node.fy;
      moved = true;
      warm(1);
    }

    function end(endEvent) {
      element.releasePointerCapture(endEvent.pointerId);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", end);
      element.removeEventListener("pointercancel", end);
      node.fx = null;
      node.fy = null;
      warm(0.9);
    }

    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    return { get moved() { return moved; } };
  }

  animationFrame = requestAnimationFrame(step);

  return {
    dragNode,
    stop() {
      running = false;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    },
  };
}

export function ColonyMap({ colony, selectedPinId, onSelectPin, onPreviewPin, onClearPin }) {
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
  badge.textContent = "Live ESI force graph";

  header.append(titleBlock, badge);

  const stage = document.createElement("div");
  stage.className = "map-stage";

  const svg = createSvgElement("svg", {
    class: "colony-svg",
    viewBox: "0 0 820 520",
    role: "img",
    "aria-label": `Live colony graph for ${colony.planetName}`,
  });

  const grid = createSvgElement("g", { class: "map-grid" });
  for (let x = 80; x <= 760; x += 80) {
    grid.append(createSvgElement("line", { x1: x, y1: 48, x2: x, y2: 472 }));
  }
  for (let y = 72; y <= 448; y += 64) {
    grid.append(createSvgElement("line", { x1: 52, y1: y, x2: 768, y2: y }));
  }

  const links = createSvgElement("g", { class: "map-links" });
  const linkElements = new Map();
  colony.links.forEach((link) => {
    const source = getPinById(colony, link.sourcePinId);
    const target = getPinById(colony, link.targetPinId);
    if (!source || !target) {
      return;
    }

    const path = createSvgElement("path", {
      class: "map-link",
      d: linkPath(source, target),
      "data-bandwidth": link.bandwidth,
    });
    linkElements.set(link.id, path);
    links.append(path);
  });

  const pins = createSvgElement("g", { class: "map-pins" });
  const tooltip = Tooltip();
  const pinElements = new Map();
  let simulation = null;
  let suppressClick = false;
  let currentSelectedPinId = selectedPinId;

  function updateSelectedPin(pinId) {
    currentSelectedPinId = pinId;
    pinElements.forEach((element, elementPinId) => {
      element.classList.toggle("is-selected", elementPinId === currentSelectedPinId);
    });
  }

  svg.addEventListener("click", (event) => {
    if (event.target === svg || event.target.closest?.(".map-grid")) {
      updateSelectedPin(null);
      onClearPin();
    }
  });

  colony.pins.forEach((pin) => {
    const node = PinNode({
      pin,
      isSelected: pin.id === selectedPinId,
      onHover: (hoveredPin, event) => {
        tooltip.show(`${hoveredPin.displayLabel}: ${hoveredPin.name} - ${formatPinType(hoveredPin.type)}`, event.clientX, event.clientY);
        if (!currentSelectedPinId) {
          onPreviewPin(hoveredPin.id);
        }
      },
      onMove: (event) => tooltip.move(event.clientX, event.clientY),
      onLeave: () => {
        tooltip.hide();
        if (!currentSelectedPinId) {
          onPreviewPin(null);
        }
      },
      onSelect: (pinId) => {
        if (!suppressClick) {
          updateSelectedPin(pinId);
          onSelectPin(pinId);
        }
      },
      onPointerDown: (draggedPin, event, element) => {
        if (!simulation) {
          return;
        }

        const drag = simulation.dragNode(draggedPin.id, event, element);
        element.addEventListener(
          "pointerup",
          () => {
            if (drag.moved) {
              suppressClick = true;
              window.setTimeout(() => {
                suppressClick = false;
              }, 0);
            }
          },
          { once: true },
        );
      },
    });
    pinElements.set(pin.id, node);
    pins.append(node);
  });

  svg.append(grid, links, pins);
  simulation = createLiveSimulation({ colony, svg, pinElements, linkElements });
  wrap.cleanup = () => simulation.stop();
  stage.append(svg, tooltip.element);
  wrap.append(header, stage);

  return wrap;
}
