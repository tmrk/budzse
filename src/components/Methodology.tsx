import { useApp } from './context';
import { SourceList } from './figures';

export default function Methodology() {
  const { data, m } = useApp();
  return (
    <details className="fold" data-testid="methodology">
      <summary>{m.methodology.title}</summary>
      <p className="lede">{m.methodology.intro}</p>
      <div className="method-list">
        {m.methodology.sections.map((s) => (
          <details key={s.id}>
            <summary>{s.title}</summary>
            {s.body.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
            <SourceList label={m.methodology.references} ids={s.sources} sources={data.sources} />
          </details>
        ))}
      </div>
    </details>
  );
}
