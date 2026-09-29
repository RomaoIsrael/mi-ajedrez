import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MESSAGES, setLocale, t } from '../dist/i18n.js';

test('i18n: todos los idiomas tienen las mismas claves y ningún texto vacío', () => {
  const es = Object.keys(MESSAGES.es).sort();
  for (const [locale, dict] of Object.entries(MESSAGES)) {
    assert.deepEqual(Object.keys(dict).sort(), es, `claves de ${locale}`);
    for (const [k, v] of Object.entries(dict)) assert.ok(v.trim(), `${locale}.${k} vacío`);
    // Los marcadores {x} deben coincidir entre idiomas.
    for (const k of es) assert.deepEqual((dict[k].match(/\{\w+\}/g) ?? []).sort(), (MESSAGES.es[k].match(/\{\w+\}/g) ?? []).sort(), `${locale}.${k}: marcadores`);
  }
});

test('i18n: interpolación y cambio de idioma', () => {
  setLocale('en');
  assert.equal(t('home.level', { level: 'Club', rating: 1300 }), 'Level: Club · Rating 1300');
  setLocale('es');
  assert.equal(t('home.ofTotal', { a: 2, b: 9 }), '2 de 9');
});
