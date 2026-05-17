export function ColonyListItem({ colony, isSelected, onSelect }) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = isSelected ? "colony-list-item is-selected" : "colony-list-item";
  item.setAttribute("aria-pressed", String(isSelected));

  const name = document.createElement("span");
  name.className = "colony-list-item__name";
  name.textContent = colony.planetName;

  const meta = document.createElement("span");
  meta.className = "colony-list-item__meta";
  meta.textContent = `${colony.planetType} - ${colony.summary}`;

  item.append(name, meta);
  item.addEventListener("click", () => onSelect(colony.id));

  return item;
}
