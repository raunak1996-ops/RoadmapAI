import type {
  CustomerIssue,
  FeatureIdea,
  HistoricalBenchmark,
  Integration,
  Ticket,
} from '../types';
import { addDays, riceScore, todayISO } from '../lib/utils';

const today = todayISO();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export const SEED_ISSUES: CustomerIssue[] = [
  {
    id: 'iss-001',
    source: 'CRM',
    theme: 'Bulk data export times out',
    intensity: 92,
    description:
      'Northwind Logistics has filed four tickets this month: exports above 50k rows time out at the 60s gateway limit. Their ops team is manually paginating the API as a workaround.',
    status: 'New',
    account: 'Northwind Logistics',
    arr: 420_000,
    capturedAt: hoursAgo(6),
  },
  {
    id: 'iss-002',
    source: 'Zoom',
    theme: 'No SSO / SCIM provisioning',
    intensity: 88,
    description:
      'QBR recording: their IT director said SOC 2 renewal requires SCIM deprovisioning within 24h of offboarding. Manual seat removal is currently a compliance finding.',
    status: 'New',
    account: 'Vertex Health',
    arr: 610_000,
    capturedAt: hoursAgo(20),
  },
  {
    id: 'iss-003',
    source: 'Sales',
    theme: 'Lost deal — missing Salesforce sync',
    intensity: 85,
    description:
      'Competitive loss note: prospect chose an alternative because bi-directional Salesforce sync was table stakes for their RevOps team. Third loss this quarter with the same reason code.',
    status: 'New',
    account: 'Helios Group (prospect)',
    arr: 250_000,
    capturedAt: hoursAgo(30),
  },
  {
    id: 'iss-004',
    source: 'CRM',
    theme: 'Dashboard load latency over 8s',
    intensity: 78,
    description:
      'Enterprise workspaces with 200+ boards report 8-12s initial dashboard render. Support has 23 open tickets tagged performance across 9 accounts.',
    status: 'New',
    account: 'Multiple (9 accounts)',
    arr: 1_240_000,
    capturedAt: hoursAgo(44),
  },
  {
    id: 'iss-005',
    source: 'Zoom',
    theme: 'Onboarding confusion for new admins',
    intensity: 71,
    description:
      'Three onboarding calls in a row stalled at workspace setup. New admins cannot find where to invite teams and default permissions are not explained anywhere in-product.',
    status: 'New',
    account: 'Brightline Media',
    arr: 95_000,
    capturedAt: hoursAgo(52),
  },
  {
    id: 'iss-006',
    source: 'Sales',
    theme: 'Custom reporting requested in every enterprise deal',
    intensity: 83,
    description:
      'Seven of the last nine enterprise opportunities asked for scheduled custom reports delivered to email or Slack. Currently answered with a services workaround.',
    status: 'New',
    account: 'Enterprise pipeline',
    arr: 2_100_000,
    capturedAt: hoursAgo(60),
  },
  {
    id: 'iss-007',
    source: 'CRM',
    theme: 'Webhook delivery failures silently dropped',
    intensity: 76,
    description:
      'When a customer endpoint 500s we retry three times then drop the event with no notification. Two customers discovered days-old data gaps only after reconciliation.',
    status: 'New',
    account: 'Ardent Fintech',
    arr: 380_000,
    capturedAt: hoursAgo(72),
  },
  {
    id: 'iss-008',
    source: 'Zoom',
    theme: 'Mobile experience unusable for approvals',
    intensity: 64,
    description:
      'Field managers want to approve requests from a phone. The approval drawer is not responsive below 480px and the primary action scrolls off-screen.',
    status: 'New',
    account: 'Cascade Utilities',
    arr: 175_000,
    capturedAt: hoursAgo(80),
  },
  {
    id: 'iss-009',
    source: 'Sales',
    theme: 'Granular role permissions blocking expansion',
    intensity: 81,
    description:
      'Expansion from 40 to 300 seats is blocked: they need view-only and department-scoped roles before rolling out beyond the pilot team.',
    status: 'New',
    account: 'Meridian Bank',
    arr: 520_000,
    capturedAt: hoursAgo(96),
  },
  {
    id: 'iss-010',
    source: 'CRM',
    theme: 'Audit log retention too short',
    intensity: 58,
    description:
      'Audit events are retained 30 days; regulated customers need 12 months exportable to their SIEM.',
    status: 'New',
    account: 'Meridian Bank',
    arr: 520_000,
    capturedAt: hoursAgo(110),
  },
  {
    id: 'iss-011',
    source: 'Zoom',
    theme: 'API rate limits hit during nightly sync',
    intensity: 69,
    description:
      'Their nightly ETL saturates the 600 req/min limit and fails halfway. They asked for either burst capacity or a bulk endpoint.',
    status: 'New',
    account: 'Northwind Logistics',
    arr: 420_000,
    capturedAt: hoursAgo(130),
  },
  {
    id: 'iss-012',
    source: 'Sales',
    theme: 'No usage analytics for their own end users',
    intensity: 62,
    description:
      'Buyers keep asking how they will prove internal adoption to their exec sponsor. There is no per-team usage view to hand them at renewal.',
    status: 'New',
    account: 'Renewal cohort Q3',
    arr: 890_000,
    capturedAt: hoursAgo(150),
  },
  {
    id: 'iss-013',
    source: 'CRM',
    theme: 'Duplicate notifications after import',
    intensity: 47,
    description:
      'Large CSV imports fan out one notification per row instead of a single digest. One customer received 1,400 emails in ten minutes.',
    status: 'New',
    account: 'Brightline Media',
    arr: 95_000,
    capturedAt: hoursAgo(170),
  },
  {
    id: 'iss-014',
    source: 'Zoom',
    theme: 'Intercom conversations not linked to accounts',
    intensity: 54,
    description:
      'Support cannot see which workspace a chat came from, so escalations lose 10-15 minutes to identification on every enterprise ticket.',
    status: 'New',
    account: 'Internal — Support',
    arr: 0,
    capturedAt: hoursAgo(190),
  },
];

/**
 * Past bets with measured outcomes. These are fed to the model as grounding so
 * generated ideas cite what this company has actually learned, not generic
 * product advice.
 */
export const HISTORICAL_BENCHMARKS: HistoricalBenchmark[] = [
  {
    id: 'hist-1',
    feature: 'Async CSV export pipeline (v1)',
    shippedQuarter: 'Q2 2024',
    effortWeeks: 5,
    adoption: 64,
    outcome:
      'Cut export support tickets 71% in the first month; the same async job pattern was reused twice since.',
  },
  {
    id: 'hist-2',
    feature: 'SAML SSO for enterprise tier',
    shippedQuarter: 'Q4 2024',
    effortWeeks: 8,
    adoption: 38,
    outcome:
      'Unblocked $1.4M of pipeline within two quarters, but adoption lagged because SCIM was descoped late.',
  },
  {
    id: 'hist-3',
    feature: 'Real-time collaboration presence',
    shippedQuarter: 'Q1 2025',
    effortWeeks: 12,
    adoption: 22,
    outcome:
      'Demoed well and shipped on time, yet weekly usage stayed under a quarter of DAU. Our clearest example of low-signal enthusiasm.',
  },
  {
    id: 'hist-4',
    feature: 'Scheduled report emails (beta)',
    shippedQuarter: 'Q2 2025',
    effortWeeks: 3,
    adoption: 57,
    outcome:
      'Small scope, outsized retention effect: accounts with a schedule renewed 11pts higher than the cohort average.',
  },
  {
    id: 'hist-5',
    feature: 'Dashboard query caching layer',
    shippedQuarter: 'Q3 2025',
    effortWeeks: 6,
    adoption: 100,
    outcome:
      'P95 render dropped 4.1s to 1.3s for mid-size workspaces; largest workspaces were not covered and still complain.',
  },
];

const draft = (
  idea: Omit<FeatureIdea, 'score' | 'status'> & Partial<Pick<FeatureIdea, 'status'>>,
): FeatureIdea => ({
  ...idea,
  status: idea.status ?? 'Draft',
  score: riceScore(idea.reach, idea.impact, idea.effort, idea.confidence),
});

export const SEED_IDEAS: FeatureIdea[] = [
  draft({
    id: 'idea-001',
    title: 'Streaming bulk export with resumable jobs',
    description:
      'Replace the synchronous export path with a queued job that streams to object storage, emails a signed link on completion, and resumes from the last committed chunk after a failure.',
    reasoning:
      'The two highest-intensity CRM issues and the nightly-sync rate-limit complaint all resolve to the same root cause: no durable long-running job primitive. One build clears three reported pains across $840K of ARR.',
    historicalContext:
      'Our Q2 2024 async CSV export cut export tickets 71% for a 5-week build — the strongest ticket-deflection-per-week result we have shipped. This extends that same pipeline rather than starting from scratch.',
    reach: 62,
    impact: 3,
    effort: 3,
    relatedIssueIds: ['iss-001', 'iss-011'],
    reachRationale: '62% of enterprise workspaces ran at least one export over 10k rows last quarter.',
    impactRationale: 'Removes an active compliance-adjacent workaround for the two largest accounts.',
    effortRationale: 'Reuses the existing job runner; new work is chunk checkpointing and signed URLs.',
    confidence: 0.8,
    createdAt: hoursAgo(28),
  }),
  draft({
    id: 'idea-002',
    title: 'SCIM provisioning and deprovisioning',
    description:
      'Ship SCIM 2.0 user and group provisioning on top of the existing SAML integration, with 24h deprovisioning SLAs and an admin audit trail per sync.',
    reasoning:
      'SSO alone left the offboarding gap open, which is now a named compliance finding at Vertex Health and a stated blocker on the Meridian expansion.',
    historicalContext:
      'Q4 2024 SAML SSO unblocked $1.4M of pipeline but landed at only 38% adoption precisely because SCIM was descoped. This is the deferred half of that bet.',
    reach: 34,
    impact: 3,
    effort: 3,
    relatedIssueIds: ['iss-002', 'iss-009'],
    confidence: 0.75,
    createdAt: hoursAgo(28),
  }),
  draft({
    id: 'idea-003',
    title: 'Bi-directional Salesforce sync',
    description:
      'Field-level bi-directional sync with conflict resolution, a mapping UI, and a replay log for failed records.',
    reasoning:
      'Three competitive losses this quarter carry the same reason code. RevOps treats this as table stakes rather than a differentiator, so the cost of not having it is deal exclusion.',
    historicalContext:
      'No direct precedent. Our closest analogue is the webhook subsystem, which took 40% longer than estimated once retry semantics were designed properly — expect the same tax here.',
    reach: 45,
    impact: 3,
    effort: 4,
    relatedIssueIds: ['iss-003'],
    confidence: 0.6,
    createdAt: hoursAgo(28),
  }),
];

export const SEED_TICKETS: Ticket[] = [
  {
    id: 'TKT-101',
    title: 'Enterprise performance program',
    type: 'Initiative',
    status: 'In Progress',
    assignee: 'Priya Raman',
    lastUpdate: hoursAgo(2),
    recentActivity: 'Merged PR #482 — cache warm-up for 200+ board workspaces',
    updatedBy: 'GitHub',
    startDate: addDays(today, -28),
    endDate: addDays(today, 26),
    riceScore: 46.8,
    description:
      'Bring P95 dashboard render under 2s for the largest workspaces, closing the gap left by the Q3 caching layer.',
    childItems: [
      { id: 'c-101-1', title: 'Profile render path for 200+ board workspaces', status: 'Done', type: 'Story' },
      { id: 'c-101-2', title: 'Incremental board hydration', status: 'In Progress', type: 'Story' },
      { id: 'c-101-3', title: 'Cache warm-up on workspace open', status: 'In Progress', type: 'Task' },
      { id: 'c-101-4', title: 'Perf regression budget in CI', status: 'Todo', type: 'Task' },
    ],
  },
  {
    id: 'TKT-102',
    title: 'Streaming bulk export with resumable jobs',
    type: 'Epic',
    status: 'In Progress',
    assignee: 'Diego Ferreira',
    lastUpdate: hoursAgo(5),
    recentActivity: 'Standup: chunk checkpointing behind a flag, staging soak starts Thursday',
    updatedBy: 'Slack',
    startDate: addDays(today, -12),
    endDate: addDays(today, 18),
    riceScore: 49.6,
    ideaId: 'idea-001',
    description:
      'Queued, resumable exports streamed to object storage with a signed download link.',
    childItems: [
      { id: 'c-102-1', title: 'Job queue + worker scaffolding', status: 'Done', type: 'Story' },
      { id: 'c-102-2', title: 'Chunked writer with checkpoints', status: 'In Progress', type: 'Story' },
      { id: 'c-102-3', title: 'Signed URL delivery + expiry', status: 'Todo', type: 'Task' },
      { id: 'c-102-4', title: 'Backfill migration for in-flight exports', status: 'Todo', type: 'Task' },
    ],
  },
  {
    id: 'TKT-103',
    title: 'SCIM provisioning and deprovisioning',
    type: 'Epic',
    status: 'Todo',
    assignee: 'Amara Okoye',
    lastUpdate: hoursAgo(26),
    startDate: addDays(today, 7),
    endDate: addDays(today, 49),
    riceScore: 27.2,
    ideaId: 'idea-002',
    description: 'SCIM 2.0 user and group sync layered on the existing SAML integration.',
    childItems: [
      { id: 'c-103-1', title: 'SCIM user endpoints', status: 'Todo', type: 'Story' },
      { id: 'c-103-2', title: 'Group + role mapping', status: 'Todo', type: 'Story' },
      { id: 'c-103-3', title: 'Deprovisioning SLA instrumentation', status: 'Todo', type: 'Task' },
    ],
  },
  {
    id: 'TKT-104',
    title: 'Webhook reliability and replay',
    type: 'Epic',
    status: 'Todo',
    assignee: 'Marcus Hale',
    lastUpdate: hoursAgo(40),
    startDate: addDays(today, 3),
    endDate: addDays(today, 31),
    riceScore: 33,
    description:
      'Exponential backoff, a dead-letter queue, admin-visible delivery logs, and manual replay.',
    childItems: [
      { id: 'c-104-1', title: 'Dead-letter queue', status: 'Todo', type: 'Story' },
      { id: 'c-104-2', title: 'Delivery log UI', status: 'Todo', type: 'Story' },
      { id: 'c-104-3', title: 'Alert on sustained failure', status: 'Todo', type: 'Task' },
    ],
  },
  {
    id: 'TKT-105',
    title: 'Scheduled custom reports GA',
    type: 'Initiative',
    status: 'Backlog',
    assignee: 'Priya Raman',
    lastUpdate: hoursAgo(60),
    startDate: addDays(today, 24),
    endDate: addDays(today, 66),
    riceScore: 39.6,
    description:
      'Take the scheduled-report beta to GA with custom columns, Slack delivery, and per-team scoping.',
    childItems: [
      { id: 'c-105-1', title: 'Report builder UI', status: 'Todo', type: 'Epic' },
      { id: 'c-105-2', title: 'Slack delivery target', status: 'Todo', type: 'Story' },
    ],
  },
  {
    id: 'TKT-106',
    title: 'Granular role-based permissions',
    type: 'Epic',
    status: 'Backlog',
    assignee: 'Amara Okoye',
    lastUpdate: hoursAgo(75),
    startDate: addDays(today, 35),
    endDate: addDays(today, 77),
    riceScore: 30.2,
    description: 'View-only and department-scoped roles, required before the Meridian rollout.',
    childItems: [
      { id: 'c-106-1', title: 'Role model + migration', status: 'Todo', type: 'Story' },
      { id: 'c-106-2', title: 'Permission matrix admin UI', status: 'Todo', type: 'Story' },
    ],
  },
  {
    id: 'TKT-107',
    title: 'Admin onboarding checklist',
    type: 'Epic',
    status: 'Done',
    assignee: 'Sofia Lindqvist',
    lastUpdate: hoursAgo(120),
    recentActivity: 'Released v2.14 — checklist completion at 61% of new workspaces',
    updatedBy: 'GitHub',
    startDate: addDays(today, -56),
    endDate: addDays(today, -14),
    riceScore: 22.8,
    description: 'In-product setup checklist covering invites, permissions, and first board.',
    childItems: [
      { id: 'c-107-1', title: 'Checklist component', status: 'Done', type: 'Story' },
      { id: 'c-107-2', title: 'Progress persistence', status: 'Done', type: 'Task' },
      { id: 'c-107-3', title: 'Activation analytics', status: 'Done', type: 'Task' },
    ],
  },
  {
    id: 'TKT-108',
    title: 'Dashboard query caching layer',
    type: 'Epic',
    status: 'Done',
    assignee: 'Diego Ferreira',
    lastUpdate: hoursAgo(200),
    startDate: addDays(today, -84),
    endDate: addDays(today, -42),
    riceScore: 44.2,
    description: 'Shipped Q3 2025. P95 render 4.1s to 1.3s for mid-size workspaces.',
    childItems: [
      { id: 'c-108-1', title: 'Query result cache', status: 'Done', type: 'Story' },
      { id: 'c-108-2', title: 'Invalidation on write', status: 'Done', type: 'Story' },
    ],
  },
];

export const SEED_INTEGRATIONS: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    category: 'Engineering',
    description: 'Mirror roadmap tickets to issues and stream commit activity back onto the board.',
    connected: true,
    capabilities: ['Sync tickets to issues', 'Commit + PR activity feed', 'Auto-close on merge'],
    lastSync: hoursAgo(1),
    accent: '#a78bfa',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Post standup summaries and pull status updates written in channel back into tickets.',
    connected: true,
    capabilities: ['Standup digest', 'Status updates from channel', 'Approval notifications'],
    lastSync: hoursAgo(2),
    accent: '#34d399',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'Revenue',
    description: 'Pull opportunity loss reasons and account ARR to weight customer issue intensity.',
    connected: true,
    capabilities: ['Loss reason ingestion', 'ARR weighting', 'Account rollups'],
    lastSync: hoursAgo(9),
    accent: '#22d3ee',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'Communication',
    description: 'Transcribe customer calls and extract themes into the intelligence feed.',
    connected: true,
    capabilities: ['Call transcripts', 'Theme extraction', 'QBR highlights'],
    lastSync: hoursAgo(14),
    accent: '#818cf8',
  },
  {
    id: 'gong',
    name: 'Gong',
    category: 'Revenue',
    description: 'Mine sales conversations for objections and competitive mentions.',
    connected: false,
    capabilities: ['Objection mining', 'Competitor mentions', 'Deal risk signals'],
    accent: '#fbbf24',
  },
  {
    id: 'intercom',
    name: 'Intercom',
    category: 'Support',
    description: 'Ingest support conversations and link them to the originating workspace.',
    connected: false,
    capabilities: ['Conversation ingestion', 'Account linking', 'CSAT correlation'],
    accent: '#f472b6',
  },
];

/** Canned messages used by the cloud-sync simulator. */
export const SYNC_MESSAGES: Record<'GitHub' | 'Slack', string[]> = {
  GitHub: [
    'Merged PR #{n} — {title}',
    'Opened PR #{n} against main for {title}',
    'CI green on branch feat/{slug} ({n} checks)',
    'Commit {sha} pushed to feat/{slug}',
    'Issue linked: closes #{n} on merge',
  ],
  Slack: [
    'Standup: {assignee} unblocked the {slug} spike, moving to review',
    '#product-eng: scope confirmed with design, no date change',
    '{assignee} flagged a dependency on the auth service in #eng-leads',
    'Customer escalation thread resolved — ties back to this epic',
    'Weekly sync: {title} still tracking to the committed date',
  ],
};

export const TEAM = [
  'Priya Raman',
  'Diego Ferreira',
  'Amara Okoye',
  'Marcus Hale',
  'Sofia Lindqvist',
];
