import { AppTab } from './types';
import { AppProvider, useApp } from './state/AppContext';
import { useCloudSync } from './hooks/useCloudSync';
import { Header } from './components/layout/Header';
import { MobileTabBar, Sidebar } from './components/layout/Sidebar';
import { Toasts } from './components/ui/Toasts';
import { DashboardView } from './views/DashboardView';
import { InsightsView } from './views/InsightsView';
import { IdeationView } from './views/IdeationView';
import { TicketsView } from './views/TicketsView';
import { IntegrationsView } from './views/IntegrationsView';

function Workspace() {
  const { state } = useApp();

  // The simulator only runs while the user can plausibly see its effects.
  useCloudSync(true);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTabBar />
        <Header />
        <main className="flex-1 overflow-x-hidden px-5 py-5 lg:px-8 lg:py-6">
          {state.activeTab === AppTab.DASHBOARD ? <DashboardView /> : null}
          {state.activeTab === AppTab.INSIGHTS ? <InsightsView /> : null}
          {state.activeTab === AppTab.IDEATION ? <IdeationView /> : null}
          {state.activeTab === AppTab.TICKETS ? <TicketsView /> : null}
          {state.activeTab === AppTab.INTEGRATIONS ? <IntegrationsView /> : null}
        </main>
        <footer className="border-t border-slate-800/80 px-5 py-4 text-[11px] text-slate-600 lg:px-8">
          RoadmapAI — customer signal to shipped roadmap. Demo data is local to your browser.
        </footer>
      </div>
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Workspace />
    </AppProvider>
  );
}
