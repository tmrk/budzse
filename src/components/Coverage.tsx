import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import type { Observation } from '../types/data';
import { useApp } from './context';

const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

export default function Coverage() {
  const { data, m, lang } = useApp();
  const rule = (test: (o: Observation) => boolean) => new Set(data.observations.filter(test).map((o) => o.year));
  const central = (o: Observation) => (o.scope === 'centralBudget' || o.scope === 'centralSubsystem') && o.indicator === 'deficit';
  const general = (o: Observation) => o.scope === 'generalGovernment' && o.indicator === 'deficit';
  const rows: { label: string; years: Set<number> }[] = [
    { label: m.coverage.rows.centralOriginal, years: rule((o) => central(o) && o.status === 'original') },
    { label: m.coverage.rows.centralRevised, years: rule((o) => central(o) && o.status === 'revised') },
    { label: m.coverage.rows.centralActual, years: rule((o) => central(o) && o.status === 'actual') },
    { label: m.coverage.rows.generalActual, years: rule((o) => general(o) && o.status === 'actual') },
    { label: m.coverage.rows.generalPlan, years: rule((o) => general(o) && o.status === 'planned') },
    { label: m.coverage.rows.generalForecast, years: rule((o) => general(o) && o.status === 'forecast') },
    { label: m.coverage.rows.gdpActual, years: rule((o) => o.indicator === 'gdp' && o.status === 'actual') },
    { label: m.coverage.rows.gdpPlan, years: rule((o) => o.indicator === 'gdp' && o.status === 'planned') },
    { label: m.coverage.rows.odaNet, years: rule((o) => o.indicator === 'oda') },
    { label: m.coverage.rows.odaGe, years: rule((o) => o.indicator === 'odaGe') },
    { label: m.coverage.rows.helpsProgram, years: rule((o) => o.indicator === 'hungaryHelpsProgram') },
    { label: m.coverage.rows.helpsAgency, years: rule((o) => o.indicator === 'hungaryHelpsAgency') },
    { label: m.coverage.rows.cpiActual, years: rule((o) => o.indicator === 'cpi' && o.status === 'actual') },
    { label: m.coverage.rows.cpiForecast, years: rule((o) => o.indicator === 'cpi' && o.status === 'forecast') },
  ];
  return (
    <details className="fold" data-testid="coverage">
      <summary>{m.coverage.title}</summary>
      <p className="lede">{m.coverage.intro}</p>
      <div className="coverage-scroll" tabIndex={0} role="region" aria-label={m.coverage.title}>
        <table className="coverage-grid">
          <thead>
            <tr>
              <td />
              {YEARS.map((y) => (
                <th key={y} scope="col">{y % 5 === 0 ? `’${String(y).slice(2)}` : ''}<span className="sr-only">{y}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {YEARS.map((y) => (
                  <td key={y} className={r.years.has(y) ? 'on' : 'off'} title={`${y}: ${r.years.has(y) ? m.coverage.available : m.coverage.missing}`}>
                    <span className="sr-only">{y}: {r.years.has(y) ? m.coverage.available : m.coverage.missing}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{m.coverage.gapsTitle}</h3>
      <ul className="gaps">
        {data.gaps.map((g) => (
          <li key={g.id}>
            <strong>{g.years}.</strong> {g.reason[lang]} <span className="fine">{m.coverage.searched}: {g.searched[lang]}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
