import {
  LayoutDashboard,
  Lightbulb,
  Plug,
  Radar,
  Columns3,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { AppTab } from '../../types';
import { useApp } from '../../state/AppContext';
import { cn } from '../../lib/utils';
import { isAiEnabled, MODEL } from '../../services/geminiClient';

const NAV: Array<{
  tab: AppTab;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
}> = [
  { tab: AppTab.DASHBOARD, label: 'Overview', hint: 'Portfolio health', icon: LayoutDashboard },
  { tab: AppTab.INSIGHTS, label: 'Insights', hint: 'Customer intelligence', icon: Radar },
  { tab: AppTab.IDEATION, label: 'Ideation', hint: 'RICE-scored bets', icon: Lightbulb },
  { tab: AppTab.TICKETS, label: 'Roadmap', hint: 'Tickets & execution', icon: Columns3 },
  { tab: AppTab.INTEGRATIONS, label: 'Connect', hint: 'Product stack', icon: Plug },
];

export function Sidebar() {
  const { state, dispatch, pushToast } = useApp();

  const counts: Record<AppTab, number> = {
    [AppTab.DASHBOARD]: 0,
    [AppTab.INSIGHTS]: state.issues.filter((i) => i.status !== 'Approved').length,
    [AppTab.IDEATION]: state.ideas.filter((i) => i.status === 'Draft').length,
    [AppTab.TICKETS]: state.tickets.filter((t) => t.status === 'In Progress').length,
    [AppTab.INTEGRATIONS]: state.integrations.filter((i) => i.connected).length,
  };

  const onReset = () => {
    if (!window.confirm('Reset RoadmapAI to the seeded demo data? This clears local changes.')) return;
    dispatch({ type: 'RESET' });
    pushToast({ title: 'Workspace reset', description: 'Seed data restored.', tone: 'success' });
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/60 px-4 py-5 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/15 ring-1 ring-inset ring-indigo-500/30">
          <Sparkles className="h-4 w-4 text-indigo-300" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-100">RoadmapAI</p>
          <p className="text-[11px] text-slate-500">Customer intelligence</p>
        </div>
      </div>

      <nav className="mt-7 flex flex-1 flex-col gap-1">
        {NAV.map(({ tab, label, hint, icon: Icon }) => {
          const active = state.activeTab === tab;
          const count = counts[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => dispatch({ type: 'SET_TAB', tab })}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                active
                  ? 'bg-indigo-500/10 text-slate-100 ring-1 ring-inset ring-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200',
              )}
            >
              <Icon
                className={cn('h-4 w-4 shrink-0', active ? 'text-indigo-300' : 'text-slate-500')}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block truncate text-[11px] text-slate-500">{hint}</span>
              </span>
              {count > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    active ? 'bg-indigo-500/20 text-indigo-200' : 'bg-slate-800 text-slate-400',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-[11px] font-semibold text-slate-300">
          {isAiEnabled() ? 'Gemini connected' : 'Demo mode'}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          {isAiEnabled()
            ? `Live synthesis via ${MODEL}.`
            : 'Running deterministic local synthesis. Add VITE_GEMINI_API_KEY for live generation.'}
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-slate-500 transition-colors hover:bg-slate-900 hover:text-slate-300"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset demo data
      </button>
    </aside>
  );
}

export function MobileTabBar() {
  const { state, dispatch } = useApp();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-800/80 bg-slate-950/80 px-3 py-2 lg:hidden">
      {NAV.map(({ tab, label, icon: Icon }) => {
        const active = state.activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => dispatch({ type: 'SET_TAB', tab })}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              active ? 'bg-indigo-500/15 text-indigo-200' : 'text-slate-400 hover:bg-slate-900',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
