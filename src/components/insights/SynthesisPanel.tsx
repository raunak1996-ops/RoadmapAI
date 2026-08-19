import { AlertTriangle, Brain, ListChecks, Sparkles } from 'lucide-react';
import type { InsightsData } from '../../types';
import { Badge, Button, Card, CardHeader, ProgressBar, Skeleton } from '../ui/Primitives';
import { intensityColor } from '../../lib/theme';
import { timeAgo } from '../../lib/utils';

export function SynthesisPanel({
  insights,
  loading,
  onRun,
  issueCount,
}: {
  insights: InsightsData | null;
  loading: boolean;
  onRun: () => void;
  issueCount: number;
}) {
  return (
    <Card>
      <CardHeader
        title="AI strategic synthesis"
        subtitle={
          insights?.generatedAt
            ? `Generated ${timeAgo(insights.generatedAt)} from ${issueCount} signals`
            : `Reads all ${issueCount} signals and names the pattern behind them`
        }
        icon={<Brain className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            {insights ? (
              <Badge
                className={
                  insights.generatedBy === 'gemini'
                    ? 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30'
                    : 'bg-slate-500/10 text-slate-400 ring-slate-500/30'
                }
              >
                {insights.generatedBy === 'gemini' ? 'Gemini' : 'Local'}
              </Badge>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              icon={loading ? undefined : <Sparkles className="h-3.5 w-3.5" />}
              onClick={onRun}
            >
              {insights ? 'Re-synthesize' : 'Run synthesis'}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-9/12" />
          <div className="grid gap-2 pt-3 sm:grid-cols-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      ) : !insights ? (
        <div className="rounded-xl border border-dashed border-slate-800 px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-300">No synthesis yet</p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
            Synthesis consolidates the raw feed into themes, quantifies exposure, and moves every new
            signal to <span className="text-slate-300">Analyzed</span> so it can be approved into the
            ideation pool.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-slate-300">{insights.summary}</p>

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Consolidated themes
            </p>
            <ul className="space-y-2.5">
              {insights.topThemes.map((theme) => (
                <li key={theme.theme}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-slate-300">{theme.theme}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {theme.count} signal{theme.count === 1 ? '' : 's'} · {theme.intensity}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${theme.intensity}%`,
                        backgroundColor: intensityColor(theme.intensity),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {insights.risks?.length ? (
              <div className="rounded-xl bg-rose-500/5 p-3.5 ring-1 ring-inset ring-rose-500/20">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Risks of not acting
                </p>
                <ul className="space-y-2">
                  {insights.risks.map((risk) => (
                    <li key={risk} className="text-[11px] leading-relaxed text-slate-400">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {insights.recommendations?.length ? (
              <div className="rounded-xl bg-emerald-500/5 p-3.5 ring-1 ring-inset ring-emerald-500/20">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  <ListChecks className="h-3.5 w-3.5" />
                  Recommended next steps
                </p>
                <ol className="space-y-2">
                  {insights.recommendations.map((rec, index) => (
                    <li key={rec} className="flex gap-2 text-[11px] leading-relaxed text-slate-400">
                      <span className="font-mono text-emerald-400/70">{index + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}

/** Small pipeline strip showing how many signals sit at each stage. */
export function ApprovalPipeline({
  counts,
  onApproveAll,
  canApproveAll,
}: {
  counts: { total: number; analyzed: number; approved: number; fresh: number };
  onApproveAll: () => void;
  canApproveAll: boolean;
}) {
  const stages = [
    { label: 'New', value: counts.fresh, bar: 'bg-slate-500' },
    { label: 'Analyzed', value: counts.analyzed, bar: 'bg-amber-400' },
    { label: 'Approved', value: counts.approved, bar: 'bg-emerald-400' },
  ];

  return (
    <Card>
      <CardHeader
        title="Approval pipeline"
        subtitle="Nothing reaches ideation without a human approving it"
        icon={<ListChecks className="h-4 w-4" />}
        action={
          <Button size="sm" variant="success" disabled={!canApproveAll} onClick={onApproveAll}>
            Approve all analyzed
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {stages.map((stage) => (
          <div key={stage.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">{stage.label}</span>
              <span className="text-lg font-semibold tabular-nums text-slate-200">{stage.value}</span>
            </div>
            <ProgressBar
              className="mt-2"
              value={counts.total ? (stage.value / counts.total) * 100 : 0}
              barClassName={stage.bar}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
