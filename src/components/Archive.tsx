import { useApp } from './context';
import Coverage from './Coverage';
import DataTable from './DataTable';
import Methodology from './Methodology';

/** Everything an inquiring reader needs, folded away so the page above stays readable. */
export default function Archive() {
  const { m } = useApp();
  return (
    <section className="archive" aria-label={m.table.title}>
      <DataTable />
      <Coverage />
      <Methodology />
    </section>
  );
}
