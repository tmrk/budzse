import { useApp } from './context';

export default function Methodology() {
  const { m } = useApp();
  return (
    <section className="methodology" aria-labelledby="method-title" data-testid="methodology">
      <h2 id="method-title">{m.methodology.title}</h2>
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
    </section>
  );
}
