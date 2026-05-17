export function Panel({ title, className = "", children = [] }) {
  const panel = document.createElement("section");
  panel.className = ["panel", className].filter(Boolean).join(" ");

  if (title) {
    const header = document.createElement("div");
    header.className = "panel__header";

    const heading = document.createElement("h2");
    heading.className = "panel__title";
    heading.textContent = title;

    header.append(heading);
    panel.append(header);
  }

  children.forEach((child) => panel.append(child));
  return panel;
}
