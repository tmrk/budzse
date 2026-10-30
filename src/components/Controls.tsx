import { presetName } from '../i18n';
import { formatDate } from '../lib/format';
import { activePreset, ALL_METRICS, DEFAULT_VIEW, FIRST_YEAR, LAST_YEAR, PRESETS, type MetricKey, type PresetKey } from '../lib/view';
import { useApp } from './context';

const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

function Segmented<T extends string>({ label, value, options, onChange, testId }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; testId?: string }) {
  return (
    <fieldset className="segmented" data-testid={testId}>
      <legend>{label}</legend>
      <div className="segmented-row">
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function QuickControls() {
  const { view, setView, m, lang, data } = useApp();
  const preset = activePreset(view);
  const toggleMetric = (k: MetricKey) => {
    const on = view.metrics.includes(k);
    setView({ metrics: on ? view.metrics.filter((x) => x !== k) : ALL_METRICS.filter((x) => x === k || view.metrics.includes(x)) });
  };
  const annualRefs = data.cpi.annual.filter((r) => r.status === 'actual').map((r) => r.year).reverse();
  const latestLabel = formatDate(data.cpi.latestMonth.month, lang);
  const refValue = String(view.ref);

  return (
    <div className="controls quick">
      <nav className="presets" aria-label={m.controls.presets}>
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
          <button key={k} type="button" aria-pressed={preset === k} onClick={() => setView({ ...PRESETS[k] })} data-testid={`preset-${k}`}>
            {presetName(m, k)}
          </button>
        ))}
      </nav>

      <fieldset className="chips" data-testid="metrics">
        <legend className="sr-only">{m.controls.indicators}</legend>
        <div className="chip-row">
          {ALL_METRICS.map((k) => (
            <button key={k} type="button" className={`chip chip-${k}`} aria-pressed={view.metrics.includes(k)} onClick={() => toggleMetric(k)} data-testid={`metric-${k}`}>
              <span className="chip-mark" aria-hidden="true" />
              {m.metricChips[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="switches">
        <div className="price-control">
          <label className="switch">
            <input type="checkbox" role="switch" checked={view.real} onChange={(e) => setView({ real: e.target.checked })} data-testid="inflation" disabled={view.relative} />
            <span className="switch-track" aria-hidden="true" />
            <span>{m.controls.inflation}</span>
          </label>
          {view.real && !view.relative && (
            <label className="field">
              <span className="sr-only">{m.controls.reference}</span>
              <select
                value={refValue}
                onChange={(e) => setView({ ref: e.target.value === 'latest' ? 'latest' : Number(e.target.value) })}
                data-testid="reference"
              >
                <option value="latest">{m.controls.referenceLatest(latestLabel)}</option>
                {annualRefs.map((y) => (
                  <option key={y} value={y}>
                    {m.controls.referenceYear(y)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="switch">
          <input type="checkbox" role="switch" checked={view.relative} onChange={(e) => setView({ relative: e.target.checked })} data-testid="relative" />
          <span className="switch-track" aria-hidden="true" />
          <span>{m.controls.relative}</span>
        </label>
      </div>
    </div>
  );
}

export function DetailControls({ onShare, shareState }: { onShare: () => void; shareState: 'idle' | 'ok' | 'failed' }) {
  const { view, setView, m } = useApp();
  return (
    <div className="controls detail">
      <div className="control-row">
        <Segmented
          label={m.controls.scope}
          testId="scope"
          value={view.scope}
          onChange={(scope) => setView({ scope })}
          options={[
            { value: 'central', label: m.controls.scopeCentral },
            { value: 'general', label: m.controls.scopeGeneral },
          ]}
        />
        <Segmented
          label={m.controls.show}
          testId="planview"
          value={view.view}
          onChange={(v) => setView({ view: v })}
          options={[
            { value: 'actual', label: m.controls.viewActual },
            { value: 'plan', label: m.controls.viewPlan },
            { value: 'both', label: m.controls.viewBoth },
          ]}
        />
      </div>
      <details className="more">
        <summary>{m.controls.more}</summary>
        <div className="more-body">
          <label className="check">
            <input type="checkbox" checked={view.revised} onChange={(e) => setView({ revised: e.target.checked })} data-testid="revised" />
            {m.controls.revised}
          </label>
          <label className="check">
            <input type="checkbox" checked={view.forecasts} onChange={(e) => setView({ forecasts: e.target.checked })} data-testid="forecasts" />
            {m.controls.forecasts}
          </label>
          <label className="check">
            <input type="checkbox" checked={view.exact} onChange={(e) => setView({ exact: e.target.checked })} data-testid="exact" />
            {m.controls.exact}
          </label>
          <div className="range-fields">
            <label className="field">
              <span>{m.controls.from}</span>
              <select value={view.from} onChange={(e) => setView({ from: Math.min(Number(e.target.value), view.to) })} data-testid="from">
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{m.controls.to}</span>
              <select value={view.to} onChange={(e) => setView({ to: Math.max(Number(e.target.value), view.from) })} data-testid="to">
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="more-actions">
            <button type="button" className="text-button" onClick={() => setView({ ...DEFAULT_VIEW })} data-testid="reset">
              {m.controls.reset}
            </button>
            <button type="button" className="text-button" onClick={onShare} data-testid="share">
              {shareState === 'ok' ? m.controls.shared : shareState === 'failed' ? m.controls.shareFailed : m.controls.share}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
