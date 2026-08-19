import type { CustomerIssue, FeatureIdea, Ticket } from '../types';

/** Tiny classname joiner — keeps conditional Tailwind readable without a dep. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function uid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** RICE without the C: (Reach x Impact) / Effort, rounded to one decimal. */
export function riceScore(reach: number, impact: number, effort: number): number {
  const safeEffort = effort > 0 ? effort : 1;
  return Math.round(((reach * impact) / safeEffort) * 10) / 10;
}

export const IMPACT_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export const EFFORT_LABELS: Record<number, string> = {
  1: 'S',
  2: 'M',
  3: 'L',
  4: 'XL',
  5: 'XXL',
};

export const EFFORT_WEEKS: Record<number, string> = {
  1: '~1 week',
  2: '~3 weeks',
  3: '~6 weeks',
  4: '~10 weeks',
  5: '~16 weeks',
};

/**
 * Issue themes are free text (they come out of a model), so categories are
 * derived by keyword rather than stored. Keeps the pie chart stable even when
 * the AI invents a new theme name.
 */
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'Reliability', keywords: ['outage', 'downtime', 'crash', 'reliab', 'error', 'bug', 'stability', 'fail'] },
  { category: 'Performance', keywords: ['slow', 'latency', 'perform', 'speed', 'timeout', 'load'] },
  { category: 'Integrations', keywords: ['integrat', 'api', 'webhook', 'sync', 'connector', 'sso', 'import', 'export'] },
  { category: 'Analytics', keywords: ['report', 'analytic', 'dashboard', 'metric', 'insight', 'data'] },
  { category: 'Onboarding & UX', keywords: ['onboard', 'ux', 'usab', 'confus', 'navigat', 'mobile', 'design', 'workflow'] },
  { category: 'Security & Compliance', keywords: ['security', 'complian', 'audit', 'permission', 'role', 'gdpr', 'soc'] },
  { category: 'Billing & Pricing', keywords: ['billing', 'price', 'pricing', 'invoice', 'seat', 'contract'] },
];

export function categorize(theme: string): string {
  const haystack = theme.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) return rule.category;
  }
  return 'Other';
}

export function formatDate(value: string | Date | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function timeAgo(value: string | undefined): string {
  if (!value) return 'never';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 'never';
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1000)}K`;
  return `$${value}`;
}

export function daysBetween(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

export function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Averages, guarded against the empty-array case that would produce NaN. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function ticketProgress(ticket: Ticket): number {
  const children = ticket.childItems ?? [];
  if (children.length === 0) {
    return ticket.status === 'Done' ? 100 : ticket.status === 'In Progress' ? 40 : 0;
  }
  const done = children.filter((c) => c.status === 'Done').length;
  const inProgress = children.filter((c) => c.status === 'In Progress').length;
  return Math.round(((done + inProgress * 0.5) / children.length) * 100);
}

export function issuesById(issues: CustomerIssue[], ids: string[]): CustomerIssue[] {
  const lookup = new Map(issues.map((issue) => [issue.id, issue]));
  return ids.map((id) => lookup.get(id)).filter((x): x is CustomerIssue => Boolean(x));
}

export function sortByScore(ideas: FeatureIdea[]): FeatureIdea[] {
  return [...ideas].sort((a, b) => b.score - a.score);
}

/** Deterministic pseudo-random in [0,1) from a string — keeps demo data stable. */
export function seededRandom(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

export function pickOne<T>(items: T[], seed?: string): T {
  const index =
    seed === undefined
      ? Math.floor(Math.random() * items.length)
      : Math.floor(seededRandom(seed) * items.length);
  return items[clamp(index, 0, items.length - 1)];
}
