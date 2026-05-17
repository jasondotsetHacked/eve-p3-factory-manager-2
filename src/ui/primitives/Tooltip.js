export function Tooltip() {
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.hidden = true;

  return {
    element: tooltip,
    show(content, x, y) {
      tooltip.textContent = content;
      tooltip.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
      tooltip.hidden = false;
    },
    move(x, y) {
      tooltip.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
    },
    hide() {
      tooltip.hidden = true;
    },
  };
}
