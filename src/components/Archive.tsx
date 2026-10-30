import { useApp } from './context';
import Coverage from './Coverage';
import DataTable from './DataTable';
import Methodology from './Methodology';
import YearFigures from './YearFigures';

/** Everything an inquiring reader needs, folded away so the page above stays readable. */
export default function Archive() {
  const { m } = useApp();
  return (
    <section className="archive" aria-label={m.table.title}>
      <YearFigures />
      <DataTable />
      <Coverage />
      <Methodology />
    </section>
  );
}
