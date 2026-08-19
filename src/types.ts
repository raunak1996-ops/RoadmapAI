/**
 * Domain model for RoadmapAI.
 *
 * The flow is intentionally linear: CustomerIssue -> InsightsData -> FeatureIdea
 * -> Ticket. Each stage is gated by an explicit human approval so the AI never
 * silently pushes work onto the roadmap.
 */

export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  INSIGHTS = 'INSIGHTS',
  IDEATION = 'IDEATION',
  TICKETS = 'TICKETS',
  INTEGRATIONS = 'INTEGRATIONS',
}

export type IssueSource = 'CRM' | 'Zoom' | 'Sales';
export type IssueStatus = 'New' | 'Analyzed' | 'Approved';

export interface CustomerIssue {
  id: string;
  source: IssueSource;
  theme: string;
  /** Weighted pain score, 1-100. */
  intensity: number;
  description: string;
  status: IssueStatus;
  /** Optional provenance shown in the feed. */
  account?: string;
  arr?: number;
  capturedAt?: string;
}

export type IdeaStatus = 'Draft' | 'Approved';

export interface FeatureIdea {
  id: string;
  title: string;
  description: string;
  /** Why the AI believes this is worth building. */
  reasoning: string;
  /** Comparable bets this company has already shipped, and how they landed. */
  historicalContext: string;
  reach: number;
  /** 1: Low, 2: Med, 3: High */
  impact: number;
  /** 1: S, 2: M, 3: L, 4: XL, 5: XXL */
  effort: number;
  /** (reach * impact) / effort */
  score: number;
  status: IdeaStatus;
  relatedIssueIds: string[];
  /** Populated by the two-step RICE estimator. */
  reachRationale?: string;
  impactRationale?: string;
  effortRationale?: string;
  confidence?: number;
  createdAt?: string;
}

export type ChildStatus = 'Todo' | 'In Progress' | 'Done';
export type ChildType = 'Epic' | 'Story' | 'Task';

export interface ChildItem {
  id: string;
  title: string;
  status: ChildStatus;
  type: ChildType;
}

export type TicketStatus = 'Backlog' | 'Todo' | 'In Progress' | 'Done';
export type TicketType = 'Initiative' | 'Epic';
export type SyncSource = 'GitHub' | 'Slack';

export interface Ticket {
  id: string;
  title: string;
  type: TicketType;
  status: TicketStatus;
  assignee: string;
  /** ISO timestamp of the last change, from a human or a synced service. */
  lastUpdate: string;
  recentActivity?: string;
  updatedBy?: SyncSource;
  /** ISO date (yyyy-mm-dd) — drives the timeline / Gantt view. */
  startDate: string;
  endDate: string;
  childItems?: ChildItem[];
  description?: string;
  ideaId?: string;
  riceScore?: number;
}

export interface InsightsData {
  summary: string;
  topThemes: { theme: string; count: number; intensity: number }[];
  /** Optional extras the synthesis produces; the UI degrades if absent. */
  risks?: string[];
  recommendations?: string[];
  generatedAt?: string;
  generatedBy?: 'gemini' | 'local';
}

export type IntegrationId =
  | 'github'
  | 'slack'
  | 'salesforce'
  | 'zoom'
  | 'gong'
  | 'intercom';

export interface Integration {
  id: IntegrationId;
  name: string;
  category: 'Engineering' | 'Communication' | 'Revenue' | 'Support';
  description: string;
  connected: boolean;
  /** What RoadmapAI pulls in or pushes out once connected. */
  capabilities: string[];
  lastSync?: string;
  accent: string;
}

/** A single simulated cloud event (a GitHub commit, a Slack standup note). */
export interface SyncEvent {
  id: string;
  ticketId: string;
  source: SyncSource;
  message: string;
  at: string;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

/** Past bets, fed to the model as company-specific grounding. */
export interface HistoricalBenchmark {
  id: string;
  feature: string;
  shippedQuarter: string;
  effortWeeks: number;
  adoption: number;
  outcome: string;
}

export interface AppState {
  activeTab: AppTab;
  issues: CustomerIssue[];
  insights: InsightsData | null;
  ideas: FeatureIdea[];
  tickets: Ticket[];
  integrations: Integration[];
  syncFeed: SyncEvent[];
  syncEnabled: boolean;
}
