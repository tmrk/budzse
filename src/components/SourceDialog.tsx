import { useEffect, useRef } from 'react';
import { indicatorName, methodName, revisionName, scopeName } from '../i18n';
import { formatDate, formatExactHuf, formatNumber, formatPct } from '../lib/format';
import { cpiYear } from '../lib/cpi';
import type { Measured } from '../lib/measure';
import type { Gap, Observation } from '../types/data';
import { useApp } from './context';
import { SourceList, statusLabel } from './figures';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prov-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export type SourceTarget = { obs: Observation; measured?: Measured | null; gap?: undefined } | { gap: Gap; obs?: undefined; measured?: undefined };

export default function SourceDialog({ target, onClose }: { target: SourceTarget | null; onClose: () => void }) {
  const { data, lang, m } = useApp();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (target && !d.open) d.showModal();
    if (!target && d.open) d.close();
  }, [target]);

  // Closing clears the target, and the sheet keeps its content while it slides out.
  const shown = useRef(target);
  if (target) shown.current = target;

  const o = shown.current?.obs;
  const measured = shown.current?.measured;
  const src = o ? data.sources[o.source] : null;
  const ref = measured?.deflation?.reference;
  const refLabel = ref === 'latest' ? formatDate(data.cpi.latestMonth.month, lang) : ref ? String(ref) : '';
  const cpiOrigin = o ? cpiYear(data.cpi, o.year) : undefined;
  const cpiSrc = cpiOrigin ? data.sources[cpiOrigin.source] : undefined;
  const gap = shown.current?.gap;

  return (
    <dialog ref={dialog} className="source-dialog" onClose={onClose} onClick={(e) => e.target === dialog.current && onClose()} aria-labelledby="source-title" data-testid="source-dialog">
      {gap && (
        <div className="source-inner">
          <header>
            <h2 id="source-title">{m.source.gapTitle}</h2>
            <button type="button" className="close" onClick={onClose} aria-label={m.source.close}>×</button>
          </header>
          <dl>
            <Row label={m.source.gapYears}>{gap.years}</Row>
            <Row label={m.source.gapReason}>{gap.reason[lang]}</Row>
            <Row label={m.coverage.searched}>{gap.searched[lang]}</Row>
            {gap.sources && <Row label={m.methodology.references}><SourceList ids={gap.sources} sources={data.sources} /></Row>}
          </dl>
        </div>
      )}
      {o && src && (
        <div className="source-inner">
          <header>
            <h2 id="source-title">{m.source.title}</h2>
            <button type="button" className="close" onClick={onClose} aria-label={m.source.close}>×</button>
          </header>
          <dl>
            <Row label={m.source.indicator}>{indicatorName(m, o.indicator)}, {o.year}</Row>
            <Row label={m.source.value}>
              <strong>{o.unit === 'HUF' ? formatExactHuf(o.value, lang) : formatPct(o.value, lang, 2)}</strong>
            </Row>
            <Row label={m.source.reported}>
              {o.original.value} {o.original.unit}
            </Row>
            {o.original.usd && <Row label={m.source.usd}>{o.original.usd}</Row>}
            <Row label={m.source.status}>{statusLabel(o, m)}</Row>
            {o.period && <Row label={m.source.period}>{o.period}</Row>}
            <Row label={m.source.scope}>{scopeName(m, o.scope)}</Row>
            <Row label={m.source.method}>{methodName(m, o.method)}</Row>
            <Row label={m.source.revision}>{revisionName(m, o.revision)}</Row>
            <Row label={m.source.institution}>{src.institution[lang]}</Row>
            <Row label={m.source.publication}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">{src.title}</a>
            </Row>
            <Row label={m.source.locator}>{o.locator}</Row>
            {src.publicationDate && <Row label={m.source.published}>{formatDate(src.publicationDate, lang)}</Row>}
            {src.adoptedDate && <Row label={m.source.adopted}>{formatDate(src.adoptedDate, lang)}</Row>}
            <Row label={m.source.accessed}>{formatDate(src.accessed, lang)}</Row>
            {src.note && <Row label={m.source.note}>{src.note[lang]}</Row>}
            {o.note && <Row label={m.source.note}>{o.note[lang]}</Row>}
            {o.evidence && (
              <Row label={m.source.evidence}>
                <blockquote lang="hu">{o.evidence}</blockquote>
              </Row>
            )}
            {o.derivation && (
              <Row label={m.source.calculation}>
                {o.derivation.formula}
                {o.derivation.rate !== undefined && ` = ${formatNumber(o.derivation.rate, lang, 4)}`}
                <ul className="inputs">
                  {o.derivation.inputs.map((id) => (
                    <li key={id}>
                      <a href={data.sources[id].url} target="_blank" rel="noopener noreferrer">{data.sources[id].title}</a>
                    </li>
                  ))}
                </ul>
              </Row>
            )}
            {measured?.deflation && (
              <Row label={m.source.calculation}>
                <p>{m.source.adjustedFormula(refLabel, formatNumber(measured.deflation.factor, lang, 4))}</p>
                <p><strong>{formatExactHuf(measured.value, lang)}</strong>{measured.estimated ? ` (${m.chart.estimated})` : ''}</p>
                {cpiSrc && (
                  <p>
                    {m.source.cpiSource}: <a href={cpiSrc.url} target="_blank" rel="noopener noreferrer">{cpiSrc.title}</a>
                  </p>
                )}
              </Row>
            )}
            {o.secondary && <Row label={m.source.note}><span className="notice-inline">{m.source.secondary}</span></Row>}
          </dl>
          <div className="source-foot">
            <a className="button" href={src.url} target="_blank" rel="noopener noreferrer">{m.source.open}</a>
          </div>
        </div>
      )}
    </dialog>
  );
}
