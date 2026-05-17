export function Card({ className = "", children = [] } = {}) {
  const card = document.createElement("section");
  card.className = ["card", className].filter(Boolean).join(" ");
  children.forEach((child) => card.append(child));
  return card;
}
