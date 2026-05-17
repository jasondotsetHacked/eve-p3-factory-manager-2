export function formatInteger(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPinType(type) {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatCycle(minutes) {
  if (!minutes) {
    return "N/A";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
