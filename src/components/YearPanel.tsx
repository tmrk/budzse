import { indicatorName } from '../i18n';
import { deflator } from '../lib/cpi';
import { formatPct, formatSignedHuf, formatSignedPct } from '../lib/format';
import { gdpDenominator, gniDenominator, measure, observationsFor, planVersusActual } from '../lib/measure';
import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import type { Indicator, Observation } from '../types/data';
import { useApp } from './context';
import { figure, gapFor, nominal, statusLabel } from './figures';

function ValueRow({ obs }: { obs: Observation }) {
  const { data, view, lang, m, inspect } = useApp();
  const measured = measure(data, obs, { real: view.real && obs.unit === 'HUF', ref: view.ref, relative: false }) ?? { obs, value: obs.value, unit: obs.unit, estimated: false };
  const gdp = obs.unit === 'HUF' && ['revenue', 'expenditure', 'deficit', 'oda', 'odaGe'].includes(obs.indicator) ? gdpDenominator(data, obs) : undefined;
  const share = gdp && obs.status !== 'ytd' ? (obs.value / gdp.value) * 100 : null;
  return (
    <li className="value-row">
      <span className="value-status">{statusLabel(obs, m)}</span>
      <span className="value-num">
        {figure(measured, lang, view.exact)}
        {measured.estimated && <em className="estimate"> {m.chart.estimated}</em>}
      </span>
      <button type="button" className="source-link" onClick={() => inspect(obs, measured)} aria-label={m.year.sourceFor(`${indicatorName(m, obs.indicator)}, ${obs.year}`)} data-testid={`source-${obs.id}`}>
        {m.year.source}
      </button>
      {(measured.deflation || share !== null || obs.status === 'ytd' || obs.secondary) && (
        <span className="value-extra">
          {measured.deflation && <span>{nominal(obs, lang, view.exact)} ({m.year.nominalLabel})</span>}
          {share !== null && <span>{m.year.oftGdp(formatPct(share, lang, obs.indicator.startsWith('oda') ? 2 : 1))}</span>}
          {obs.status === 'ytd' && <span>{m.year.partYear}</span>}
        </span>
      )}
    </li>
  );
}

function IndicatorBlock({ indicator }: { indicator: Indicator }) {
  const { data, view, m, lang } = useApp();
  const rows = observationsFor(data, view.year, view.scope, indicator);
  const original = rows.find((o) => o.status === 'original' || o.status === 'planned');
  const actual = rows.find((o) => o.status === 'actual');
  const diff = planVersusActual(original, actual);
  const gap = rows.length ? null : gapFor(data, indicator, view.year);
  // The percentage is the same at any price level; the forint difference follows the chosen one.
  const factor = view.real ? (deflator(data.cpi, view.year, view.ref)?.factor ?? 1) : 1;
  return (
    <div className="indicator-block">
      <h4>{indicatorName(m, indicator)}</h4>
      {rows.length ? (
        <ul>
          {rows.map((o) => (
            <ValueRow key={o.id} obs={o} />
          ))}
        </ul>
      ) : (
        <p className="no-data">
          {m.year.noData}
          {gap && <span className="no-data-reason">{gap.reason[lang]}</span>}
        </p>
      )}
      {diff && (
        <p className="diff">
          {m.year.difference}: <strong>{formatSignedHuf(diff.absolute * factor, lang)}</strong> ({formatSignedPct(diff.percent, lang)})
        </p>
      )}
    </div>
  );
}

export default function YearPanel() {
  const { view, setView, m, data, lang, inspect } = useApp();
  const y = view.year;
  const gni = gniDenominator(data, y);
  const odaNet = observationsFor(data, y, view.scope, 'oda')[0];
  const odaGni = odaNet && gni ? (odaNet.value / gni.value) * 100 : null;
  const rank = (g: 'fiscal' | 'economy' | 'aid') =>
    view.metrics.some((k) => (g === 'fiscal' ? k === 'revenue' || k === 'expenditure' || k === 'deficit' : g === 'economy' ? k === 'gdp' : k === 'oda')) ? 0 : 1;
  // What the chart is showing comes first; a stable sort keeps the usual order otherwise.
  const order = (['fiscal', 'economy', 'aid'] as const).slice().sort((a, b) => rank(a) - rank(b));
  return (
    <section className="year-panel" aria-labelledby="year-title" data-testid="year-panel">
      <header className="year-head">
        <button type="button" className="year-step" onClick={() => setView({ year: Math.max(FIRST_YEAR, y - 1) })} disabled={y <= FIRST_YEAR} aria-label={m.year.prev}>‹</button>
        <h3 id="year-title">
          <label>
            <span className="sr-only">{m.year.select}</span>
            <select value={y} onChange={(e) => setView({ year: Number(e.target.value) })} data-testid="year-select">
              {Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i).map((yy) => (
                <option key={yy} value={yy}>{yy}</option>
              ))}
            </select>
          </label>
        </h3>
        <button type="button" className="year-step" onClick={() => setView({ year: Math.min(LAST_YEAR, y + 1) })} disabled={y >= LAST_YEAR} aria-label={m.year.next}>›</button>
      </header>

      {view.scope === 'central' && y >= 2010 && y <= 2011 && <p className="notice">{m.year.breakNotice}</p>}

      {order.map((group) => (
        <div className="year-group" key={group}>
          {group === 'fiscal' && (
            <>
              <h4 className="year-group-title">{view.scope === 'central' ? (y < 2010 ? m.scopes.centralBudget : m.scopes.centralSubsystem) : m.scopes.generalGovernment}</h4>
              <IndicatorBlock indicator="revenue" />
              <IndicatorBlock indicator="expenditure" />
              <IndicatorBlock indicator="deficit" />
              <p className="fine">{m.year.deficitNote}</p>
            </>
          )}
          {group === 'economy' && (
            <>
              <h4 className="year-group-title">{m.year.economy}</h4>
              <IndicatorBlock indicator="gdp" />
              <IndicatorBlock indicator="realGdpGrowth" />
              <IndicatorBlock indicator="cpi" />
            </>
          )}
          {group === 'aid' && (
            <>
              <h4 className="year-group-title">{m.year.aid}</h4>
              <IndicatorBlock indicator="oda" />
              <IndicatorBlock indicator="odaGe" />
              <IndicatorBlock indicator="odaPctGni" />
              {odaGni !== null && odaNet && (
                <p className="fine">
                  {indicatorName(m, 'oda')}: {formatPct(odaGni, lang, 2)} {m.year.pctOfGni}{' '}
                  <button type="button" className="source-link inline" onClick={() => gni && inspect(gni)}>GNI: {m.year.source}</button>
                </p>
              )}
              <IndicatorBlock indicator="odaBilateral" />
              <IndicatorBlock indicator="odaMultilateral" />
            </>
          )}
        </div>
      ))}
    </section>
  );
}
