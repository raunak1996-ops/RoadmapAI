import { useMemo, useState } from 'react';
import {
  Activity,
  FileDown,
  CalendarRange,
  GitBranch,
  Columns3,
  MessageSquare,
  Pause,
  Play,
  Zap,
} from 'lucide-react';
import type { Ticket, TicketStatus } from '../types';
import { useApp } from '../state/AppContext';
import { KanbanBoard } from '../components/tickets/KanbanBoard';
import { TimelineView } from '../components/tickets/TimelineView';
import { TicketDrawer } from '../components/tickets/TicketDrawer';
import { Button, Card, Stat } from '../components/ui/Primitives';
import { generateStatusReport } from '../services/pdfService';
import { SYNC_MESSAGES } from '../data/seed';
import { cn, pickOne, ticketProgress, timeAgo } from '../lib/utils';

type BoardMode = 'kanban' | 'timeline';

export function TicketsView() {
  const { state, dispatch, pushToast, pulsedTicketIds, applySyncEvent } = useApp();
  const [mode, setMode] = useState<BoardMode>('kanban');
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const openTicket = useMemo(
    () => state.tickets.find((ticket) => ticket.id === openTicketId) ?? null,
    [state.tickets, openTicketId],
  );

  const inFlight = state.tickets.filter((t) => t.status === 'In Progress');
  const shipped = state.tickets.filter((t) => t.status === 'Done');
  const avgProgress = state.tickets.length
    ? Math.round(
        state.tickets.reduce((sum, t) => sum + ticketProgress(t), 0) / state.tickets.length,
      )
    : 0;

  const move = (id: string, status: TicketStatus) => {
    dispatch({ type: 'SET_TICKET_STATUS', id, status });
    pushToast({ title: `${id} → ${status}`, tone: 'info' });
  };

  /** Manual trigger so the sync behaviour is demonstrable without waiting. */
  const forceSync = () => {
    const candidates = state.tickets.filter(
      (t) => t.status === 'In Progress' || t.status === 'Todo',
    );
    if (candidates.length === 0) {
      pushToast({
        title: 'Nothing to sync',
        description: 'Move a ticket into Todo or In Progress first.',
        tone: 'warning',
      });
      return;
    }
    const ticket = pickOne(candidates);
    const source = state.integrations.find((i) => i.id === 'github')?.connected ? 'GitHub' : 'Slack';
    const message = pickOne(SYNC_MESSAGES[source])
      .replace('{n}', String(400 + Math.floor(Math.random() * 180)))
      .replace('{sha}', Math.random().toString(16).slice(2, 9))
      .replace('{slug}', ticket.title.toLowerCase().split(' ').slice(0, 3).join('-'))
      .replace('{title}', ticket.title)
      .replace('{assignee}', ticket.assignee.split(' ')[0]);

    applySyncEvent(ticket.id, source, message);
    pushToast({ title: `${source} update on ${ticket.id}`, description: message, tone: 'info' });
  };

  const exportReport = async () => {
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
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Tickets" value={state.tickets.length} hint="Initiatives and epics" />
        <Stat label="In flight" value={inFlight.length} hint="Actively being delivered" tone="warning" />
        <Stat label="Shipped" value={shipped.length} hint="Marked Done" tone="positive" />
        <Stat label="Avg progress" value={`${avgProgress}%`} hint="Across the whole board" />
      </div>

      <Card padded={false} className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-950/60 p-1 ring-1 ring-inset ring-slate-800">
            {(
              [
                ['kanban', 'Kanban board', Columns3],
                ['timeline', 'Timeline', CalendarRange],
              ] as Array<[BoardMode, string, typeof Columns3]>
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                  mode === value
                    ? 'bg-indigo-500/20 text-indigo-200'
                    : 'text-slate-400 hover:text-slate-200',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              icon={
                state.syncEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />
              }
              onClick={() => dispatch({ type: 'SET_SYNC_ENABLED', enabled: !state.syncEnabled })}
            >
              {state.syncEnabled ? 'Pause sync' : 'Resume sync'}
            </Button>
            <Button size="sm" icon={<Zap className="h-3.5 w-3.5" />} onClick={forceSync}>
              Sync now
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<FileDown className="h-3.5 w-3.5" />}
              onClick={exportReport}
            >
              PDF status report
            </Button>
          </div>
        </div>
      </Card>

      {mode === 'kanban' ? (
        <KanbanBoard
          tickets={state.tickets}
          pulsedIds={pulsedTicketIds}
          onOpen={(ticket: Ticket) => setOpenTicketId(ticket.id)}
          onMove={move}
        />
      ) : (
        <TimelineView
          tickets={state.tickets}
          pulsedIds={pulsedTicketIds}
          onOpen={(ticket: Ticket) => setOpenTicketId(ticket.id)}
        />
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Activity className="h-4 w-4 text-cyan-300" />
            Cloud sync feed
          </h3>
          <span className="text-[11px] text-slate-500">
            {state.syncEnabled ? 'Polling connected tools every 9s' : 'Paused'}
          </span>
        </div>

        {state.syncFeed.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-xs text-slate-500">
            No events yet. Sync events land here and pulse the matching card on the board.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {state.syncFeed.slice(0, 12).map((event) => (
              <li key={event.id} className="flex items-start gap-3 py-2.5">
                {event.source === 'GitHub' ? (
                  <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                ) : (
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300">{event.message}</p>
                  <button
                    type="button"
                    onClick={() => setOpenTicketId(event.ticketId)}
                    className="text-[10px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
                  >
                    {event.ticketId} · {event.source} · {timeAgo(event.at)}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <TicketDrawer
        ticket={openTicket}
        events={state.syncFeed}
        onClose={() => setOpenTicketId(null)}
        onStatusChange={move}
        onCycleChild={(ticketId, childId) => dispatch({ type: 'CYCLE_CHILD', ticketId, childId })}
        onAddChild={(ticketId, child) => dispatch({ type: 'ADD_CHILD', ticketId, child })}
      />
    </div>
  );
}
