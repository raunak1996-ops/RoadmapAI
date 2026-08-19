import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import {
  AppTab,
  type AppState,
  type ChildItem,
  type FeatureIdea,
  type Integration,
  type IntegrationId,
  type InsightsData,
  type SyncEvent,
  type SyncSource,
  type Ticket,
  type TicketStatus,
  type Toast,
} from '../types';
import {
  SEED_IDEAS,
  SEED_INTEGRATIONS,
  SEED_ISSUES,
  SEED_TICKETS,
  TEAM,
} from '../data/seed';
import { addDays, riceScore, todayISO, uid } from '../lib/utils';

const STORAGE_KEY = 'roadmapai.state.v1';

const EFFORT_TO_DAYS: Record<number, number> = { 1: 7, 2: 21, 3: 42, 4: 70, 5: 112 };

function initialState(): AppState {
  return {
    activeTab: AppTab.DASHBOARD,
    issues: SEED_ISSUES,
    insights: null,
    ideas: SEED_IDEAS,
    tickets: SEED_TICKETS,
    integrations: SEED_INTEGRATIONS,
    syncFeed: [],
    syncEnabled: true,
    demoLoaded: true,
  };
}

/**
 * On a cleared workspace an empty array is the real value and must be kept.
 * Otherwise it means nothing was persisted for that slice yet, so the seed fills in.
 */
function restore<T>(saved: T[] | undefined, seed: T[], cleared: boolean): T[] {
  if (cleared) return saved ?? [];
  return saved?.length ? saved : seed;
}

/** Merges persisted state over the seed so a schema addition never wipes a session. */
function hydrate(): AppState {
  const base = initialState();
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<AppState>;
    const cleared = saved.demoLoaded === false;
    return {
      ...base,
      ...saved,
      // Never restore a tab that no longer exists.
      activeTab: Object.values(AppTab).includes(saved.activeTab as AppTab)
        ? (saved.activeTab as AppTab)
        : base.activeTab,
      demoLoaded: !cleared,
      issues: restore(saved.issues, base.issues, cleared),
      // Scores are derived, never authoritative: recomputing on load means a
      // change to the formula reaches workspaces saved under the old one.
      ideas: restore(saved.ideas, base.ideas, cleared).map((idea) => ({
        ...idea,
        score: riceScore(idea.reach, idea.impact, idea.effort, idea.confidence),
      })),
      tickets: restore(saved.tickets, base.tickets, cleared),
      integrations: restore(saved.integrations, base.integrations, false),
      syncFeed: saved.syncFeed ?? [],
    };
  } catch {
    return base;
  }
}

export type Action =
  | { type: 'SET_TAB'; tab: AppTab }
  | { type: 'SET_INSIGHTS'; insights: InsightsData }
  | { type: 'APPROVE_ISSUE'; id: string }
  | { type: 'APPROVE_ALL_ANALYZED' }
  | { type: 'ADD_IDEAS'; ideas: FeatureIdea[] }
  | { type: 'UPDATE_IDEA'; id: string; patch: Partial<FeatureIdea> }
  | { type: 'APPROVE_IDEA'; id: string }
  | { type: 'DELETE_IDEA'; id: string }
  | { type: 'SET_TICKET_STATUS'; id: string; status: TicketStatus }
  | { type: 'UPDATE_TICKET'; id: string; patch: Partial<Ticket> }
  | { type: 'CYCLE_CHILD'; ticketId: string; childId: string }
  | { type: 'ADD_CHILD'; ticketId: string; child: ChildItem }
  | { type: 'TOGGLE_INTEGRATION'; id: IntegrationId }
  | { type: 'SET_SYNC_ENABLED'; enabled: boolean }
  | { type: 'APPLY_SYNC'; event: SyncEvent }
  | { type: 'CLEAR_DATA' }
  | { type: 'RESET' };

function nextTicketId(tickets: Ticket[]): string {
  const numbers = tickets
    .map((t) => Number.parseInt(t.id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n));
  const next = (numbers.length ? Math.max(...numbers) : 100) + 1;
  return `TKT-${next}`;
}

function ticketFromIdea(idea: FeatureIdea, tickets: Ticket[]): Ticket {
  const start = todayISO();
  const span = EFFORT_TO_DAYS[idea.effort] ?? 42;
  const assignee = TEAM[tickets.length % TEAM.length];

  const children: ChildItem[] = [
    { id: uid('child'), title: 'Discovery + technical design', status: 'Todo', type: 'Story' },
    { id: uid('child'), title: 'Core implementation', status: 'Todo', type: 'Story' },
    { id: uid('child'), title: 'Instrumentation + rollout plan', status: 'Todo', type: 'Task' },
  ];

  return {
    id: nextTicketId(tickets),
    title: idea.title,
    type: idea.effort >= 4 ? 'Initiative' : 'Epic',
    status: 'Backlog',
    assignee,
    lastUpdate: new Date().toISOString(),
    startDate: start,
    endDate: addDays(start, span),
    description: idea.description,
    ideaId: idea.id,
    riceScore: idea.score,
    childItems: children,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };

    case 'SET_INSIGHTS':
      return {
        ...state,
        insights: action.insights,
        // Synthesis is what moves a raw signal to "Analyzed"; approval stays manual.
        issues: state.issues.map((issue) =>
          issue.status === 'New' ? { ...issue, status: 'Analyzed' } : issue,
        ),
      };

    case 'APPROVE_ISSUE':
      return {
        ...state,
        issues: state.issues.map((issue) =>
          issue.id === action.id ? { ...issue, status: 'Approved' } : issue,
        ),
      };

    case 'APPROVE_ALL_ANALYZED':
      return {
        ...state,
        issues: state.issues.map((issue) =>
          issue.status === 'Analyzed' ? { ...issue, status: 'Approved' } : issue,
        ),
      };

    case 'ADD_IDEAS':
      return { ...state, ideas: [...action.ideas, ...state.ideas] };

    case 'UPDATE_IDEA': {
      const ideas = state.ideas.map((idea) => {
        if (idea.id !== action.id) return idea;
        const merged = { ...idea, ...action.patch };
        return {
    ...merged,
    score: riceScore(merged.reach, merged.impact, merged.effort, merged.confidence),
  };
      });
      return { ...state, ideas };
    }

    case 'DELETE_IDEA':
      return { ...state, ideas: state.ideas.filter((idea) => idea.id !== action.id) };

    case 'APPROVE_IDEA': {
      const idea = state.ideas.find((i) => i.id === action.id);
      if (!idea || idea.status === 'Approved') return state;
      return {
        ...state,
        ideas: state.ideas.map((i) => (i.id === action.id ? { ...i, status: 'Approved' } : i)),
        tickets: [ticketFromIdea(idea, state.tickets), ...state.tickets],
      };
    }

    case 'SET_TICKET_STATUS':
      return {
        ...state,
        tickets: state.tickets.map((ticket) =>
          ticket.id === action.id
            ? {
                ...ticket,
                status: action.status,
                lastUpdate: new Date().toISOString(),
                updatedBy: undefined,
                recentActivity: `Moved to ${action.status}`,
              }
            : ticket,
        ),
      };

    case 'UPDATE_TICKET':
      return {
        ...state,
        tickets: state.tickets.map((ticket) =>
          ticket.id === action.id
            ? { ...ticket, ...action.patch, lastUpdate: new Date().toISOString() }
            : ticket,
        ),
      };

    case 'CYCLE_CHILD': {
      const order: ChildItem['status'][] = ['Todo', 'In Progress', 'Done'];
      return {
        ...state,
        tickets: state.tickets.map((ticket) => {
          if (ticket.id !== action.ticketId) return ticket;
          return {
            ...ticket,
            lastUpdate: new Date().toISOString(),
            childItems: (ticket.childItems ?? []).map((child) =>
              child.id === action.childId
                ? { ...child, status: order[(order.indexOf(child.status) + 1) % order.length] }
                : child,
            ),
          };
        }),
      };
    }

    case 'ADD_CHILD':
      return {
        ...state,
        tickets: state.tickets.map((ticket) =>
          ticket.id === action.ticketId
            ? {
                ...ticket,
                lastUpdate: new Date().toISOString(),
                childItems: [...(ticket.childItems ?? []), action.child],
              }
            : ticket,
        ),
      };

    case 'TOGGLE_INTEGRATION':
      return {
        ...state,
        integrations: state.integrations.map((integration): Integration =>
          integration.id === action.id
            ? {
                ...integration,
                connected: !integration.connected,
                lastSync: !integration.connected ? new Date().toISOString() : integration.lastSync,
              }
            : integration,
        ),
      };

    case 'SET_SYNC_ENABLED':
      return { ...state, syncEnabled: action.enabled };

    case 'APPLY_SYNC':
      return {
        ...state,
        syncFeed: [action.event, ...state.syncFeed].slice(0, 40),
        tickets: state.tickets.map((ticket) =>
          ticket.id === action.event.ticketId
            ? {
                ...ticket,
                recentActivity: action.event.message,
                updatedBy: action.event.source,
                lastUpdate: action.event.at,
              }
            : ticket,
        ),
      };

    case 'CLEAR_DATA':
      return {
        ...state,
        demoLoaded: false,
        issues: [],
        insights: null,
        ideas: [],
        tickets: [],
        syncFeed: [],
        // The integration catalog is app configuration rather than workspace
        // data, so the cards stay and only the demo's connections are dropped.
        integrations: state.integrations.map((integration) => ({
          ...integration,
          connected: false,
          lastSync: undefined,
        })),
      };

    case 'RESET':
      // Keeps the current tab so restored data appears where the reader already is.
      return { ...initialState(), activeTab: state.activeTab };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  /** Ticket ids that just received a sync event — drives the pulse highlight. */
  pulsedTicketIds: string[];
  pulseTicket: (id: string) => void;
  applySyncEvent: (ticketId: string, source: SyncSource, message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pulsedTicketIds, setPulsedTicketIds] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode, quota) — the app still works.
    }
  }, [state]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = uid('toast');
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      const timer = window.setTimeout(() => dismissToast(id), 5200);
      timers.current.push(timer);
    },
    [dismissToast],
  );

  const pulseTicket = useCallback((id: string) => {
    setPulsedTicketIds((current) => (current.includes(id) ? current : [...current, id]));
    const timer = window.setTimeout(() => {
      setPulsedTicketIds((current) => current.filter((ticketId) => ticketId !== id));
    }, 4200);
    timers.current.push(timer);
  }, []);

  const applySyncEvent = useCallback(
    (ticketId: string, source: SyncSource, message: string) => {
      dispatch({
        type: 'APPLY_SYNC',
        event: { id: uid('sync'), ticketId, source, message, at: new Date().toISOString() },
      });
      pulseTicket(ticketId);
    },
    [pulseTicket],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      toasts,
      pushToast,
      dismissToast,
      pulsedTicketIds,
      pulseTicket,
      applySyncEvent,
    }),
    [state, toasts, pushToast, dismissToast, pulsedTicketIds, pulseTicket, applySyncEvent],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}
