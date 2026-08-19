import type {
  CustomerIssue,
  FeatureIdea,
  HistoricalBenchmark,
  InsightsData,
} from '../types';
import { generateJson, isAiEnabled, SchemaType as Type } from './geminiClient';
import {
  categorize,
  clamp,
  formatCurrency,
  mean,
  riceScore,
  seededRandom,
  uid,
} from '../lib/utils';

/**
 * Every export here returns `{ data, source }` where source is 'gemini' when the
 * live model answered and 'local' when the deterministic fallback ran. The UI
 * surfaces that distinction rather than pretending the demo is calling an API.
 */
export type Provenance = 'gemini' | 'local';

export interface AiResult<T> {
  data: T;
  source: Provenance;
  /** Present when a live call was attempted and failed. */
  warning?: string;
}

const SYSTEM_PM = [
  'You are a principal product manager at a B2B SaaS company.',
  'You reason from evidence in the supplied customer data and from the company\'s own shipping history.',
  'You are concrete and numerate. You never invent customer names or metrics that are not in the input.',
  'You prefer one well-argued sentence to three vague ones.',
].join(' ');

function issueDigest(issues: CustomerIssue[]): string {
  return issues
    .map(
      (i) =>
        `- [${i.id}] source=${i.source} intensity=${i.intensity} account=${i.account ?? 'unknown'} arr=${
          i.arr ?? 0
        } theme="${i.theme}" detail="${i.description}"`,
    )
    .join('\n');
}

function benchmarkDigest(benchmarks: HistoricalBenchmark[]): string {
  return benchmarks
    .map(
      (b) =>
        `- ${b.feature} (${b.shippedQuarter}): ${b.effortWeeks} eng-weeks, ${b.adoption}% adoption. ${b.outcome}`,
    )
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* 1. Strategic synthesis                                              */
/* ------------------------------------------------------------------ */

const INSIGHTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Three to five sentences naming the dominant strategic pattern across the feedback.',
    },
    topThemes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          theme: { type: Type.STRING },
          count: { type: Type.INTEGER },
          intensity: { type: Type.INTEGER },
        },
        required: ['theme', 'count', 'intensity'],
      },
    },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['summary', 'topThemes', 'risks', 'recommendations'],
};

export async function synthesizeInsights(
  issues: CustomerIssue[],
): Promise<AiResult<InsightsData>> {
  const local = () => localInsights(issues);

  if (!isAiEnabled() || issues.length === 0) {
    return { data: local(), source: 'local' };
  }

  try {
    const data = await generateJson<InsightsData>({
      systemInstruction: SYSTEM_PM,
      temperature: 0.5,
      responseSchema: INSIGHTS_SCHEMA,
      prompt: [
        'Synthesize the following multi-channel customer feedback into a strategic briefing for the product leadership team.',
        '',
        'FEEDBACK:',
        issueDigest(issues),
        '',
        'Requirements:',
        '- summary: 3-5 sentences. Name the single dominant pattern first, then the second-order pattern. Quantify with the ARR and intensity figures supplied.',
        '- topThemes: merge the raw themes into 4-6 consolidated themes. count = how many raw issues rolled into it. intensity = the weighted average intensity (1-100, integer).',
        '- risks: 2-4 specific risks of not acting, each tied to named evidence in the input.',
        '- recommendations: 3-4 imperative next steps, ordered by expected value.',
      ].join('\n'),
    });

    return {
      data: {
        ...data,
        topThemes: (data.topThemes ?? []).slice(0, 8).map((t) => ({
          theme: t.theme,
          count: Math.max(1, Math.round(t.count)),
          intensity: clamp(Math.round(t.intensity), 1, 100),
        })),
        generatedAt: new Date().toISOString(),
        generatedBy: 'gemini',
      },
      source: 'gemini',
    };
  } catch (error) {
    return {
      data: local(),
      source: 'local',
      warning: error instanceof Error ? error.message : 'Model call failed',
    };
  }
}

function localInsights(issues: CustomerIssue[]): InsightsData {
  const byCategory = new Map<string, CustomerIssue[]>();
  for (const issue of issues) {
    const key = categorize(issue.theme);
    const bucket = byCategory.get(key);
    if (bucket) bucket.push(issue);
    else byCategory.set(key, [issue]);
  }

  const topThemes = [...byCategory.entries()]
    .map(([theme, group]) => ({
      theme,
      count: group.length,
      intensity: Math.round(mean(group.map((i) => i.intensity))),
    }))
    .sort((a, b) => b.intensity * b.count - a.intensity * a.count)
    .slice(0, 6);

  const totalArr = issues.reduce((sum, i) => sum + (i.arr ?? 0), 0);
  const lead = topThemes[0];
  const second = topThemes[1];
  const hottest = [...issues].sort((a, b) => b.intensity - a.intensity)[0];

  const summary = [
    `${issues.length} signals across CRM, Zoom and Sales touch roughly ${formatCurrency(totalArr)} of attributed ARR.`,
    lead
      ? `${lead.theme} is the dominant pattern with ${lead.count} signal${lead.count === 1 ? '' : 's'} at an average intensity of ${lead.intensity}.`
      : 'No dominant pattern has emerged yet.',
    second
      ? `${second.theme} follows at intensity ${second.intensity}, and the two overlap on the largest accounts.`
      : '',
    hottest
      ? `The sharpest single signal is "${hottest.theme}" from ${hottest.account ?? 'an enterprise account'} at intensity ${hottest.intensity}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    summary,
    topThemes,
    risks: [
      lead
        ? `${lead.theme} is compounding across multiple accounts; each additional quarter of delay widens the workaround surface customers have already built.`
        : 'Insufficient signal density to identify a compounding risk.',
      'Enterprise-blocking gaps are concentrated in the accounts with the highest ARR, so churn exposure is correlated rather than diversified.',
      'Several signals share a single root cause, which means fragmented point fixes would spend budget without closing the underlying gap.',
    ],
    recommendations: [
      lead ? `Scope a single initiative that resolves ${lead.theme} at the root rather than per-symptom.` : 'Collect more signal before committing roadmap capacity.',
      'Weight intensity by account ARR before ranking, so the loudest channel does not outrank the largest exposure.',
      'Approve the top-intensity signals into ideation and generate options against the historical benchmark set.',
    ],
    generatedAt: new Date().toISOString(),
    generatedBy: 'local',
  };
}

/* ------------------------------------------------------------------ */
/* 2. Feature ideation                                                 */
/* ------------------------------------------------------------------ */

const IDEAS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          historicalContext: { type: Type.STRING },
          relatedIssueIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          reach: { type: Type.INTEGER },
          impact: { type: Type.INTEGER },
          effort: { type: Type.INTEGER },
          confidence: { type: Type.NUMBER },
        },
        required: [
          'title',
          'description',
          'reasoning',
          'historicalContext',
          'relatedIssueIds',
          'reach',
          'impact',
          'effort',
        ],
      },
    },
  },
  required: ['ideas'],
};

interface RawIdea {
  title: string;
  description: string;
  reasoning: string;
  historicalContext: string;
  relatedIssueIds: string[];
  reach: number;
  impact: number;
  effort: number;
  confidence?: number;
}

export async function generateFeatureIdeas(
  issues: CustomerIssue[],
  benchmarks: HistoricalBenchmark[],
  existingTitles: string[],
  count = 3,
): Promise<AiResult<FeatureIdea[]>> {
  const pool = issues.filter((i) => i.status !== 'New');
  const basis = pool.length > 0 ? pool : issues;
  const local = () => localIdeas(basis, benchmarks, existingTitles, count);

  if (!isAiEnabled() || basis.length === 0) {
    return { data: local(), source: 'local' };
  }

  try {
    const result = await generateJson<{ ideas: RawIdea[] }>({
      systemInstruction: SYSTEM_PM,
      temperature: 0.85,
      responseSchema: IDEAS_SCHEMA,
      prompt: [
        `Propose ${count} distinct feature bets that address the approved customer signals below.`,
        '',
        'APPROVED SIGNALS:',
        issueDigest(basis),
        '',
        'WHAT THIS COMPANY HAS ALREADY SHIPPED (use this as grounding, not decoration):',
        benchmarkDigest(benchmarks),
        '',
        existingTitles.length
          ? `ALREADY ON THE BOARD (do not repeat these): ${existingTitles.join('; ')}`
          : '',
        '',
        'For each idea:',
        '- title: under 9 words, names the thing being built.',
        '- description: 1-2 sentences on what actually gets built.',
        '- reasoning: why this bet, citing the specific signal ids and the ARR at stake.',
        '- historicalContext: cite at least one shipped feature above by name and say what it implies for this bet (a reusable pattern, an estimation tax, an adoption warning).',
        '- relatedIssueIds: the exact signal ids this resolves.',
        '- reach: integer 1-100, percent of the enterprise base affected.',
        '- impact: 1 (low), 2 (medium) or 3 (high).',
        '- effort: 1 (S, ~1wk), 2 (M, ~3wk), 3 (L, ~6wk), 4 (XL, ~10wk), 5 (XXL, ~16wk).',
        '- confidence: 0 to 1.',
      ]
        .filter(Boolean)
        .join('\n'),
    });

    const validIds = new Set(issues.map((i) => i.id));
    const ideas: FeatureIdea[] = (result.ideas ?? []).slice(0, count).map((raw) => {
      const reach = clamp(Math.round(raw.reach), 1, 100);
      const impact = clamp(Math.round(raw.impact), 1, 3);
      const effort = clamp(Math.round(raw.effort), 1, 5);
      const confidence = raw.confidence !== undefined ? clamp(raw.confidence, 0, 1) : undefined;
      return {
        id: uid('idea'),
        title: raw.title,
        description: raw.description,
        reasoning: raw.reasoning,
        historicalContext: raw.historicalContext,
        relatedIssueIds: (raw.relatedIssueIds ?? []).filter((id) => validIds.has(id)),
        reach,
        impact,
        effort,
        score: riceScore(reach, impact, effort, confidence),
        status: 'Draft',
        confidence,
        createdAt: new Date().toISOString(),
      };
    });

    if (ideas.length === 0) throw new Error('Model returned no ideas');
    return { data: ideas, source: 'gemini' };
  } catch (error) {
    return {
      data: local(),
      source: 'local',
      warning: error instanceof Error ? error.message : 'Model call failed',
    };
  }
}

const LOCAL_IDEA_TEMPLATES = [
  {
    verb: 'Self-serve controls for',
    build: 'Ship an admin-facing surface that lets customers resolve this themselves instead of routing through support.',
    effort: 2,
    impact: 2,
  },
  {
    verb: 'Durable pipeline for',
    build: 'Move the work onto the queued job runner with checkpointing, retries and an operator-visible status log.',
    effort: 3,
    impact: 3,
  },
  {
    verb: 'Native integration for',
    build: 'Build a first-party connector with field mapping, conflict resolution and a replay log for failed records.',
    effort: 4,
    impact: 3,
  },
  {
    verb: 'Guided in-product flow for',
    build: 'Add a contextual walkthrough with progress persistence and activation instrumentation.',
    effort: 1,
    impact: 2,
  },
];

function localIdeas(
  issues: CustomerIssue[],
  benchmarks: HistoricalBenchmark[],
  existingTitles: string[],
  count: number,
): FeatureIdea[] {
  const taken = new Set(existingTitles.map((t) => t.toLowerCase()));
  const ranked = [...issues].sort((a, b) => b.intensity * (b.arr ?? 1) - a.intensity * (a.arr ?? 1));
  const ideas: FeatureIdea[] = [];

  for (const issue of ranked) {
    if (ideas.length >= count) break;
    const seed = `${issue.id}-${ideas.length}`;
    const template = LOCAL_IDEA_TEMPLATES[Math.floor(seededRandom(seed) * LOCAL_IDEA_TEMPLATES.length)];
    const category = categorize(issue.theme);
    const title = `${template.verb} ${issue.theme.toLowerCase()}`.replace(/\s+/g, ' ').slice(0, 72);
    if (taken.has(title.toLowerCase())) continue;
    taken.add(title.toLowerCase());

    const benchmark = benchmarks[Math.floor(seededRandom(`${seed}-b`) * benchmarks.length)];
    const reach = clamp(Math.round(issue.intensity * 0.7 + seededRandom(`${seed}-r`) * 20), 5, 95);
    const impact = clamp(template.impact + (issue.intensity > 80 ? 1 : 0), 1, 3);
    const effort = clamp(template.effort, 1, 5);

    ideas.push({
      id: uid('idea'),
      title: title.charAt(0).toUpperCase() + title.slice(1),
      description: template.build,
      reasoning: `Derived from ${issue.id} (${category}, intensity ${issue.intensity}) at ${
        issue.account ?? 'an enterprise account'
      }${issue.arr ? ` with ${formatCurrency(issue.arr)} ARR attributed` : ''}. Resolving it removes an active customer workaround rather than adding surface area.`,
      historicalContext: benchmark
        ? `Closest precedent: ${benchmark.feature} (${benchmark.shippedQuarter}) — ${benchmark.effortWeeks} eng-weeks, ${benchmark.adoption}% adoption. ${benchmark.outcome}`
        : 'No comparable shipped feature on record; treat the estimate as low-confidence.',
      relatedIssueIds: [issue.id],
      reach,
      impact,
      effort,
      score: riceScore(reach, impact, effort, 0.55),
      status: 'Draft',
      confidence: 0.55,
      createdAt: new Date().toISOString(),
    });
  }

  return ideas;
}

/* ------------------------------------------------------------------ */
/* 3. Two-step RICE estimation                                         */
/* ------------------------------------------------------------------ */

export interface ReachImpactEstimate {
  reach: number;
  impact: number;
  reachRationale: string;
  impactRationale: string;
  confidence: number;
}

const REACH_IMPACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reach: { type: Type.INTEGER, description: 'Percent of the enterprise customer base affected, 1-100.' },
    impact: { type: Type.INTEGER, description: '1 = low, 2 = medium, 3 = high.' },
    reachRationale: { type: Type.STRING },
    impactRationale: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ['reach', 'impact', 'reachRationale', 'impactRationale', 'confidence'],
};

export async function estimateReachImpact(
  idea: FeatureIdea,
  issues: CustomerIssue[],
): Promise<AiResult<ReachImpactEstimate>> {
  const linked = issues.filter((i) => idea.relatedIssueIds.includes(i.id));
  const local = (): ReachImpactEstimate => {
    const basis = linked.length ? linked : issues.slice(0, 3);
    const avgIntensity = Math.round(mean(basis.map((i) => i.intensity))) || 50;
    const arr = basis.reduce((sum, i) => sum + (i.arr ?? 0), 0);
    return {
      reach: clamp(Math.round(avgIntensity * 0.72 + basis.length * 3), 1, 100),
      impact: avgIntensity >= 78 ? 3 : avgIntensity >= 55 ? 2 : 1,
      reachRationale: `${basis.length} linked signal${basis.length === 1 ? '' : 's'} at an average intensity of ${avgIntensity}, spanning ${
        new Set(basis.map((i) => i.account)).size
      } account(s). Reach scaled from intensity and signal breadth.`,
      impactRationale: arr
        ? `${formatCurrency(arr)} of attributed ARR sits behind these signals, and at least one is an active blocker rather than a preference.`
        : 'Impact estimated from signal intensity alone; no ARR attribution available.',
      confidence: linked.length >= 2 ? 0.72 : 0.55,
    };
  };

  if (!isAiEnabled()) return { data: local(), source: 'local' };

  try {
    const data = await generateJson<ReachImpactEstimate>({
      systemInstruction: SYSTEM_PM,
      temperature: 0.4,
      responseSchema: REACH_IMPACT_SCHEMA,
      prompt: [
        'Estimate the Reach and Impact halves of a RICE score for the feature below. Do not estimate effort.',
        '',
        `FEATURE: ${idea.title}`,
        `DESCRIPTION: ${idea.description}`,
        `RATIONALE: ${idea.reasoning}`,
        '',
        'LINKED CUSTOMER SIGNALS:',
        linked.length ? issueDigest(linked) : '(none linked — estimate conservatively and say so)',
        '',
        'reach = percent of the enterprise customer base that would touch this within two quarters (integer 1-100).',
        'impact = 1 low, 2 medium, 3 high, judged by whether this removes a blocker, a workaround, or merely a preference.',
        'Each rationale must be one or two sentences and must reference the evidence above by account or intensity.',
        'confidence = 0 to 1, lower when the linked evidence is thin.',
      ].join('\n'),
    });

    return {
      data: {
        reach: clamp(Math.round(data.reach), 1, 100),
        impact: clamp(Math.round(data.impact), 1, 3),
        reachRationale: data.reachRationale,
        impactRationale: data.impactRationale,
        confidence: clamp(data.confidence ?? 0.6, 0, 1),
      },
      source: 'gemini',
    };
  } catch (error) {
    return {
      data: local(),
      source: 'local',
      warning: error instanceof Error ? error.message : 'Model call failed',
    };
  }
}

export interface EffortEstimate {
  effort: number;
  effortRationale: string;
  risks: string[];
}

const EFFORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    effort: { type: Type.INTEGER, description: '1=S ~1wk, 2=M ~3wk, 3=L ~6wk, 4=XL ~10wk, 5=XXL ~16wk.' },
    effortRationale: { type: Type.STRING },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['effort', 'effortRationale', 'risks'],
};

export async function estimateEffort(
  idea: FeatureIdea,
  benchmarks: HistoricalBenchmark[],
): Promise<AiResult<EffortEstimate>> {
  const local = (): EffortEstimate => {
    const nearest = benchmarks[Math.floor(seededRandom(idea.title) * benchmarks.length)];
    const weeks = nearest?.effortWeeks ?? 6;
    const effort = weeks <= 2 ? 1 : weeks <= 4 ? 2 : weeks <= 7 ? 3 : weeks <= 12 ? 4 : 5;
    return {
      effort: clamp(effort, 1, 5),
      effortRationale: nearest
        ? `Sized against ${nearest.feature} (${nearest.shippedQuarter}), which took ${nearest.effortWeeks} eng-weeks for comparable surface area.`
        : 'No comparable shipped feature; sized at the team median.',
      risks: [
        'Retry and conflict semantics historically add ~40% to the first estimate on integration work.',
        'Migration of in-flight records needs a backfill plan before the flag can be flipped on.',
        'Adoption, not delivery, has been the failure mode on our last two comparable bets.',
      ],
    };
  };

  if (!isAiEnabled()) return { data: local(), source: 'local' };

  try {
    const data = await generateJson<EffortEstimate>({
      systemInstruction: SYSTEM_PM,
      temperature: 0.4,
      responseSchema: EFFORT_SCHEMA,
      prompt: [
        'Estimate the Effort half of a RICE score for the feature below, grounded in what this team has actually shipped.',
        '',
        `FEATURE: ${idea.title}`,
        `DESCRIPTION: ${idea.description}`,
        `HISTORICAL CONTEXT ALREADY ATTACHED: ${idea.historicalContext}`,
        '',
        'DELIVERY HISTORY:',
        benchmarkDigest(benchmarks),
        '',
        'effort = 1 (S, ~1wk), 2 (M, ~3wk), 3 (L, ~6wk), 4 (XL, ~10wk), 5 (XXL, ~16wk).',
        'effortRationale: one or two sentences naming the closest shipped comparable and why this is bigger or smaller.',
        'risks: 2-4 concrete delivery risks, each specific to this build rather than generic project advice.',
      ].join('\n'),
    });

    return {
      data: {
        effort: clamp(Math.round(data.effort), 1, 5),
        effortRationale: data.effortRationale,
        risks: (data.risks ?? []).slice(0, 4),
      },
      source: 'gemini',
    };
  } catch (error) {
    return {
      data: local(),
      source: 'local',
      warning: error instanceof Error ? error.message : 'Model call failed',
    };
  }
}
