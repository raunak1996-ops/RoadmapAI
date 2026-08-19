import { useMemo, useState } from 'react';
import { Filter, Inbox, Search } from 'lucide-react';
import { AppTab, type IssueSource, type IssueStatus } from '../types';
import { useApp } from '../state/AppContext';
import { IssueCard } from '../components/insights/IssueCard';
import { ApprovalPipeline, SynthesisPanel } from '../components/insights/SynthesisPanel';
import { Button, Card, EmptyState } from '../components/ui/Primitives';
import { DemoDataButton } from '../components/layout/DemoDataButton';
import { synthesizeInsights } from '../services/aiService';
import { cn } from '../lib/utils';

const SOURCES: Array<IssueSource | 'All'> = ['All', 'CRM', 'Zoom', 'Sales'];
const STATUSES: Array<IssueStatus | 'All'> = ['All', 'New', 'Analyzed', 'Approved'];

export function InsightsView() {
  const { state, dispatch, pushToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<IssueSource | 'All'>('All');
  const [status, setStatus] = useState<IssueStatus | 'All'>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.issues
      .filter((issue) => (source === 'All' ? true : issue.source === source))
      .filter((issue) => (status === 'All' ? true : issue.status === status))
      .filter((issue) =>
        needle
          ? issue.theme.toLowerCase().includes(needle) ||
            issue.description.toLowerCase().includes(needle) ||
            (issue.account ?? '').toLowerCase().includes(needle)
          : true,
      )
      .sort((a, b) => b.intensity - a.intensity);
  }, [state.issues, source, status, query]);

  const counts = useMemo(
    () => ({
      total: state.issues.length,
      fresh: state.issues.filter((i) => i.status === 'New').length,
      analyzed: state.issues.filter((i) => i.status === 'Analyzed').length,
      approved: state.issues.filter((i) => i.status === 'Approved').length,
    }),
    [state.issues],
  );

  const runSynthesis = async () => {
    setLoading(true);
    try {
      const result = await synthesizeInsights(state.issues);
      dispatch({ type: 'SET_INSIGHTS', insights: result.data });
      pushToast({
        title: result.source === 'gemini' ? 'Synthesis complete' : 'Synthesis complete (local)',
        description:
          result.warning ??
          `${result.data.topThemes.length} themes consolidated. New signals moved to Analyzed.`,
        tone: result.warning ? 'warning' : 'success',
      });
    } catch (error) {
      pushToast({
        title: 'Synthesis failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const approveAll = () => {
    dispatch({ type: 'APPROVE_ALL_ANALYZED' });
    pushToast({
      title: `${counts.analyzed} signals approved`,
      description: 'They are now available as grounding in the Ideation Lab.',
      tone: 'success',
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <Card padded={false} className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search themes, accounts, detail…"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-950/60 p-1 ring-1 ring-inset ring-slate-800">
              <Filter className="ml-1.5 h-3 w-3 text-slate-600" />
              {SOURCES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSource(option)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                    source === option
                      ? 'bg-indigo-500/20 text-indigo-200'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-950/60 p-1 ring-1 ring-inset ring-slate-800">
              {STATUSES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                    status === option
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Showing {filtered.length} of {state.issues.length} signals
          </p>
          {counts.fresh > 0 ? (
            <p className="text-xs text-amber-400/80">
              {counts.fresh} signal{counts.fresh === 1 ? '' : 's'} still need synthesis
            </p>
          ) : null}
        </div>

        {state.issues.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title="No signals in the feed"
            description="The workspace is empty. Load the sample dataset to see multi-channel customer signals flow through synthesis."
            action={<DemoDataButton size="md" />}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title="No signals match these filters"
            description="Clear the search or widen the channel and status filters to see the rest of the feed."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setQuery('');
                  setSource('All');
                  setStatus('All');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                selected={selectedId === issue.id}
                onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
                onApprove={(id) => {
                  dispatch({ type: 'APPROVE_ISSUE', id });
                  pushToast({
                    title: 'Signal approved',
                    description: 'Added to the grounding pool for ideation.',
                    tone: 'success',
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <SynthesisPanel
          insights={state.insights}
          loading={loading}
          onRun={runSynthesis}
          issueCount={state.issues.length}
        />
        <ApprovalPipeline
          counts={counts}
          onApproveAll={approveAll}
          canApproveAll={counts.analyzed > 0}
        />
        {counts.approved > 0 ? (
          <Card>
            <p className="text-xs leading-relaxed text-slate-400">
              {counts.approved} approved signal{counts.approved === 1 ? '' : 's'} are ready to ground
              feature generation.
            </p>
            <Button
              className="mt-3 w-full"
              variant="primary"
              size="sm"
              onClick={() => dispatch({ type: 'SET_TAB', tab: AppTab.IDEATION })}
            >
              Go to Ideation Lab
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
