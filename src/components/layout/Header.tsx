import { Activity, CloudCog, FileDown, Sparkles, WifiOff } from 'lucide-react';
import { AppTab } from '../../types';
import { useApp } from '../../state/AppContext';
import { Badge, Button } from '../ui/Primitives';
import { isAiEnabled } from '../../services/geminiClient';
import { generateStatusReport } from '../../services/pdfService';
import { timeAgo } from '../../lib/utils';

const TITLES: Record<AppTab, { title: string; subtitle: string }> = {
  [AppTab.DASHBOARD]: {
    title: 'Overview',
    subtitle: 'Portfolio health across signals, bets and delivery.',
  },
  [AppTab.INSIGHTS]: {
    title: 'Customer Intelligence',
    subtitle: 'Multi-channel signal feed and AI strategic synthesis.',
  },
  [AppTab.IDEATION]: {
    title: 'Ideation Lab',
    subtitle: 'Generate bets, score them with RICE, promote the winners.',
  },
  [AppTab.TICKETS]: {
    title: 'Roadmap & Execution',
    subtitle: 'Kanban, timeline, and live activity from connected tools.',
  },
  [AppTab.INTEGRATIONS]: {
    title: 'Connect',
    subtitle: 'The product stack feeding and receiving RoadmapAI data.',
  },
};

export function Header() {
  const { state, dispatch, pushToast } = useApp();
  const { title, subtitle } = TITLES[state.activeTab];

  const connected = state.integrations.filter((i) => i.connected).length;
  const lastSync = state.syncFeed[0]?.at;

  const onExport = async () => {
    try {
      const filename = await generateStatusReport({
        tickets: state.tickets,
        ideas: state.ideas,
        issues: state.issues,
        insights: state.insights,
      });
      pushToast({ title: 'Status report generated', description: filename, tone: 'success' });
    } catch (error) {
      pushToast({
        title: 'Could not generate report',
        description: error instanceof Error ? error.message : 'Unknown error',
        tone: 'error',
      });
    }
  };

  return (
    <header className="flex flex-col gap-4 border-b border-slate-800/80 bg-slate-950/40 px-5 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-100">{title}</h1>
          <Badge
            className={
              isAiEnabled()
                ? 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30'
                : 'bg-slate-500/10 text-slate-400 ring-slate-500/30'
            }
          >
            <Sparkles className="h-3 w-3" />
            {isAiEnabled() ? 'Gemini live' : 'Demo mode'}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_SYNC_ENABLED', enabled: !state.syncEnabled })}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
          title={state.syncEnabled ? 'Pause simulated cloud sync' : 'Resume simulated cloud sync'}
        >
          {state.syncEnabled ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Sync live
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-slate-500" />
              Sync paused
            </>
          )}
        </button>

        <span className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-400 sm:inline-flex">
          <CloudCog className="h-3.5 w-3.5 text-slate-500" />
          {connected} connected
        </span>

        <span className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-400 md:inline-flex">
          <Activity className="h-3.5 w-3.5 text-slate-500" />
          Last event {timeAgo(lastSync)}
        </span>

        <Button variant="primary" size="sm" icon={<FileDown className="h-3.5 w-3.5" />} onClick={onExport}>
          Status report
        </Button>
      </div>
    </header>
  );
}
