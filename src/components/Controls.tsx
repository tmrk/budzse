import { formatDate } from '../lib/format';
import { lensOf, lensPatch, type AnalyticalScope, type Lens } from '../lib/view';
import { useApp } from './context';

function Segmented<T extends string>({ label, value, options, onChange, testId }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; testId: string }) {
  return (
    <div className="segmented" role="group" aria-label={label} data-testid={testId}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => value !== o.value && onChange(o.value)} data-testid={`${testId}-${o.value}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LensControl({ compact }: { compact?: boolean }) {
  const { view, setView, m, lang, data } = useApp();
  const lens = lensOf(view);
  const annualRefs = data.cpi.annual.filter((r) => r.status === 'actual').map((r) => r.year).reverse();
  return (
    <div className="lens">
      <Segmented<Lens>
        label={m.controls.lens}
        testId={compact ? 'bar-lens' : 'lens'}
        value={lens}
        onChange={(l) => setView(lensPatch(l))}
        options={[
          { value: 'forint', label: m.controls.lensForint },
          { value: 'real', label: m.controls.lensReal },
          { value: 'share', label: m.controls.lensShare },
        ]}
      />
      {lens === 'real' && !compact && (
        <label className="quiet-select">
          <span className="sr-only">{m.controls.reference}</span>
          <select value={String(view.ref)} onChange={(e) => setView({ ref: e.target.value === 'latest' ? 'latest' : Number(e.target.value) })} data-testid="reference">
            <option value="latest">{m.controls.referenceLatest(formatDate(data.cpi.latestMonth.month, lang))}</option>
            {annualRefs.map((y) => (
              <option key={y} value={y}>{m.controls.referenceYear(y)}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function ScopeControl() {
  const { view, setView, m } = useApp();
  return (
    <Segmented<AnalyticalScope>
      label={m.controls.scope}
      testId="scope"
      value={view.scope}
      onChange={(scope) => setView({ scope })}
      options={[
        { value: 'general', label: m.controls.scopeGeneral },
        { value: 'central', label: m.controls.scopeCentral },
      ]}
    />
  );
}
