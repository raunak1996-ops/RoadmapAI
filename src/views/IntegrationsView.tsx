import {
  Building2,
  CheckCircle2,
  Code2,
  Headphones,
  MessageSquare,
  Plug,
  ShieldCheck,
  Video,
  Waves,
} from 'lucide-react';
import type { Integration, IntegrationId } from '../types';
import { useApp } from '../state/AppContext';
import { Badge, Button, Card, CardHeader, Stat } from '../components/ui/Primitives';
import { cn, timeAgo } from '../lib/utils';

const ICONS: Record<IntegrationId, typeof Plug> = {
  github: Code2,
  slack: MessageSquare,
  salesforce: Building2,
  zoom: Video,
  gong: Waves,
  intercom: Headphones,
};

const FLOW = [
  {
    title: 'Ingest',
    detail: 'Salesforce, Zoom, Gong and Intercom feed raw customer signal into the intelligence feed.',
    ids: ['salesforce', 'zoom', 'gong', 'intercom'] as IntegrationId[],
  },
  {
    title: 'Synthesize',
    detail: 'RoadmapAI consolidates themes, scores RICE, and produces the roadmap.',
    ids: [] as IntegrationId[],
  },
  {
    title: 'Execute',
    detail: 'GitHub and Slack push execution activity back onto the board in near real time.',
    ids: ['github', 'slack'] as IntegrationId[],
  },
];

export function IntegrationsView() {
  const { state, dispatch, pushToast } = useApp();
  const connected = state.integrations.filter((i) => i.connected);

  const toggle = (integration: Integration) => {
    dispatch({ type: 'TOGGLE_INTEGRATION', id: integration.id });
    pushToast({
      title: integration.connected
        ? `${integration.name} disconnected`
        : `${integration.name} connected`,
      description: integration.connected
        ? 'Its data will stop flowing into RoadmapAI.'
        : 'Initial sync queued.',
      tone: integration.connected ? 'warning' : 'success',
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Connected" value={connected.length} hint={`${state.integrations.length} available`} tone="positive" />
        <Stat
          label="Ingest sources"
          value={connected.filter((i) => ['salesforce', 'zoom', 'gong', 'intercom'].includes(i.id)).length}
          hint="Feeding the signal feed"
        />
        <Stat
          label="Execution links"
          value={connected.filter((i) => ['github', 'slack'].includes(i.id)).length}
          hint="Pushing activity to the board"
        />
        <Stat label="Sync events" value={state.syncFeed.length} hint="Received this session" />
      </div>

      <Card>
        <CardHeader
          title="How the stack fits together"
          subtitle="Disconnecting a tool visibly changes what RoadmapAI can do"
          icon={<Plug className="h-4 w-4" />}
        />
        <div className="grid gap-3 md:grid-cols-3">
          {FLOW.map((stage, index) => (
            <div
              key={stage.title}
              className="relative rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/70">
                Step {index + 1}
              </span>
              <h4 className="mt-1 text-sm font-semibold text-slate-100">{stage.title}</h4>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{stage.detail}</p>
              {stage.ids.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {stage.ids.map((id) => {
                    const integration = state.integrations.find((i) => i.id === id);
                    if (!integration) return null;
                    return (
                      <Badge
                        key={id}
                        className={
                          integration.connected
                            ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                            : 'bg-slate-800/70 text-slate-500 ring-slate-700'
                        }
                      >
                        {integration.name}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <Badge className="mt-3 bg-indigo-500/10 text-indigo-300 ring-indigo-500/30">
                  RoadmapAI core
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.integrations.map((integration) => {
          const Icon = ICONS[integration.id];
          return (
            <Card
              key={integration.id}
              className={cn(
                'flex flex-col transition-colors',
                integration.connected ? 'border-slate-700/80' : 'border-slate-800/60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-inset"
                    style={{
                      backgroundColor: `${integration.accent}1a`,
                      color: integration.accent,
                      boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.08)',
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{integration.name}</h3>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      {integration.category}
                    </p>
                  </div>
                </div>
                {integration.connected ? (
                  <Badge className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge className="bg-slate-800/70 text-slate-500 ring-slate-700">Not connected</Badge>
                )}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-400">{integration.description}</p>

              <ul className="mt-3 space-y-1.5">
                {integration.capabilities.map((capability) => (
                  <li key={capability} className="flex items-center gap-2 text-[11px] text-slate-500">
                    <ShieldCheck
                      className={cn(
                        'h-3 w-3 shrink-0',
                        integration.connected ? 'text-emerald-400/70' : 'text-slate-700',
                      )}
                    />
                    {capability}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-800/70 pt-4">
                <span className="text-[10px] text-slate-500">
                  {integration.connected ? `Last sync ${timeAgo(integration.lastSync)}` : 'Never synced'}
                </span>
                <Button
                  size="sm"
                  variant={integration.connected ? 'ghost' : 'primary'}
                  onClick={() => toggle(integration)}
                >
                  {integration.connected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Connections in this build are simulated: toggling GitHub or Slack changes which sources the
          activity simulator is allowed to emit, and disconnecting both stops the board from updating.
          Swapping the simulator for real OAuth clients is a change confined to{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">src/hooks/useCloudSync.ts</code>.
        </p>
      </Card>
    </div>
  );
}
