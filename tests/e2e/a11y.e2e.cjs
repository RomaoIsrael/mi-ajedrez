/**
 * Auditoría de accesibilidad automática (brief §70, docs/17-calidad.md §3), sin dependencias:
 * en cada pantalla comprueba idioma, un único h1, nombres accesibles de botones y enlaces,
 * etiquetas de campos, texto alternativo, tamaño de los objetivos táctiles, contraste del texto
 * (WCAG AA) en tema claro y oscuro, y que el foco sea visible.
 * Requisitos: `npm start` en otra terminal. Uso: node tests/e2e/a11y.e2e.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/apps/web-prototype/';
const ROUTES = ['', 'learn', 'play', 'puzzles', 'progress', 'dna', 'settings', 'report', 'achievements', 'train', 'train/vision',
  'openings', 'openings/italian', 'library', 'library/opera-1858', 'import', 'plan', 'lesson/board'];

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

/** Se ejecuta en la página: devuelve la lista de problemas encontrados. */
function audit() {
  const problems = [];
  const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim()
    || [...el.querySelectorAll('img')].map((i) => i.alt).join('').trim();
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  if (!document.documentElement.lang) problems.push('<html> sin lang');
  const h1 = [...document.querySelectorAll('main h1')].filter(visible);
  if (h1.length > 1) problems.push(`${h1.length} h1 en la pantalla`);
  for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
    if (!visible(el)) continue;
    if (!name(el)) problems.push(`sin nombre accesible: ${el.outerHTML.slice(0, 80)}`);
    const r = el.getBoundingClientRect();
    const inText = el.tagName === 'A' && el.closest('p, li, span') && !el.classList.contains('card') && !el.classList.contains('chip');
    if (!inText && !el.closest('.board') && !el.classList.contains('link') && (r.height < 24 || r.width < 24)) problems.push(`objetivo táctil pequeño (${Math.round(r.width)}×${Math.round(r.height)}): ${name(el).slice(0, 30)}`);
  }
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (!visible(el) || el.type === 'hidden') continue;
    const labelled = el.getAttribute('aria-label') || el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.getAttribute('aria-labelledby');
    if (!labelled) problems.push(`campo sin etiqueta: ${el.outerHTML.slice(0, 80)}`);
  }
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) problems.push(`imagen sin alt: ${img.src.split('/').slice(-2).join('/')}`);
  for (const svg of document.querySelectorAll('main svg[role="img"]')) if (!svg.getAttribute('aria-label')) problems.push('gráfico sin aria-label');
  // Contraste del texto principal y del secundario contra el fondo de las tarjetas.
  const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const probe = document.createElement('div');
  probe.className = 'card';
  probe.innerHTML = '<p>texto</p><p class="muted">secundario</p>';
  document.querySelector('main')?.append(probe);
  const bg = getComputedStyle(probe).backgroundColor;
  for (const p of probe.querySelectorAll('p')) {
    const r = ratio(getComputedStyle(p).color, bg);
    if (r < 4.5) problems.push(`contraste ${r.toFixed(2)} < 4.5 (${p.className || 'texto'})`);
  }
  probe.remove();
  return problems;
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errors = [];
  for (const scheme of ['light', 'dark']) {
    const p = await browser.newPage({ viewport: { width: 390, height: 900 }, colorScheme: scheme });
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('kavalo.profile.v1', JSON.stringify({ onboarded: true, name: 'Ana', settings: { reduceMotion: true } })));
    const all = [];
    for (const r of ROUTES) {
      await p.goto(`${BASE}#/${r}`);
      await p.reload();
      await p.waitForSelector('main .screen');
      const problems = await p.evaluate(audit);
      all.push(...problems.map((x) => `[${scheme}] #/${r}: ${x}`));
    }
    if (all.length) console.log(all.join('\n'));
    check(all.length === 0, `tema ${scheme === 'light' ? 'claro' : 'oscuro'}: ${ROUTES.length} pantallas sin problemas de accesibilidad`);
    // Foco visible con teclado
    await p.goto(`${BASE}#/`);
    await p.keyboard.press('Tab');
    await p.keyboard.press('Tab');
    const outline = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; });
    check(outline, `tema ${scheme === 'light' ? 'claro' : 'oscuro'}: el foco del teclado es visible`);
    await p.close();
  }
  check(errors.length === 0, `sin errores de JavaScript${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
});
