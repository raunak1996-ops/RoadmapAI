import { Building2, Check, MessageSquare, PhoneCall, Video } from 'lucide-react';
import type { CustomerIssue } from '../../types';
import { Badge, Button } from '../ui/Primitives';
import { ISSUE_STATUS_STYLES, SOURCE_STYLES, intensityColor } from '../../lib/theme';
import { cn, formatCurrency, timeAgo } from '../../lib/utils';

const SOURCE_ICON = {
  CRM: MessageSquare,
  Zoom: Video,
  Sales: PhoneCall,
} as const;

export function IssueCard({
  issue,
  onApprove,
  selected,
  onSelect,
}: {
  issue: CustomerIssue;
  onApprove: (id: string) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = SOURCE_ICON[issue.source];
  const style = SOURCE_STYLES[issue.source];

  return (
    <article
      className={cn(
        'group rounded-2xl border bg-slate-900/50 p-4 transition-colors',
        selected ? 'border-indigo-500/50 bg-slate-900' : 'border-slate-800/80 hover:border-slate-700',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelect(issue.id)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={selected}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={style.chip} dot={style.dot}>
              <Icon className="h-3 w-3" />
              {issue.source}
            </Badge>
            <Badge className={ISSUE_STATUS_STYLES[issue.status]}>{issue.status}</Badge>
            <span className="text-[10px] text-slate-500">{timeAgo(issue.capturedAt)}</span>
          </div>
          <h4 className="mt-2 text-sm font-medium leading-snug text-slate-100">{issue.theme}</h4>
          <p
            className={cn(
              'mt-1.5 text-xs leading-relaxed text-slate-400',
              selected ? '' : 'line-clamp-2',
            )}
          >
            {issue.description}
          </p>
        </button>

        <div className="flex w-16 shrink-0 flex-col items-end gap-1">
          <span
            className="text-lg font-semibold tabular-nums"
            style={{ color: intensityColor(issue.intensity) }}
          >
            {issue.intensity}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-slate-500">intensity</span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full"
              style={{
                width: `${issue.intensity}%`,
                backgroundColor: intensityColor(issue.intensity),
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-3">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{issue.account ?? 'Unattributed'}</span>
          {issue.arr ? (
            <>
              <span>·</span>
              <span className="text-slate-400">{formatCurrency(issue.arr)} ARR</span>
            </>
          ) : null}
        </div>

        {issue.status === 'Approved' ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <Check className="h-3 w-3" />
            In ideation pool
          </span>
        ) : (
          <Button
            size="sm"
            variant={issue.status === 'Analyzed' ? 'success' : 'ghost'}
            disabled={issue.status === 'New'}
            onClick={() => onApprove(issue.id)}
            title={issue.status === 'New' ? 'Run the AI synthesis first' : 'Approve into the ideation pool'}
          >
            Approve
          </Button>
        )}
      </div>
    </article>
  );
}
