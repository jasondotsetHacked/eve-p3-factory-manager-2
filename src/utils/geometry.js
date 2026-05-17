export function linkPath(source, target) {
  const midX = (source.x + target.x) / 2;
  return `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
}

export function getPinById(colony, pinId) {
  return colony.pins.find((pin) => pin.id === pinId);
}

export function getSvgPoint(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}
