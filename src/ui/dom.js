/* Tiny DOM helpers — enough to keep the UI modules readable. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const on = (el, type, fn, opts) => {
  el?.addEventListener(type, fn, opts);
  return () => el?.removeEventListener(type, fn, opts);
};

const SVG_TAGS = new Set(['svg', 'path', 'use', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'symbol', 'text', 'mask']);

export const el = (tag, props = {}, ...children) => {
  const isSvg = SVG_TAGS.has(tag.toLowerCase());
  const node = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);

  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') {
      if (isSvg) node.setAttribute('class', v);
      else node.className = v;
    } else if (k === 'html') {
      node.innerHTML = v;
    } else if (k === 'textContent' || k === 'text') {
      node.textContent = v;
    } else if (k === 'value') {
      node.value = v;
      node.setAttribute('value', v);
    } else if (k === 'checked') {
      node.checked = Boolean(v);
      if (v) node.setAttribute('checked', '');
      else node.removeAttribute('checked');
    } else if (k === 'disabled') {
      node.disabled = Boolean(v);
      if (v) node.setAttribute('disabled', '');
      else node.removeAttribute('disabled');
    } else if (k.startsWith('on')) {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== undefined && v !== null) {
      if (k === 'href' && isSvg) {
        node.setAttributeNS('http://www.w3.org/1999/xlink', 'href', v);
        node.setAttribute('href', v);
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
};

/** Keeps the range track's filled portion in sync with the value. */
export const paintRange = (input) => {
  const min = Number(input.min || 0), max = Number(input.max || 100);
  const pct = ((Number(input.value) - min) / (max - min || 1)) * 100;
  input.style.setProperty('--fill', `${pct}%`);
};

export function toast(message, ms = 2600) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('is-on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => node.classList.remove('is-on'), ms);
}
