import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gauge,
  Sparkles,
  AlertTriangle,
  Users,
} from 'lucide-react';
import type { CustomerIssue, FeatureIdea, HistoricalBenchmark } from '../../types';
import { Modal } from '../ui/Modal';
import { Badge, Button, Skeleton } from '../ui/Primitives';
import { estimateEffort, estimateReachImpact } from '../../services/aiService';
import {
  cn,
  EFFORT_LABELS,
  EFFORT_WEEKS,
  CONFIDENCE_OPTIONS,
  DEFAULT_CONFIDENCE,
  IMPACT_LABELS,
  riceScore,
} from '../../lib/utils';

interface RiceModalProps {
  idea: FeatureIdea | null;
  issues: CustomerIssue[];
  benchmarks: HistoricalBenchmark[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<FeatureIdea>) => void;
  onNotify: (title: string, description: string, tone: 'success' | 'warning' | 'error') => void;
}

type Step = 1 | 2;

/**
 * Two-step estimator. Reach and Impact are argued from customer evidence;
 * Effort is argued from delivery history. Splitting them keeps the model from
 * quietly trading one against the other to reach a flattering score.
 */
export function RiceModal({
  idea,
  issues,
  benchmarks,
  onClose,
  onSave,
  onNotify,
}: RiceModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [reach, setReach] = useState(20);
  const [impact, setImpact] = useState(2);
  const [effort, setEffort] = useState(3);
  const [reachRationale, setReachRationale] = useState('');
  const [impactRationale, setImpactRationale] = useState('');
  const [effortRationale, setEffortRationale] = useState('');
  const [risks, setRisks] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!idea) return;
    setStep(1);
    setReach(idea.reach || 20);
    setImpact(idea.impact || 2);
    setEffort(idea.effort || 3);
    setReachRationale(idea.reachRationale ?? '');
    setImpactRationale(idea.impactRationale ?? '');
    setEffortRationale(idea.effortRationale ?? '');
    setConfidence(idea.confidence ?? DEFAULT_CONFIDENCE);
    setRisks([]);
    setBusy(false);
  }, [idea]);

  if (!idea) return null;

  const score = riceScore(reach, impact, effort, confidence);
  const linked = issues.filter((issue) => idea.relatedIssueIds.includes(issue.id));

  const runReachImpact = async () => {
    setBusy(true);
    const result = await estimateReachImpact(idea, issues);
    setReach(result.data.reach);
    setImpact(result.data.impact);
    setReachRationale(result.data.reachRationale);
    setImpactRationale(result.data.impactRationale);
    setConfidence(result.data.confidence ?? DEFAULT_CONFIDENCE);
    setBusy(false);
    onNotify(
      result.source === 'gemini' ? 'Reach & Impact estimated' : 'Reach & Impact estimated (local)',
      result.warning ?? `Reach ${result.data.reach}, Impact ${IMPACT_LABELS[result.data.impact]}.`,
      result.warning ? 'warning' : 'success',
    );
  };

  const runEffort = async () => {
    setBusy(true);
    const result = await estimateEffort(idea, benchmarks);
    setEffort(result.data.effort);
    setEffortRationale(result.data.effortRationale);
    setRisks(result.data.risks);
    setBusy(false);
    onNotify(
      result.source === 'gemini' ? 'Effort estimated' : 'Effort estimated (local)',
      result.warning ?? `Sized at ${EFFORT_LABELS[result.data.effort]} (${EFFORT_WEEKS[result.data.effort]}).`,
      result.warning ? 'warning' : 'success',
    );
  };

  const save = () => {
    onSave(idea.id, {
      reach,
      impact,
      effort,
      reachRationale: reachRationale || undefined,
      impactRationale: impactRationale || undefined,
      effortRationale: effortRationale || undefined,
      confidence,
    });
    onClose();
  };

  return (
    <Modal
      open={Boolean(idea)}
      onClose={onClose}
      title="Estimate RICE"
      subtitle={idea.title}
      widthClass="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/10 px-3 py-1.5 ring-1 ring-inset ring-indigo-500/30">
              <span className="text-[10px] uppercase tracking-wider text-indigo-300/70">RICE</span>
              <span className="ml-2 text-base font-semibold tabular-nums text-indigo-200">
                {score.toFixed(1)}
              </span>
            </div>
            <span className="hidden text-[11px] text-slate-500 sm:inline">
              ({reach} × {impact} × {confidence}) ÷ {effort}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {step === 2 ? (
              <Button size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => setStep(1)}>
                Back
              </Button>
            ) : null}
            {step === 1 ? (
              <Button
                size="sm"
                variant="primary"
                icon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => setStep(2)}
              >
                Next: Effort
              </Button>
            ) : (
              <Button
                size="sm"
                variant="success"
                icon={<Check className="h-3.5 w-3.5" />}
                onClick={save}
              >
                Save score
              </Button>
            )}
          </div>
        </div>
      }
    >
      <StepIndicator step={step} />

      {step === 1 ? (
        <section className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Users className="h-4 w-4 text-indigo-300" />
                Step 1 — Reach & Impact
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Argued from {linked.length} linked customer signal{linked.length === 1 ? '' : 's'}.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              icon={busy ? undefined : <Sparkles className="h-3.5 w-3.5" />}
              onClick={runReachImpact}
            >
              Estimate with AI
            </Button>
          </div>

          {linked.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {linked.map((issue) => (
                <Badge key={issue.id} className="bg-slate-800/80 text-slate-300 ring-slate-700">
                  {issue.theme.slice(0, 40)} · {issue.intensity}
                </Badge>
              ))}
            </div>
          ) : null}

          {busy ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-8/12" />
            </div>
          ) : null}

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="reach-slider" className="text-xs font-medium text-slate-300">
                Reach — % of enterprise base affected
              </label>
              <span className="text-lg font-semibold tabular-nums text-indigo-300">{reach}</span>
            </div>
            <input
              id="reach-slider"
              type="range"
              min={1}
              max={100}
              value={reach}
              onChange={(event) => setReach(Number(event.target.value))}
              className="mt-2 w-full accent-indigo-500"
            />
            {reachRationale ? (
              <Rationale text={reachRationale} />
            ) : (
              <p className="mt-2 text-[11px] text-slate-600">
                No rationale yet — run the estimate or set the value manually.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-300">Impact</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setImpact(value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    impact === value
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700',
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-100">
                    {IMPACT_LABELS[value]}
                  </span>
                  <span className="block text-[10px] text-slate-500">multiplier ×{value}</span>
                </button>
              ))}
            </div>
            {impactRationale ? <Rationale text={impactRationale} /> : null}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-300">Confidence</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {CONFIDENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setConfidence(option.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    confidence === option.value
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700',
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-100">{option.label}</span>
                  <span className="block text-[10px] text-slate-500">
                    multiplier ×{option.value}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              Discounts the score by how much the reach and impact numbers can be trusted. An
              estimate run sets this from the model's own confidence.
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Gauge className="h-4 w-4 text-amber-300" />
                Step 2 — Effort
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Sized against {benchmarks.length} features this team has actually shipped.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              icon={busy ? undefined : <Sparkles className="h-3.5 w-3.5" />}
              onClick={runEffort}
            >
              Estimate with AI
            </Button>
          </div>

          {busy ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-10/12" />
              <Skeleton className="h-3 w-7/12" />
            </div>
          ) : null}

          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setEffort(value)}
                className={cn(
                  'rounded-xl border px-2 py-2.5 text-center transition-colors',
                  effort === value
                    ? 'border-amber-500/60 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700',
                )}
              >
                <span className="block text-sm font-semibold text-slate-100">
                  {EFFORT_LABELS[value]}
                </span>
                <span className="block text-[10px] text-slate-500">{EFFORT_WEEKS[value]}</span>
              </button>
            ))}
          </div>

          {effortRationale ? <Rationale text={effortRationale} /> : null}

          {risks.length > 0 ? (
            <div className="rounded-xl bg-amber-500/5 p-3.5 ring-1 ring-inset ring-amber-500/20">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Delivery risks
              </p>
              <ul className="space-y-1.5">
                {risks.map((risk) => (
                  <li key={risk} className="text-[11px] leading-relaxed text-slate-400">
                    · {risk}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Historical context on file
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{idea.historicalContext}</p>
          </div>
        </section>
      )}
    </Modal>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-3">
      {[
        { n: 1 as const, label: 'Reach & Impact' },
        { n: 2 as const, label: 'Effort' },
      ].map(({ n, label }) => (
        <li key={n} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
              step >= n ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500',
            )}
          >
            {n}
          </span>
          <span className={cn('text-xs', step >= n ? 'text-slate-200' : 'text-slate-500')}>
            {label}
          </span>
          {n === 1 ? (
            <span
              className={cn('h-px flex-1', step > 1 ? 'bg-indigo-500/60' : 'bg-slate-800')}
              aria-hidden="true"
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Rationale({ text }: { text: string }) {
  return (
    <p className="mt-2 rounded-lg bg-slate-950/60 px-3 py-2 text-[11px] leading-relaxed text-slate-400 ring-1 ring-inset ring-slate-800">
      {text}
    </p>
  );
}
