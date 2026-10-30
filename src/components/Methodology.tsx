import { useApp } from './context';

export default function Methodology() {
  const { m } = useApp();
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
          </details>
        ))}
      </div>
    </details>
  );
}
