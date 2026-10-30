import type { Dataset, Lang } from '../types/data';
import type { Measured } from './measure';

const COLUMNS = [
  'year', 'indicator', 'status', 'publisher', 'scope', 'method', 'value', 'unit', 'price_reference', 'cpi_factor', 'is_estimate',
  'nominal_value', 'original_reported_value', 'original_unit', 'revision', 'period', 'institution', 'source_id', 'source_title',
  'source_url', 'locator', 'publication_date', 'date_accessed', 'observation_id', 'note',
] as const;

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Plain, unabbreviated values so the file reimports cleanly, with citations on every row. */
export function toCsv(rows: Measured[], data: Dataset, lang: Lang): string {
  const lines = [COLUMNS.join(',')];
  for (const m of rows) {
    const o = m.obs;
    const s = data.sources[o.source];
    const adjusted = m.deflation !== undefined;
    const cells: Record<(typeof COLUMNS)[number], string> = {
      year: String(o.year),
      indicator: o.indicator,
      status: o.status,
      publisher: o.publisher ?? '',
      scope: o.scope,
      method: o.method,
      value: m.unit === 'HUF' ? String(Math.round(m.value)) : String(m.value),
      unit: m.unit,
      price_reference: adjusted ? String(m.deflation!.reference) : 'nominal',
      cpi_factor: adjusted ? m.deflation!.factor.toFixed(6) : '',
      is_estimate: m.estimated ? 'true' : 'false',
      nominal_value: String(o.value),
      original_reported_value: o.original.value,
      original_unit: o.original.unit,
      revision: o.revision,
      period: o.period ?? '',
      institution: o.institution,
      source_id: o.source,
      source_title: s?.title ?? '',
      source_url: s?.url ?? '',
      locator: o.locator,
      publication_date: s?.publicationDate ?? s?.adoptedDate ?? '',
      date_accessed: s?.accessed ?? '',
      observation_id: o.id,
      note: o.note?.[lang] ?? '',
    };
    lines.push(COLUMNS.map((c) => escapeCell(cells[c])).join(','));
  }
  // The BOM makes Excel read Hungarian accents correctly.
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
