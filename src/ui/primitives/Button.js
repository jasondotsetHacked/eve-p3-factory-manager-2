export function Button({ label, variant = "default", onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant === "primary" ? "button button--primary" : "button";
  button.textContent = label;

  if (onClick) {
    button.addEventListener("click", onClick);
  }

  return button;
}
