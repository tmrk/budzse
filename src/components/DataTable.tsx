import { useMemo, useState } from 'react';
import { indicatorName, methodName, scopeName } from '../i18n';
import { YEARS } from '../charts/geometry';
import { downloadText, toCsv } from '../lib/csv';
import { tableRows, type TableFilter } from '../lib/measure';
import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import { formatExactHuf } from '../lib/format';
import type { Indicator, Status } from '../types/data';
import { useApp } from './context';
import { figure, statusLabel } from './figures';

const INDICATORS: Indicator[] = ['revenue', 'expenditure', 'deficit', 'gdp', 'oda', 'odaGe', 'odaBilateral', 'odaMultilateral', 'odaPctGni', 'gni', 'realGdpGrowth', 'cpi', 'revenuePctGdp', 'expenditurePctGdp', 'deficitPctGdp'];
const STATUSES: Status[] = ['actual', 'original', 'revised', 'planned', 'draft', 'ytd', 'forecast'];

export default function DataTable() {
  const { data, view, lang, m, inspect } = useApp();
  const [filter, setFilter] = useState<TableFilter>({ indicator: 'all', status: 'all', from: FIRST_YEAR, to: LAST_YEAR });
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => tableRows(data, view, filter), [data, view, filter]);
  const dataUrl = `${import.meta.env.BASE_URL}data/budzse.json`;

  const exportCsv = () => {
    const suffix = view.real ? `real-${view.ref}` : 'nominal';
    downloadText(`budzse-${view.scope}-${filter.from}-${filter.to}-${suffix}.csv`, toCsv(rows, data, lang), 'text/csv;charset=utf-8');
  };

  return (
    <details className="fold" id="data-table" data-testid="table-section" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{m.table.title}</summary>
      <p className="lede">{m.table.intro}</p>
      <div className="table-tools">
        <label className="field">
          <span>{m.table.indicator}</span>
          <select value={filter.indicator} onChange={(e) => setFilter({ ...filter, indicator: e.target.value as TableFilter['indicator'] })} data-testid="table-indicator">
            <option value="all">{m.table.all}</option>
            {INDICATORS.map((i) => (
              <option key={i} value={i}>{indicatorName(m, i)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{m.table.status}</span>
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value as TableFilter['status'] })} data-testid="table-status">
            <option value="all">{m.table.all}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{m.statuses[s]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{m.table.from}</span>
          <select value={filter.from} onChange={(e) => setFilter({ ...filter, from: Math.min(Number(e.target.value), filter.to) })} data-testid="from">
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{m.table.to}</span>
          <select value={filter.to} onChange={(e) => setFilter({ ...filter, to: Math.max(Number(e.target.value), filter.from) })} data-testid="to">
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <span className="table-count" data-testid="table-count">{m.table.count(rows.length)}</span>
        <button type="button" className="button" onClick={exportCsv} data-testid="csv">{m.table.csv}</button>
        <a className="button ghost" href={dataUrl} download="budzse.json">{m.table.json}</a>
      </div>
      {!open ? null : rows.length ? (
        <div className="table-scroll" tabIndex={0} role="region" aria-label={m.table.title}>
          <table>
            <caption className="sr-only">{m.table.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{m.table.year}</th>
                <th scope="col">{m.table.indicator}</th>
                <th scope="col">{m.table.status}</th>
                <th scope="col" className="num">{m.table.value}</th>
                <th scope="col">{m.table.scope}</th>
                <th scope="col">{m.table.method}</th>
                <th scope="col">{m.table.source}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.obs.id}>
                  <th scope="row">{r.obs.year}</th>
                  <td>{indicatorName(m, r.obs.indicator)}</td>
                  <td>{statusLabel(r.obs, m)}</td>
                  <td className="num">
                    {r.unit === 'HUF' ? formatExactHuf(r.value, lang) : figure(r, lang)}
                    {r.estimated && <em className="estimate">{m.table.estimated}</em>}
                  </td>
                  <td>{scopeName(m, r.obs.scope)}</td>
                  <td>{methodName(m, r.obs.method)}</td>
                  <td>
                    <button type="button" className="source-link" onClick={() => inspect(r.obs, r)}>{data.sources[r.obs.source].institution[lang]}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-data">{m.table.empty}</p>
      )}
    </details>
  );
}
