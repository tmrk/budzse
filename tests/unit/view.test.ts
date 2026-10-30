import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../../src/i18n';
import { activePreset, DEFAULT_VIEW, langFromPath, parseQuery, pathForLang, PRESETS, resolveLang, toQuery } from '../../src/lib/view';
import { toCsv } from '../../src/lib/csv';
import { measure } from '../../src/lib/measure';
import { dataset, obs } from './helpers';

describe('URL state', () => {
  it('writes nothing for the default view', () => {
    expect(toQuery(DEFAULT_VIEW)).toBe('');
  });

  it('round-trips a full configuration', () => {
    const v = { ...DEFAULT_VIEW, scope: 'general' as const, metrics: ['gdp', 'oda'] as const as never, view: 'both' as const, real: true, ref: 'latest' as const, from: 2005, to: 2020, year: 2012, relative: true, exact: true, revised: true, forecasts: false, compare: { indicator: 'oda' as const, a: 2015, b: 2024 } };
    expect(parseQuery(toQuery(v))).toEqual(v);
  });

  it('ignores malformed values', () => {
    const v = parseQuery('?y=abc&from=1500&to=3000&m=nope&v=weird&s=x&ci=foo');
    expect(v.year).toBe(DEFAULT_VIEW.year);
    expect(v.from).toBe(2000);
    expect(v.to).toBe(2027);
    expect(v.metrics).toEqual(DEFAULT_VIEW.metrics);
    expect(v.view).toBe(DEFAULT_VIEW.view);
    expect(v.scope).toBe('central');
    expect(v.compare.indicator).toBe('revenue');
  });

  it('swaps a reversed range', () => {
    const v = parseQuery('?from=2020&to=2010');
    expect([v.from, v.to]).toEqual([2010, 2020]);
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

describe('presets', () => {
  it('recognises each preset', () => {
    for (const k of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
      expect(activePreset({ ...DEFAULT_VIEW, ...PRESETS[k] })).toBe(k);
    }
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
