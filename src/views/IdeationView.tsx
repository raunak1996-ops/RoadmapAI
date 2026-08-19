import { useMemo, useState } from 'react';
import { History, Lightbulb, Sparkles, TrendingUp } from 'lucide-react';
import { AppTab, type FeatureIdea } from '../types';
import { useApp } from '../state/AppContext';
import { FeatureCard } from '../components/ideation/FeatureCard';
import { RiceModal } from '../components/ideation/RiceModal';
import { Badge, Button, Card, CardHeader, EmptyState, Skeleton } from '../components/ui/Primitives';
import { generateFeatureIdeas } from '../services/aiService';
import { HISTORICAL_BENCHMARKS } from '../data/seed';
import { cn, sortByScore } from '../lib/utils';

type SortMode = 'score' | 'reach' | 'effort';

export function IdeationView() {
  const { state, dispatch, pushToast } = useApp();
  const [generating, setGenerating] = useState(false);
  const [scoring, setScoring] = useState<FeatureIdea | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('score');
  const [showApproved, setShowApproved] = useState(true);

  const approvedIssues = state.issues.filter((issue) => issue.status === 'Approved');

  const visible = useMemo(() => {
    const pool = showApproved
      ? state.ideas
      : state.ideas.filter((idea) => idea.status === 'Draft');
    if (sortMode === 'reach') return [...pool].sort((a, b) => b.reach - a.reach);
    if (sortMode === 'effort') return [...pool].sort((a, b) => a.effort - b.effort);
    return sortByScore(pool);
  }, [state.ideas, sortMode, showApproved]);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generateFeatureIdeas(
        state.issues,
        HISTORICAL_BENCHMARKS,
        state.ideas.map((idea) => idea.title),
        3,
      );
      if (result.data.length === 0) {
        pushToast({
          title: 'Nothing new to propose',
          description: 'Approve more customer signals on the Insights tab first.',
          tone: 'warning',
        });
      } else {
        dispatch({ type: 'ADD_IDEAS', ideas: result.data });
        pushToast({
          title:
            result.source === 'gemini'
              ? `${result.data.length} ideas generated`
              : `${result.data.length} ideas generated (local)`,
          description: result.warning ?? 'Each one cites the signals and the shipped precedent behind it.',
          tone: result.warning ? 'warning' : 'success',
        });
      }
    } catch (error) {
      pushToast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        tone: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Lightbulb className="h-4 w-4 text-amber-300" />
                Generate feature bets
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
                Grounded in {approvedIssues.length} approved customer signal
                {approvedIssues.length === 1 ? '' : 's'} and {HISTORICAL_BENCHMARKS.length} shipped
                features with measured outcomes. Ideas arrive as drafts — nothing reaches the roadmap
                without a scored, approved decision.
              </p>
            </div>
            <Button
              variant="primary"
              loading={generating}
              icon={generating ? undefined : <Sparkles className="h-4 w-4" />}
              onClick={generate}
            >
              Generate ideas
            </Button>
          </div>

          {approvedIssues.length === 0 ? (
            <p className="mt-3 rounded-lg bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300/90 ring-1 ring-inset ring-amber-500/20">
              No approved signals yet — generation will fall back to the full raw feed.{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => dispatch({ type: 'SET_TAB', tab: AppTab.INSIGHTS })}
              >
                Approve signals first
              </button>
              .
            </p>
          ) : null}
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-1 rounded-lg bg-slate-950/60 p-1 ring-1 ring-inset ring-slate-800">
            {(
              [
                ['score', 'RICE score'],
                ['reach', 'Reach'],
                ['effort', 'Quick wins'],
              ] as Array<[SortMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  sortMode === mode
                    ? 'bg-indigo-500/20 text-indigo-200'
                    : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            <input
              type="checkbox"
              checked={showApproved}
              onChange={(event) => setShowApproved(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 accent-indigo-500"
            />
            Show approved
          </label>
        </div>

        {generating ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((key) => (
              <Card key={key} className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-10/12" />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {visible.length === 0 && !generating ? (
          <EmptyState
            icon={<Lightbulb className="h-5 w-5" />}
            title="No ideas in this view"
            description="Generate a fresh batch, or re-enable approved ideas to see everything that has already been promoted."
            action={
              <Button size="sm" variant="primary" onClick={generate}>
                Generate ideas
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((idea) => (
              <FeatureCard
                key={idea.id}
                idea={idea}
                issues={state.issues}
                onScore={setScoring}
                onApprove={(id) => {
                  dispatch({ type: 'APPROVE_IDEA', id });
                  pushToast({
                    title: 'Promoted to the roadmap',
                    description: 'A ticket was created in the Backlog with starter child items.',
                    tone: 'success',
                  });
                }}
                onDelete={(id) => {
                  dispatch({ type: 'DELETE_IDEA', id });
                  pushToast({ title: 'Idea discarded', tone: 'info' });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Historical benchmarks"
            subtitle="What comparable bets actually cost and returned"
            icon={<History className="h-4 w-4" />}
          />
          <ul className="space-y-3">
            {HISTORICAL_BENCHMARKS.map((benchmark) => (
              <li
                key={benchmark.id}
                className="rounded-xl bg-slate-950/50 p-3 ring-1 ring-inset ring-slate-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium leading-snug text-slate-200">
                    {benchmark.feature}
                  </p>
                  <Badge className="shrink-0 bg-slate-800/80 text-slate-400 ring-slate-700">
                    {benchmark.shippedQuarter}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{benchmark.effortWeeks} eng-weeks</span>
                  <span>·</span>
                  <span className={benchmark.adoption >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                    {benchmark.adoption}% adoption
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{benchmark.outcome}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Portfolio mix"
            subtitle="Where the scored bets land"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <ul className="space-y-2 text-xs">
            <MixRow
              label="Quick wins (effort ≤ 2)"
              value={state.ideas.filter((i) => i.effort <= 2).length}
              total={state.ideas.length}
              tone="bg-emerald-400"
            />
            <MixRow
              label="Major bets (effort ≥ 4)"
              value={state.ideas.filter((i) => i.effort >= 4).length}
              total={state.ideas.length}
              tone="bg-rose-400"
            />
            <MixRow
              label="High impact (impact = 3)"
              value={state.ideas.filter((i) => i.impact === 3).length}
              total={state.ideas.length}
              tone="bg-indigo-400"
            />
            <MixRow
              label="Approved"
              value={state.ideas.filter((i) => i.status === 'Approved').length}
              total={state.ideas.length}
              tone="bg-cyan-400"
            />
          </ul>
        </Card>
      </div>

      <RiceModal
        idea={scoring}
        issues={state.issues}
        benchmarks={HISTORICAL_BENCHMARKS}
        onClose={() => setScoring(null)}
        onSave={(id, patch) => {
          dispatch({ type: 'UPDATE_IDEA', id, patch });
          pushToast({ title: 'RICE score updated', tone: 'success' });
        }}
        onNotify={(title, description, tone) => pushToast({ title, description, tone })}
      />
    </div>
  );
}

function MixRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <li>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{label}</span>
        <span className="tabular-nums text-slate-300">
          {value} / {total}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
