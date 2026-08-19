import { useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { SYNC_MESSAGES } from '../data/seed';
import type { SyncSource, Ticket } from '../types';
import { pickOne } from '../lib/utils';

const TICK_MS = 9_000;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 3)
    .join('-');
}

function renderMessage(template: string, ticket: Ticket): string {
  return template
    .replace('{n}', String(400 + Math.floor(Math.random() * 180)))
    .replace('{sha}', Math.random().toString(16).slice(2, 9))
    .replace('{slug}', slugify(ticket.title))
    .replace('{title}', ticket.title)
    .replace('{assignee}', ticket.assignee.split(' ')[0]);
}

/**
 * Simulates the connected GitHub / Slack integrations pushing activity onto the
 * board. Only tickets that are actually moving receive events, and only sources
 * whose integration is toggled on are used — disconnecting Slack visibly stops
 * Slack updates, which is the point of the simulation.
 */
export function useCloudSync(active: boolean): void {
  const { state, applySyncEvent, pushToast } = useApp();
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    if (!active || !state.syncEnabled) return undefined;

    const interval = window.setInterval(() => {
      const current = latest.current;

      const sources: SyncSource[] = [];
      if (current.integrations.find((i) => i.id === 'github')?.connected) sources.push('GitHub');
      if (current.integrations.find((i) => i.id === 'slack')?.connected) sources.push('Slack');
      if (sources.length === 0) return;

      const candidates = current.tickets.filter(
        (ticket) => ticket.status === 'In Progress' || ticket.status === 'Todo',
      );
      if (candidates.length === 0) return;

      const ticket = pickOne(candidates);
      const source = pickOne(sources);
      const message = renderMessage(pickOne(SYNC_MESSAGES[source]), ticket);

      applySyncEvent(ticket.id, source, message);
      pushToast({
        title: `${source} update on ${ticket.id}`,
        description: message,
        tone: 'info',
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [active, state.syncEnabled, applySyncEvent, pushToast]);
}
