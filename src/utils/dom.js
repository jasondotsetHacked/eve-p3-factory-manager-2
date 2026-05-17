export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([name, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(name, value);
      }
    });
  }

  return element;
}

export function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);

  Object.entries(attrs).forEach(([name, value]) => {
    if (value !== null && value !== undefined) {
      element.setAttribute(name, value);
    }
  });

  return element;
}
