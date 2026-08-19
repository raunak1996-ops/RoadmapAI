import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  CircleDot,
  Flame,
  GitBranch,
  Layers,
  Lightbulb,
  Radar,
  Target,
} from 'lucide-react';
import { AppTab } from '../types';
import { useApp } from '../state/AppContext';
import { Badge, Button, Card, CardHeader, ProgressBar, Stat } from '../components/ui/Primitives';
import { CHART_COLORS, intensityColor, TOOLTIP_STYLE, TICKET_STATUS_STYLES } from '../lib/theme';
import { categorize, formatCurrency, mean, timeAgo, ticketProgress } from '../lib/utils';

export function DashboardView() {
  const { state, dispatch } = useApp();
  const { issues, ideas, tickets, syncFeed } = state;

  const intensityData = useMemo(
    () =>
      [...issues]
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 8)
        .map((issue) => ({
          name: issue.theme.length > 26 ? `${issue.theme.slice(0, 24)}…` : issue.theme,
          fullName: issue.theme,
          intensity: issue.intensity,
          source: issue.source,
        })),
    [issues],
  );

  const categoryData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const issue of issues) {
      const key = categorize(issue.theme);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [issues]);

  const deliveryTrend = useMemo(() => {
    // Rolling four-week view of what the board says is in flight vs. shipped.
    const weeks = [-3, -2, -1, 0];
    return weeks.map((offset) => {
      const cutoff = Date.now() + offset * 7 * 86_400_000;
      const shipped = tickets.filter(
        (t) => t.status === 'Done' && new Date(t.endDate).getTime() <= cutoff,
      ).length;
      const active = tickets.filter(
        (t) =>
          new Date(t.startDate).getTime() <= cutoff && new Date(t.endDate).getTime() >= cutoff,
      ).length;
      return { week: offset === 0 ? 'Now' : `W${offset}`, shipped, active };
    });
  }, [tickets]);

  const atRiskArr = issues
    .filter((i) => i.intensity >= 75)
    .reduce((sum, i) => sum + (i.arr ?? 0), 0);
  const avgIntensity = Math.round(mean(issues.map((i) => i.intensity)));
  const inFlight = tickets.filter((t) => t.status === 'In Progress');
  const approvedIdeas = ideas.filter((i) => i.status === 'Approved').length;
  const topIdeas = [...ideas].sort((a, b) => b.score - a.score).slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Stat
          label="Open signals"
          value={issues.filter((i) => i.status !== 'Approved').length}
          hint={`${issues.length} total across 3 channels`}
          icon={<Radar className="h-4 w-4" />}
        />
        <Stat
          label="Avg intensity"
          value={avgIntensity}
          hint="Weighted pain, 1-100"
          tone={avgIntensity >= 70 ? 'critical' : avgIntensity >= 50 ? 'warning' : 'default'}
          icon={<Flame className="h-4 w-4" />}
        />
        <Stat
          label="ARR at risk"
          value={formatCurrency(atRiskArr)}
          hint="Accounts with intensity ≥ 75"
          tone="warning"
          icon={<Target className="h-4 w-4" />}
        />
        <Stat
          label="Approved bets"
          value={approvedIdeas}
          hint={`${ideas.length - approvedIdeas} still in draft`}
          icon={<Lightbulb className="h-4 w-4" />}
        />
        <Stat
          label="In flight"
          value={inFlight.length}
          hint={`${tickets.filter((t) => t.status === 'Done').length} shipped`}
          tone="positive"
          icon={<Layers className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Issue intensity by theme"
            subtitle="Top 8 signals ranked by weighted customer pain"
            icon={<Flame className="h-4 w-4" />}
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intensityData} margin={{ top: 4, right: 8, left: -18, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-32}
                  textAnchor="end"
                  interval={0}
                  height={64}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  stroke="#334155"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  stroke="#334155"
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(129,140,248,0.08)' }}
                  formatter={(value) => [`${value} / 100`, 'Intensity']}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ''
                  }
                />
                <Bar dataKey="intensity" radius={[5, 5, 0, 0]} maxBarSize={44}>
                  {intensityData.map((entry) => (
                    <Cell key={entry.fullName} fill={intensityColor(entry.intensity)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Category distribution"
            subtitle="Where the feedback concentrates"
            icon={<CircleDot className="h-4 w-4" />}
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={86}
                  paddingAngle={3}
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [`${value} signals`, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={64}
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Delivery trend"
            subtitle="Active vs. shipped over the last four weeks"
            icon={<Layers className="h-4 w-4" />}
          />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deliveryTrend} margin={{ top: 6, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#334155" />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#334155" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="active"
                  name="Active"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#fbbf24' }}
                />
                <Line
                  type="monotone"
                  dataKey="shipped"
                  name="Shipped"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#34d399' }}
                />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Highest RICE bets"
            subtitle="(Reach × Impact) ÷ Effort"
            icon={<Lightbulb className="h-4 w-4" />}
            action={
              <Button
                size="sm"
                variant="ghost"
                icon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => dispatch({ type: 'SET_TAB', tab: AppTab.IDEATION })}
              >
                Open
              </Button>
            }
          />
          <ul className="space-y-3">
            {topIdeas.map((idea) => (
              <li key={idea.id} className="rounded-xl bg-slate-900/70 p-3 ring-1 ring-inset ring-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium leading-snug text-slate-200">{idea.title}</p>
                  <span className="shrink-0 rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-indigo-300">
                    {idea.score.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                  <span>R {idea.reach}</span>
                  <span>·</span>
                  <span>I {idea.impact}</span>
                  <span>·</span>
                  <span>E {idea.effort}</span>
                  <Badge
                    className={
                      idea.status === 'Approved'
                        ? 'ml-auto bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                        : 'ml-auto bg-slate-500/10 text-slate-400 ring-slate-500/30'
                    }
                  >
                    {idea.status}
                  </Badge>
                </div>
              </li>
            ))}
            {topIdeas.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                No ideas yet — generate some in the Ideation Lab.
              </li>
            ) : null}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Live activity"
            subtitle="Events synced from GitHub and Slack"
            icon={<GitBranch className="h-4 w-4" />}
            action={
              <Button
                size="sm"
                variant="ghost"
                icon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => dispatch({ type: 'SET_TAB', tab: AppTab.TICKETS })}
              >
                Board
              </Button>
            }
          />
          {syncFeed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              Waiting for the first sync event. Activity appears here every few seconds while sync is
              live.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {syncFeed.slice(0, 5).map((event) => (
                <li key={event.id} className="flex gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: event.source === 'GitHub' ? '#a78bfa' : '#34d399' }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] text-slate-300">{event.message}</p>
                    <p className="text-[10px] text-slate-500">
                      {event.source} · {event.ticketId} · {timeAgo(event.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Work in flight"
          subtitle="Initiatives and epics currently being delivered"
          icon={<Layers className="h-4 w-4" />}
        />
        <div className="space-y-3">
          {inFlight.map((ticket) => {
            const progress = ticketProgress(ticket);
            return (
              <div key={ticket.id} className="rounded-xl bg-slate-900/60 p-3.5 ring-1 ring-inset ring-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">{ticket.id}</span>
                    <p className="truncate text-xs font-medium text-slate-200">{ticket.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={TICKET_STATUS_STYLES[ticket.status].chip}>{ticket.status}</Badge>
                    <span className="text-[11px] text-slate-500">{ticket.assignee}</span>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <ProgressBar value={progress} barClassName="bg-amber-400" className="flex-1" />
                  <span className="w-9 text-right text-[11px] tabular-nums text-slate-400">
                    {progress}%
                  </span>
                </div>
                {ticket.recentActivity ? (
                  <p className="mt-2 truncate text-[11px] text-slate-500">
                    {ticket.updatedBy ? `[${ticket.updatedBy}] ` : ''}
                    {ticket.recentActivity}
                  </p>
                ) : null}
              </div>
            );
          })}
          {inFlight.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              Nothing in flight. Move a ticket to In Progress on the roadmap board.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
