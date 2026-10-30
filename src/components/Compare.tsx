import { useState } from 'react';
import { indicatorName } from '../i18n';
import { formatSignedHuf, formatSignedPct } from '../lib/format';
import { bestObservation, compareMeasured, measure, observationsFor } from '../lib/measure';
import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import type { Indicator, Observation, Status } from '../types/data';
import { useApp } from './context';
import { figure, statusLabel } from './figures';

const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
const INDICATORS: Indicator[] = ['revenue', 'expenditure', 'deficit', 'gdp', 'oda', 'odaGe'];

function Side({ title, year, setYear, status, setStatus, options, testId }: { title: string; year: number; setYear: (y: number) => void; status: Status | 'best'; setStatus: (s: Status | 'best') => void; options: Observation[]; testId: string }) {
  const { m } = useApp();
  return (
    <div className="compare-side">
      <label className="field">
        <span>{title}</span>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} data-testid={`${testId}-year`}>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{m.compare.status}</span>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status | 'best')} data-testid={`${testId}-status`}>
          {options.map((o) => (
            <option key={o.id} value={o.status}>{statusLabel(o, m)}</option>
          ))}
          {!options.length && <option value="best">{m.compare.unavailable}</option>}
        </select>
      </label>
    </div>
  );
}

export default function Compare() {
  const { data, view, setView, lang, m, inspect } = useApp();
  const { indicator, a: ya, b: yb } = view.compare;
  const [statusA, setStatusA] = useState<Status | 'best'>('best');
  const [statusB, setStatusB] = useState<Status | 'best'>('best');
  const optsA = observationsFor(data, ya, view.scope, indicator);
  const optsB = observationsFor(data, yb, view.scope, indicator);
  const pick = (opts: Observation[], s: Status | 'best', year: number) =>
    opts.find((o) => o.status === s) ?? bestObservation(data, indicator, year, view.scope);
  const obsA = pick(optsA, statusA, ya);
  const obsB = pick(optsB, statusB, yb);
  const mode = { real: view.real, ref: view.ref, relative: false };
  const mA = obsA ? measure(data, obsA, mode) : null;
  const mB = obsB ? measure(data, obsB, mode) : null;
  const cmp = mA && mB ? compareMeasured(mA, mB) : null;
  const setCompare = (patch: Partial<typeof view.compare>) => setView({ compare: { ...view.compare, ...patch } });

  return (
    <section className="compare" aria-labelledby="compare-title" data-testid="compare">
      <h2 id="compare-title">{m.compare.title}</h2>
      <div className="compare-form">
        <label className="field">
          <span>{m.compare.indicator}</span>
          <select value={indicator} onChange={(e) => setCompare({ indicator: e.target.value as Indicator })} data-testid="compare-indicator">
            {INDICATORS.map((i) => (
              <option key={i} value={i}>{indicatorName(m, i)}</option>
            ))}
          </select>
        </label>
        <Side title={m.compare.first} year={ya} setYear={(a) => { setStatusA('best'); setCompare({ a }); }} status={obsA?.status ?? 'best'} setStatus={setStatusA} options={optsA} testId="compare-a" />
        <Side title={m.compare.second} year={yb} setYear={(b) => { setStatusB('best'); setCompare({ b }); }} status={obsB?.status ?? 'best'} setStatus={setStatusB} options={optsB} testId="compare-b" />
      </div>
      <div className="compare-result" data-testid="compare-result">
        <div className="compare-values">
          {[{ y: ya, ms: mA, o: obsA }, { y: yb, ms: mB, o: obsB }].map(({ y, ms, o }) => (
            <div key={y === ya ? 'a' : 'b'}>
              <span className="compare-year">{y}</span>
              {ms && o ? (
                <>
                  <strong>{figure(ms, lang, view.exact)}</strong>
                  {ms.estimated && <em className="estimate"> {m.chart.estimated}</em>}
                  <button type="button" className="source-link" onClick={() => inspect(o, ms)}>{m.year.source}</button>
                </>
              ) : (
                <span className="no-data">{m.compare.unavailable}</span>
              )}
            </div>
          ))}
        </div>
        {cmp?.compatibility === 'ok' && cmp.absolute !== null && (
          <dl className="compare-diff">
            <div>
              <dt>{m.compare.absolute}</dt>
              <dd>{formatSignedHuf(cmp.absolute, lang)}</dd>
            </div>
            {cmp.percent !== null && (
              <div>
                <dt>{m.compare.percent}</dt>
                <dd>{formatSignedPct(cmp.percent, lang)}</dd>
              </div>
            )}
          </dl>
        )}
        {cmp && cmp.compatibility !== 'ok' && (
          <p className="notice" data-testid="compare-warning">
            {cmp.compatibility === 'scope' ? m.compare.scope : cmp.compatibility === 'method' ? m.compare.method : m.compare.indicatorMismatch}
          </p>
        )}
        {cmp && <p className="fine">{view.real ? m.compare.realNote : m.compare.nominalNote}</p>}
      </div>
    </section>
  );
}
