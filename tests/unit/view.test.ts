import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../../src/i18n';
import { DEFAULT_VIEW, langFromPath, lensOf, lensPatch, parseQuery, pathForLang, resolveLang, toQuery, type ViewState } from '../../src/lib/view';
import { toCsv } from '../../src/lib/csv';
import { measure } from '../../src/lib/measure';
import { dataset, obs } from './helpers';

describe('URL state', () => {
  it('writes nothing for the default view', () => {
    expect(toQuery(DEFAULT_VIEW)).toBe('');
  });

  it('round-trips a full configuration', () => {
    const v: ViewState = { scope: 'central', real: true, ref: 'latest', relative: false, year: 2012, versus: 2015 };
    expect(parseQuery(toQuery(v))).toEqual(v);
    const w: ViewState = { ...DEFAULT_VIEW, relative: true, year: 2000 };
    expect(parseQuery(toQuery(w))).toEqual(w);
  });

  it('ignores malformed values', () => {
    const v = parseQuery('?y=abc&s=x&vs=&ref=');
    expect(v.year).toBe(DEFAULT_VIEW.year);
    expect(v.scope).toBe(DEFAULT_VIEW.scope);
    expect(v.ref).toBe(DEFAULT_VIEW.ref);
  });

  it('clamps years to the range the data covers', () => {
    expect(parseQuery('?y=1500').year).toBe(2000);
    expect(parseQuery('?y=3000').year).toBe(2027);
  });

  it('ignores the parameters of retired controls', () => {
    expect(parseQuery('?m=oda&v=both&from=2010&to=2012&x=1')).toEqual(DEFAULT_VIEW);
  });

  it('cannot end up in two lenses at once', () => {
    const v = parseQuery('?real=1&pct=1');
    expect(lensOf(v)).toBe('share');
    expect(v.real).toBe(false);
  });
});

describe('lens', () => {
  it('maps to the two flags measure() reads', () => {
    for (const l of ['forint', 'real', 'share'] as const) expect(lensOf(lensPatch(l))).toBe(l);
  });
});

describe('language routing', () => {
  it('reads the language from the path', () => {
    expect(langFromPath('/budzse/en/')).toBe('en');
    expect(langFromPath('/budzse/hu')).toBe('hu');
    expect(langFromPath('/budzse/')).toBeNull();
  });

  it('lets an explicit path win over the saved preference', () => {
    expect(resolveLang('/budzse/en/', 'hu')).toBe('en');
    expect(resolveLang('/budzse/hu/', 'en')).toBe('hu');
  });

  it('uses the saved preference at the root, otherwise Hungarian', () => {
    expect(resolveLang('/budzse/', 'en')).toBe('en');
    expect(resolveLang('/budzse/', null)).toBe('hu');
    expect(resolveLang('/budzse/', 'xx')).toBe('hu');
  });

  it('builds paths under the deployment base', () => {
    expect(pathForLang('/budzse/hu/', 'en')).toBe('/budzse/en/');
    expect(pathForLang('/budzse/', 'en')).toBe('/budzse/en/');
    expect(pathForLang('/budzse/en', 'hu')).toBe('/budzse/hu/');
  });
});

describe('dictionaries', () => {
  const keys = (o: object, prefix = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

  it('have the same keys in both languages', () => {
    expect(keys(MESSAGES.en).sort()).toEqual(keys(MESSAGES.hu).sort());
  });

  it('have the same methodology structure', () => {
    expect(MESSAGES.en.methodology.sections.map((s) => [s.id, s.body.length])).toEqual(MESSAGES.hu.methodology.sections.map((s) => [s.id, s.body.length]));
  });

  it('use the right scale words', () => {
    expect(MESSAGES.hu.indicators.revenue).toBe('Bevétel');
    expect(MESSAGES.en.indicators.revenue).toBe('Revenue');
  });
});

describe('csv', () => {
  const row = measure(dataset, obs('central.deficit.2020.actual'), { real: false, ref: 2025, relative: false })!;
  const text = toCsv([row], dataset, 'hu');
  const lines = text.replace('﻿', '').trim().split('\r\n');

  it('starts with a BOM and a header', () => {
    expect(text.startsWith('﻿')).toBe(true);
    expect(lines[0]).toContain('source_url');
    expect(lines[0]).toContain('observation_id');
  });

  it('carries the unabbreviated value and the citation', () => {
    expect(lines[1]).toContain('5311318000000');
    expect(lines[1]).toContain('act-a2100116');
    expect(lines[1]).toContain('https://mkogy.jogtar.hu');
  });

  it('quotes cells with commas', () => {
    expect(lines[1]).toContain('"5 311 318,0"');
  });
});
