/** Chart + status colors, kept in one place so Recharts and Tailwind agree. */

export const CHART_COLORS = [
  '#818cf8', // indigo-400
  '#22d3ee', // cyan-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f472b6', // pink-400
  '#a78bfa', // violet-400
  '#fb7185', // rose-400
  '#4ade80', // green-400
];

export const SOURCE_STYLES: Record<string, { chip: string; dot: string }> = {
  CRM: { chip: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30', dot: '#818cf8' },
  Zoom: { chip: 'bg-cyan-500/10 text-cyan-300 ring-cyan-500/30', dot: '#22d3ee' },
  Sales: { chip: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30', dot: '#34d399' },
};

export const ISSUE_STATUS_STYLES: Record<string, string> = {
  New: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
  Analyzed: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  Approved: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
};

export const TICKET_STATUS_STYLES: Record<
  string,
  { chip: string; bar: string; accent: string }
> = {
  Backlog: {
    chip: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
    bar: 'bg-slate-500',
    accent: '#94a3b8',
  },
  Todo: {
    chip: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30',
    bar: 'bg-indigo-500',
    accent: '#818cf8',
  },
  'In Progress': {
    chip: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
    bar: 'bg-amber-500',
    accent: '#fbbf24',
  },
  Done: {
    chip: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
    bar: 'bg-emerald-500',
    accent: '#34d399',
  },
};

export const intensityColor = (intensity: number): string => {
  if (intensity >= 80) return '#fb7185';
  if (intensity >= 60) return '#fbbf24';
  if (intensity >= 40) return '#22d3ee';
  return '#818cf8';
};

/** Shared Recharts tooltip chrome. */
export const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '0.75rem',
  color: '#e2e8f0',
  fontSize: '0.75rem',
  boxShadow: '0 10px 30px rgba(2, 6, 23, 0.6)',
} as const;
