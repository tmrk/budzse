import { figureRows } from '../lib/measure';
import { useApp } from './context';
import { figure, SourceButton, statusLabel } from './figures';

/** Every version of the year's three figures: the act as passed, as amended, part-year, forecasts, outcome. */
export default function YearFigures() {
  const { data, view, year, m, lang } = useApp();
  const rows = figureRows(data, year, view.scope, view);
  const columns = [
    ['revenue', m.hero.revenue],
    ['expenditure', m.hero.expenditure],
    ['deficit', m.hero.deficit],
  ] as const;
  return (
    <details className="fold" data-testid="year-figures">
      <summary>{m.figures.title(year)}</summary>
      <p className="fine">{m.figures.note}</p>
      {rows.length > 0 && (
        <div className="scroll-x year-figures-table" tabIndex={0} role="region" aria-label={m.figures.title(year)}>
          <table>
            <thead>
              <tr>
                <th scope="col">{m.figures.status}</th>
                {columns.map(([k, label]) => (
                  <th key={k} scope="col" className="num">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{statusLabel(r.obs, m)}</th>
                  {columns.map(([k, label]) => {
                    const c = r.cells[k];
                    return (
                      <td key={k} className="num">
                        {c?.measured ? (
                          <>
                            <SourceButton obs={c.obs} measured={c.measured} what={label} testId={`source-${c.obs.id}`}>{figure(c.measured, lang)}</SourceButton>
                            {c.measured.estimated && <em className="estimate">{m.chart.estimated}</em>}
                          </>
                        ) : (
                          <span aria-label={m.year.noData}>–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
