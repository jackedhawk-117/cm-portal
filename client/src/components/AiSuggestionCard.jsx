import { BadgeCheck, Info, Languages, Sparkles, TriangleAlert } from 'lucide-react';
import { PriorityBadge, SourceBadge } from './ui';

/**
 * Advisory AI insight card. Used both in the submission flow and the detail page.
 * Clearly labels fallback output so it can never be mistaken for real AI.
 */
export function AiSuggestionCard({ ai, duplicates = [], compact = false }) {
  if (!ai || (!ai.category && !ai.summary && !ai.priority && !ai.source)) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        <Info size={16} className="mr-1.5 inline-block align-[-3px]" />
        No AI analysis was requested for this grievance.
      </div>
    );
  }
  const isFallback = ai.source && ai.source !== 'gemini';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-brand-50 p-1.5 text-brand-700">
            <Sparkles size={16} />
          </span>
          <h3 className="text-sm font-semibold text-slate-900">AI-assisted triage</h3>
        </div>
        <SourceBadge source={ai.source} />
      </div>

      {isFallback && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong>Fallback (not AI).</strong> The AI service was unavailable, so a keyword rule produced
            this suggestion. A human officer still reviews the grievance.
          </span>
        </div>
      )}

      {ai.summary && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Neutral summary</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{ai.summary}</p>
        </div>
      )}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suggested category</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{ai.category || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suggested department</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{ai.department_name || ai.department || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suggested priority</dt>
          <dd className="mt-1">{ai.priority ? <PriorityBadge priority={ai.priority} /> : '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Confidence</dt>
          <dd className="mt-0.5 font-medium text-slate-800">
            {typeof ai.confidence === 'number' ? `${Math.round(ai.confidence * 100)}%` : '—'}
            {ai.language ? (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-slate-500">
                <Languages size={12} /> {ai.language}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      {ai.priority_reason && (
        <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
          <strong className="font-semibold text-slate-700">Why this priority: </strong>
          {ai.priority_reason}
        </p>
      )}

      {ai.accepted && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
          <BadgeCheck size={13} /> Citizen accepted the AI suggestion
        </p>
      )}

      {!compact && duplicates.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Potential duplicates (flagged for review only)</p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-900">
            {duplicates.map((dup) => (
              <li key={dup.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  <span className="font-mono font-semibold">{dup.ref_no}</span> · {dup.subject}
                </span>
                <span className="shrink-0 font-semibold">{(dup.similarity * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-amber-800">
            These complaints are never merged or rejected automatically.
          </p>
        </div>
      )}
    </div>
  );
}
