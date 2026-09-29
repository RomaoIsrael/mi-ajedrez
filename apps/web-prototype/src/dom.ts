/** Utilidades mínimas de DOM (sin framework). */

type Child = Node | string | number | false | null | undefined;
type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: (Child | Child[])[]): void {
  for (const c of children.flat()) {
    if (c === false || c === null || c === undefined) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.firstChild.remove();
}

/** Pantalla estándar: una decisión principal (CTA) al final. */
export function screen(title: string | null, ...children: (Child | Child[])[]): HTMLElement {
  return h('section', { class: 'screen' }, title ? h('h1', { class: 'screen-title' }, title) : null, ...children);
}

export function primaryButton(label: string, onClick: () => void, extra: Attrs = {}): HTMLButtonElement {
  return h('button', { class: 'btn btn-primary', onclick: onClick as EventListener, ...extra }, label);
}

export function button(label: string, onClick: () => void, extra: Attrs = {}): HTMLButtonElement {
  return h('button', { class: 'btn', onclick: onClick as EventListener, ...extra }, label);
}

export function navigate(hash: string): void {
  location.hash = hash;
}

export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
