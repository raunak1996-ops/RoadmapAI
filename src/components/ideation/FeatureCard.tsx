import type { ReactNode } from 'react';
import { CheckCircle2, History, Link2, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { CustomerIssue, FeatureIdea } from '../../types';
import { Badge, Button } from '../ui/Primitives';
import { EFFORT_LABELS, IMPACT_LABELS, cn, issuesById } from '../../lib/utils';

export function FeatureCard({
  idea,
  issues,
  onScore,
  onApprove,
  onDelete,
}: {
  idea: FeatureIdea;
  issues: CustomerIssue[];
  onScore: (idea: FeatureIdea) => void;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const linked = issuesById(issues, idea.relatedIssueIds);
  const approved = idea.status === 'Approved';

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border bg-slate-900/50 p-5 transition-colors',
        approved ? 'border-emerald-500/30' : 'border-slate-800/80 hover:border-slate-700',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={
                approved
                  ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                  : 'bg-slate-500/10 text-slate-400 ring-slate-500/30'
              }
            >
              {idea.status}
            </Badge>
            {idea.confidence !== undefined ? (
              <Badge className="bg-slate-800/80 text-slate-400 ring-slate-700">
                {Math.round(idea.confidence * 100)}% confidence
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-slate-100">{idea.title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{idea.description}</p>
        </div>

        <div className="shrink-0 rounded-xl bg-indigo-500/10 px-3 py-2 text-center ring-1 ring-inset ring-indigo-500/25">
          <p className="text-xl font-semibold tabular-nums leading-none text-indigo-200">
            {idea.score.toFixed(1)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-indigo-300/60">RICE</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Reach" value={`${idea.reach}%`} hint="of enterprise base" />
        <Metric label="Impact" value={IMPACT_LABELS[idea.impact] ?? String(idea.impact)} hint={`×${idea.impact}`} />
        <Metric label="Effort" value={EFFORT_LABELS[idea.effort] ?? String(idea.effort)} hint={`÷${idea.effort}`} />
      </dl>

      <div className="mt-4 space-y-2.5 border-t border-slate-800/70 pt-4">
        <Section label="Why this bet" text={idea.reasoning} />
        <Section label="Historical context" text={idea.historicalContext} icon={<History className="h-3 w-3" />} />
      </div>

      {linked.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Link2 className="h-3 w-3 text-slate-600" />
          {linked.map((issue) => (
            <span
              key={issue.id}
              className="rounded-md bg-slate-800/70 px-1.5 py-0.5 text-[10px] text-slate-400"
              title={issue.description}
            >
              {issue.theme.slice(0, 34)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2 border-t border-slate-800/70 pt-4">
        <Button
          size="sm"
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          onClick={() => onScore(idea)}
          disabled={approved}
        >
          Estimate RICE
        </Button>
        {approved ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            On the roadmap
          </span>
        ) : (
          <Button
            size="sm"
            variant="success"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            onClick={() => onApprove(idea.id)}
          >
            Approve to roadmap
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-slate-500 hover:text-rose-300"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={() => onDelete(idea.id)}
          aria-label={`Delete ${idea.title}`}
        />
      </div>
    </article>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg bg-slate-950/50 px-2.5 py-2 ring-1 ring-inset ring-slate-800">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-200">{value}</dd>
      <dd className="text-[10px] text-slate-600">{hint}</dd>
    </div>
  );
}

function Section({ label, text, icon }: { label: string; text: string; icon?: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}
