import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowDownRight,
  CheckCircle2,
  GitCompareArrows,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CF_METHOD_BENCHMARKS,
  CF_PAIRWISE_BOOTSTRAP,
  CF_STABILITY_SUMMARY,
  IMMUTABLE_AND_NON_ACTIONABLE,
  STUDY_METADATA,
} from '../data/notebookReference';
import { SAMPLE_PATIENT_PROFILES } from '../data/samplePatients';
import {
  CounterfactualResult,
  PredictionResult,
  SamplePatientProfile,
} from '../types/icu';

interface CounterfactualPageProps {
  prediction: PredictionResult | null;
  counterfactual: CounterfactualResult | null;
  loading: boolean;
  error: string | null;
  fallbackNotice: string | null;
  activeSampleName?: string | null;
  onGenerateCounterfactual: () => void;
  onLoadSampleAndExplain: (profile: SamplePatientProfile) => void;
}

export function CounterfactualPage({
  prediction,
  counterfactual,
  loading,
  error,
  fallbackNotice,
  activeSampleName,
  onGenerateCounterfactual,
  onLoadSampleAndExplain,
}: CounterfactualPageProps) {
  const probComparisonData = counterfactual
    ? [
        {
          stage: 'Original Profile',
          probability: Number(counterfactual.original_probability.toFixed(6)),
          fill:
            counterfactual.original_probability >= counterfactual.threshold
              ? '#E11D48'
              : '#0D9488',
        },
        {
          stage: 'Counterfactual Profile',
          probability: Number(counterfactual.counterfactual_probability.toFixed(6)),
          fill:
            counterfactual.counterfactual_probability <= counterfactual.target_probability
              ? '#0D9488'
              : '#D97706',
        },
      ]
    : [];

  const benchmarkChartData = CF_METHOD_BENCHMARKS.map((m) => ({
    name:
      m.method === 'gradient_guided'
        ? 'Gradient-Guided'
        : m.method === 'greedy_single_feature'
          ? 'Greedy Single'
          : 'Random Feature',
    successRate: m.successRatePct,
    meanCostScaled: Number((m.meanCost * 100).toFixed(2)),
    meanCost: m.meanCost,
  }));

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <span>Gradient-Guided Counterfactual Search</span>
              <span className="text-slate-300">·</span>
              <span>Target ≤ {STUDY_METADATA.cfTargetProbability.toFixed(6)}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Constraint-Aware Counterfactual Explanation
              {activeSampleName ? ` — ${activeSampleName}` : ''}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Uses PyTorch MLP autograd sensitivity ({STUDY_METADATA.cfHyperparameters.nBaseFeatures} base features + companion min/max pairs,{' '}
              {STUDY_METADATA.cfHyperparameters.optimizationSteps} steps, lr={STUDY_METADATA.cfHyperparameters.learningRate}, λ={STUDY_METADATA.cfHyperparameters.lambdaPenalty}) with 1st–99th percentile bounds and 64 min/max pair projections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!counterfactual && (
              <button
                type="button"
                onClick={() => onLoadSampleAndExplain(SAMPLE_PATIENT_PROFILES[0])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Load Notebook Case #01</span>
              </button>
            )}

            <button
              type="button"
              onClick={onGenerateCounterfactual}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Optimizing Counterfactual...</span>
                </>
              ) : (
                <>
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  <span>
                    {counterfactual
                      ? 'Re-run Gradient-Guided Search'
                      : 'Generate Counterfactual'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {fallbackNotice && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            <span className="font-semibold">FastAPI Unreachable — Demo Fallback Used:</span>{' '}
            {fallbackNotice}
          </div>
        )}
      </section>

      {/* Active Patient Counterfactual Results */}
      {counterfactual ? (
        <>
          {/* Summary KPI Strip */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Original Probability
              </div>
              <div
                className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
                  counterfactual.original_probability >= counterfactual.threshold
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {counterfactual.original_probability.toFixed(6)}
              </div>
              <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                Cutoff: {counterfactual.threshold.toFixed(6)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Counterfactual Probability
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span
                  className={`font-mono text-2xl font-bold tabular-nums ${
                    counterfactual.success ? 'text-teal-700' : 'text-amber-700'
                  }`}
                >
                  {counterfactual.counterfactual_probability.toFixed(6)}
                </span>
                <span className="inline-flex items-center font-mono text-xs font-semibold text-teal-700 tabular-nums">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  {(
                    (counterfactual.counterfactual_probability -
                      counterfactual.original_probability) *
                    100
                  ).toFixed(2)}{' '}
                  pp
                </span>
              </div>
              <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                Target ≤ {counterfactual.target_probability.toFixed(6)} (0.02 margin)
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Normalized Proximity Cost (L1)
              </div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {counterfactual.proximity_cost.toFixed(6)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Changed features:{' '}
                <strong className="font-mono text-slate-800 tabular-nums">
                  {counterfactual.n_changed_features}
                </strong>{' '}
                · Evals:{' '}
                <strong className="font-mono text-slate-800 tabular-nums">
                  {counterfactual.evaluations}
                </strong>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search Status & Source
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-lg font-bold text-slate-900">
                <CheckCircle2
                  className={`h-5 w-5 ${
                    counterfactual.success ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <span>
                  {counterfactual.already_below
                    ? 'Already Below Target'
                    : counterfactual.success
                      ? 'Valid Flip Achieved'
                      : 'Target Not Reached'}
                </span>
              </div>
              <div
                className={`mt-1 text-xs font-semibold ${
                  counterfactual.data_source === 'fastapi'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {counterfactual.data_source === 'fastapi'
                  ? 'Live Python FastAPI Solver'
                  : 'Synthetic Demonstration Mode'}
              </div>
            </div>
          </section>

          {/* Probability Chart + Changed Features Table */}
          <div className="grid gap-6 xl:grid-cols-12">
            {/* Before vs After Chart */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-5">
              <h3 className="text-sm font-bold text-slate-900">
                Original vs. Counterfactual Probability
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Dashed lines mark locked decision threshold (0.7910) and CF target margin (0.7710).
              </p>

              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={probComparisonData}
                    margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
                    barSize={56}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="stage"
                      tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 1]}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => Number(value ?? 0).toFixed(6)}
                      contentStyle={{
                        borderRadius: '8px',
                        borderColor: '#E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine
                      y={counterfactual.threshold}
                      stroke="#DC2626"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Threshold 0.791',
                        position: 'insideTopRight',
                        fill: '#DC2626',
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      y={counterfactual.target_probability}
                      stroke="#0284C7"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Target 0.771',
                        position: 'insideBottomRight',
                        fill: '#0284C7',
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="probability" name="Mortality Prob." radius={[6, 6, 0, 0]}>
                      {probComparisonData.map((entry) => (
                        <Cell key={entry.stage} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {counterfactual.note && (
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  {counterfactual.note}
                </p>
              )}
            </section>

            {/* Changed Features Diff Table */}
            <section className="rounded-xl border border-slate-200 bg-white xl:col-span-7">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Modified Features & Values ({counterfactual.changed_features.length})
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Gradient-guided perturbations bounded to training 1st–99th percentiles with paired min/max projection.
                </p>
              </div>

              {counterfactual.changed_features.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    No feature changes required
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {counterfactual.already_below
                      ? 'The original predicted probability is already at or below the counterfactual target probability (0.770981).'
                      : 'No feasible bounded perturbation reduced predicted mortality risk further within the search budget.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3">Feature</th>
                        <th className="px-4 py-3 text-right">Original</th>
                        <th className="px-4 py-3 text-right">Counterfactual</th>
                        <th className="px-4 py-3 text-right">Delta</th>
                        <th className="px-5 py-3 text-right">1st–99th Bounds</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {counterfactual.changed_features.map((cf) => (
                        <tr key={cf.feature} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-slate-900">{cf.label}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {cf.feature}
                              {cf.note ? ` · ${cf.note}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                            {cf.original_value.toFixed(2)} {cf.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-teal-700 tabular-nums">
                            {cf.counterfactual_value.toFixed(2)} {cf.unit}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                              cf.delta < 0 ? 'text-sky-700' : 'text-teal-700'
                            }`}
                          >
                            {cf.delta > 0 ? '+' : ''}
                            {cf.delta.toFixed(2)} {cf.unit}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-slate-500 tabular-nums">
                            [{cf.lower_bound}, {cf.upper_bound}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Constraint Validation Audit */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Constraint Validation & Plausibility Diagnostics
                </h3>
                <p className="text-xs text-slate-500">
                  Automated structural audit matching Section 14 of the reference notebook.
                </p>
              </div>
              {counterfactual.constraint_validation.nn_distance !== undefined && (
                <div className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                  Nearest-Neighbour Distance (397-dim):{' '}
                  <span className="text-sky-700">
                    {counterfactual.constraint_validation.nn_distance.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldCheck
                    className={`h-4 w-4 ${
                      counterfactual.constraint_validation.bounds_valid
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  />
                  <span>1st–99th Percentile Bounds</span>
                </div>
                <div className="mt-1.5 font-mono text-xs text-slate-700 tabular-nums">
                  {counterfactual.constraint_validation.new_bound_violations} new violations ·{' '}
                  {counterfactual.constraint_validation.total_mutable_features} mutable features
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldCheck
                    className={`h-4 w-4 ${
                      counterfactual.constraint_validation.min_max_pairs_valid
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  />
                  <span>Min / Max Ordering Pairs</span>
                </div>
                <div className="mt-1.5 font-mono text-xs text-slate-700 tabular-nums">
                  {counterfactual.constraint_validation.new_pair_violations} new violations ·{' '}
                  {counterfactual.constraint_validation.checked_pairs_count} checked pairs
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldCheck
                    className={`h-4 w-4 ${
                      counterfactual.constraint_validation.immutable_preserved
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  />
                  <span>Immutable & Non-Actionable</span>
                </div>
                <div className="mt-1.5 text-xs text-slate-600">
                  {IMMUTABLE_AND_NON_ACTIONABLE.slice(0, 5).join(', ')} + diagnosis/LOS locked
                </div>
              </div>
            </div>

            {counterfactual.constraint_validation.plausibility_note && (
              <p className="mt-3 text-xs text-slate-500">
                {counterfactual.constraint_validation.plausibility_note}
              </p>
            )}
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <GitCompareArrows className="mx-auto h-8 w-8 text-teal-600" />
          <h3 className="mt-3 text-base font-bold text-slate-900">
            Ready to Generate Gradient-Guided Counterfactuals
          </h3>
          <p className="mx-auto mt-1.5 max-w-xl text-xs leading-relaxed text-slate-600">
            {prediction
              ? `Active patient predicted at ${prediction.probability.toFixed(6)}. Click "Generate Counterfactual" above to compute constrained perturbations toward target ≤ ${STUDY_METADATA.cfTargetProbability.toFixed(6)}.`
              : 'Load one of the sample ICU cases or predict a patient profile on Page 2, then click "Generate Counterfactual" to inspect feature deltas and constraint audits.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onLoadSampleAndExplain(SAMPLE_PATIENT_PROFILES[0])}
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
            >
              Load Notebook Validation Case #01 & Explain
            </button>
            <button
              type="button"
              onClick={() => onLoadSampleAndExplain(SAMPLE_PATIENT_PROFILES[1])}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Load Test Pattern #216 & Explain
            </button>
          </div>
        </section>
      )}

      {/* Notebook 300-Case Counterfactual Method Benchmark */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">
            300-Case Held-Out Test Benchmark — Method Comparison
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Reference evaluation from the notebook comparing Gradient-Guided, Greedy Single-Feature, and Random-Feature search on 300 identical test cases (all failures included in denominators; 0 bound/pair violations across all methods).
          </p>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-12">
          <div className="h-64 w-full xl:col-span-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={benchmarkChartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'Success Rate (%)'
                      ? `${Number(value ?? 0).toFixed(2)}%`
                      : (Number(value ?? 0) / 100).toFixed(4)
                  }
                  contentStyle={{
                    borderRadius: '8px',
                    borderColor: '#E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="successRate"
                  name="Success Rate (%)"
                  fill="#0D9488"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="meanCostScaled"
                  name="Mean L1 Cost (×100)"
                  fill="#0284C7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto xl:col-span-7">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">Search Method</th>
                  <th className="px-3 py-2.5 text-right">Success</th>
                  <th className="px-3 py-2.5 text-right">Mean Cost</th>
                  <th className="px-3 py-2.5 text-right">Median Cost</th>
                  <th className="px-3 py-2.5 text-right">Avg Changed</th>
                  <th className="px-3 py-2.5 text-right">Median NN Dist</th>
                  <th className="px-3 py-2.5 text-right">Violations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CF_METHOD_BENCHMARKS.map((m) => (
                  <tr
                    key={m.method}
                    className={m.method === 'gradient_guided' ? 'bg-teal-50/40' : ''}
                  >
                    <td className="px-3 py-2.5 font-semibold text-slate-900">
                      {m.label}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-teal-700 tabular-nums">
                      {m.successRatePct.toFixed(2)}% ({m.successes}/{m.totalCases})
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800 tabular-nums">
                      {m.meanCost.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800 tabular-nums">
                      {m.medianSuccessCost.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800 tabular-nums">
                      {m.meanChangedFeatures.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800 tabular-nums">
                      {m.medianNnDistance.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-700 tabular-nums">
                      {m.boundViolations + m.pairViolations}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paired Bootstrap & Stability summary */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Paired Bootstrap Success Differences (95% CI)
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-700">
                  {CF_PAIRWISE_BOOTSTRAP.map((b) => (
                    <li
                      key={b.comparison}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{b.comparison}</span>
                      <span className="shrink-0 font-mono font-semibold tabular-nums">
                        {b.diffPctPoints > 0 ? '+' : ''}
                        {b.diffPctPoints.toFixed(1)} pp [{b.ciLowPctPoints.toFixed(1)},{' '}
                        {b.ciHighPctPoints.toFixed(1)}]
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Retraining Seed Stability (n = {CF_STABILITY_SUMMARY.sampleSize})
                </div>
                <div className="mt-1.5 space-y-1 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Success across seeds (11 / 29 / 47)</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {CF_STABILITY_SUMMARY.seeds
                        .map((s) => `${s.successRatePct.toFixed(0)}%`)
                        .join(' / ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mean pairwise Jaccard overlap</span>
                    <span className="font-mono font-semibold text-teal-700 tabular-nums">
                      {CF_STABILITY_SUMMARY.meanPairwiseJaccard.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Median pairwise Jaccard overlap</span>
                    <span className="font-mono tabular-nums">
                      {CF_STABILITY_SUMMARY.medianPairwiseJaccard.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
