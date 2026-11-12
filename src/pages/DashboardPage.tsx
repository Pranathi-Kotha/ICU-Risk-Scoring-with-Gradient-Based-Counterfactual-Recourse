import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Database, GitBranch, Layers, ShieldCheck } from 'lucide-react';
import {
  CALIBRATION_POINTS,
  MLP_TEST_CONFUSION_MATRIX,
  ROC_CURVE_POINTS,
  STUDY_METADATA,
  TEST_FAMILY_METRICS,
  VALIDATION_CANDIDATES,
} from '../data/notebookReference';

export function DashboardPage() {
  const [tableScope, setTableScope] = useState<'test' | 'validation'>('test');
  const [barMetricGroup, setBarMetricGroup] = useState<'discrimination' | 'calibration'>(
    'discrimination',
  );
  const [curveMode, setCurveMode] = useState<'roc' | 'calibration'>('roc');

  const barData = TEST_FAMILY_METRICS.map((m) => ({
    name:
      m.family === 'LogisticRegression'
        ? 'Logistic Reg.'
        : m.family === 'RandomForest'
          ? 'Random Forest'
          : 'MLP (Selected)',
    rocAuc: m.rocAuc,
    prAuc: m.prAuc,
    brier: m.brier,
    logLoss: m.logLoss,
  }));

  return (
    <div className="space-y-6">
      {/* Project Overview Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <span>{STUDY_METADATA.datasetName}</span>
              <span className="text-slate-300">·</span>
              <span>Target: {STUDY_METADATA.targetColumn}</span>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
              ICU Mortality Prediction & Counterfactual Explainability Benchmark
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Controlled academic evaluation comparing Logistic Regression, Random Forest, and a regularized Multi-Layer Perceptron on{' '}
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {STUDY_METADATA.totalEncounters.toLocaleString()}
              </span>{' '}
              ICU encounters ({STUDY_METADATA.predictorColumns} raw predictors →{' '}
              {STUDY_METADATA.transformedFeatures} preprocessed features). The{' '}
              <span className="font-mono font-semibold text-slate-900">
                {STUDY_METADATA.selectedModel}
              </span>{' '}
              model and F1-maximizing operating threshold (
              <span className="font-mono font-semibold text-teal-700 tabular-nums">
                {STUDY_METADATA.lockedThreshold.toFixed(6)}
              </span>
              ) were locked on validation data prior to one-time test evaluation.
            </p>
          </div>

          {/* Split summary grid */}
          <div className="grid shrink-0 grid-cols-3 gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:min-w-[320px]">
            {STUDY_METADATA.splits.map((s) => (
              <div key={s.split} className="px-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {s.split}
                </div>
                <div className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {s.count.toLocaleString()}
                </div>
                <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {(s.prevalence * 100).toFixed(2)}% deaths
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-teal-600" />
            Split: <strong className="font-semibold text-slate-800">{STUDY_METADATA.splitStrategy}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            Patient Overlap: <strong className="font-mono font-semibold text-slate-800 tabular-nums">{STUDY_METADATA.patientOverlap}</strong> across splits
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-sky-600" />
            Selection Metric: <strong className="font-semibold text-slate-800">{STUDY_METADATA.selectionCriterion}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-sky-600" />
            Architecture: <span className="font-mono text-[11px] text-slate-700">{STUDY_METADATA.selectedModelArchitecture}</span>
          </span>
        </div>
      </section>

      {/* Frozen MLP Test KPI Strip */}
      <section aria-label="Frozen MLP test evaluation summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Test ROC-AUC (MLP)
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            0.8997
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Highest discrimination across families
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Test PR-AUC (MLP)
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-teal-700 tabular-nums">
            0.5810
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            95% CI [0.5530, 0.6075] · Baseline 0.0863
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Test Brier Score (MLP)
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            0.1070
          </div>
          <div className="mt-1 text-xs text-slate-500">
            RF lowest at <span className="font-mono tabular-nums">0.0612</span> · LR <span className="font-mono tabular-nums">0.1298</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Test Log Loss (MLP)
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            0.3308
          </div>
          <div className="mt-1 text-xs text-slate-500">
            RF <span className="font-mono tabular-nums">0.2224</span> · LR <span className="font-mono tabular-nums">0.4132</span>
          </div>
        </div>
      </section>

      {/* Model Comparison Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Model Performance Comparison
            </h3>
            <p className="text-xs text-slate-500">
              {tableScope === 'test'
                ? 'One-time held-out test comparison of the best validation configuration per model family (n = 13,757).'
                : 'Validation model selection benchmark across all 7 predeclared candidate runs (n = 13,757).'}
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-start">
            <button
              type="button"
              onClick={() => setTableScope('test')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tableScope === 'test'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Test Comparison (3 Families)
            </button>
            <button
              type="button"
              onClick={() => setTableScope('validation')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tableScope === 'validation'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Validation Selection (7 Runs)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tableScope === 'test' ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Model Family</th>
                  <th className="px-4 py-3">Selected Config</th>
                  <th className="px-4 py-3 text-right">ROC-AUC</th>
                  <th className="px-4 py-3 text-right">PR-AUC</th>
                  <th className="px-4 py-3 text-right">PR-AUC 95% CI</th>
                  <th className="px-4 py-3 text-right">Brier Score</th>
                  <th className="px-5 py-3 text-right">Log Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TEST_FAMILY_METRICS.map((row) => (
                  <tr
                    key={row.family}
                    className={row.selected ? 'bg-teal-50/40' : 'hover:bg-slate-50/80'}
                  >
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>
                          {row.family === 'LogisticRegression'
                            ? 'Logistic Regression'
                            : row.family === 'RandomForest'
                              ? 'Random Forest'
                              : 'MLP (Frozen)'}
                        </span>
                        {row.selected && (
                          <CheckCircle2
                            className="h-4 w-4 text-teal-600"
                            aria-label="Selected model"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {row.configLabel}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 tabular-nums">
                      {row.rocAuc.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-teal-700 tabular-nums">
                      {row.prAuc.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      [{row.prAucCiLow.toFixed(4)}, {row.prAucCiHigh.toFixed(4)}]
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 tabular-nums">
                      {row.brier.toFixed(6)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-900 tabular-nums">
                      {row.logLoss.toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Candidate Run</th>
                  <th className="px-4 py-3">Family</th>
                  <th className="px-4 py-3 text-right">Val ROC-AUC</th>
                  <th className="px-4 py-3 text-right">Val PR-AUC</th>
                  <th className="px-4 py-3 text-right">Val Brier Score</th>
                  <th className="px-5 py-3 text-right">Val Log Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {VALIDATION_CANDIDATES.map((row) => (
                  <tr
                    key={row.candidate}
                    className={row.selected ? 'bg-teal-50/40' : 'hover:bg-slate-50/80'}
                  >
                    <td className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-900">
                      <span className="inline-flex items-center gap-2">
                        {row.candidate}
                        {row.selected && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{row.family}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-900 tabular-nums">
                      {row.rocAuc.toFixed(6)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-teal-700 tabular-nums">
                      {row.prAuc.toFixed(6)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-900 tabular-nums">
                      {row.brier.toFixed(6)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-900 tabular-nums">
                      {row.logLoss.toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Recharts Visualizations + Confusion Matrix */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Metric Comparison Bar Chart */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Test-Set Metric Benchmark
              </h3>
              <p className="text-xs text-slate-500">
                {barMetricGroup === 'discrimination'
                  ? 'ROC-AUC and PR-AUC across families (higher is better)'
                  : 'Brier Score and Log Loss across families (lower is better)'}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-start">
              <button
                type="button"
                onClick={() => setBarMetricGroup('discrimination')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  barMetricGroup === 'discrimination'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ROC / PR-AUC
              </button>
              <button
                type="button"
                onClick={() => setBarMetricGroup('calibration')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  barMetricGroup === 'calibration'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Brier / Log Loss
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={barMetricGroup === 'discrimination' ? [0, 1] : [0, 0.5]}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => Number(value ?? 0).toFixed(4)}
                  contentStyle={{
                    borderRadius: '8px',
                    borderColor: '#E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {barMetricGroup === 'discrimination' ? (
                  <>
                    <Bar
                      dataKey="rocAuc"
                      name="ROC-AUC"
                      fill="#0284C7"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="prAuc"
                      name="PR-AUC"
                      fill="#0D9488"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="brier"
                      name="Brier Score"
                      fill="#0D9488"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="logLoss"
                      name="Log Loss"
                      fill="#1E293B"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ROC & Calibration Curves */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {curveMode === 'roc'
                  ? 'ROC Discrimination Curves'
                  : 'Probability Calibration Profile'}
              </h3>
              <p className="text-xs text-slate-500">
                {curveMode === 'roc'
                  ? 'Notebook test-set ROC curve profile across thresholds (MLP AUC 0.900 vs LR 0.898 vs RF 0.895)'
                  : '10-quantile calibration profile illustrating RF calibration advantage (Brier 0.0612 vs MLP 0.1070)'}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-start">
              <button
                type="button"
                onClick={() => setCurveMode('roc')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  curveMode === 'roc'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ROC Curve
              </button>
              <button
                type="button"
                onClick={() => setCurveMode('calibration')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  curveMode === 'calibration'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calibration
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {curveMode === 'roc' ? (
                <LineChart
                  data={ROC_CURVE_POINTS}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="fpr"
                    type="number"
                    domain={[0, 1]}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    label={{
                      value: 'False Positive Rate',
                      position: 'insideBottom',
                      offset: -2,
                      fontSize: 11,
                      fill: '#64748B',
                    }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => Number(value ?? 0).toFixed(3)}
                    contentStyle={{
                      borderRadius: '8px',
                      borderColor: '#E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="mlp"
                    name="MLP (AUC 0.900)"
                    stroke="#0D9488"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lr"
                    name="Logistic Reg (AUC 0.898)"
                    stroke="#0284C7"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rf"
                    name="Random Forest (AUC 0.895)"
                    stroke="#64748B"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="linear"
                    dataKey="baseline"
                    name="Chance"
                    stroke="#CBD5E1"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              ) : (
                <LineChart
                  data={CALIBRATION_POINTS}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="predicted"
                    type="number"
                    domain={[0, 1]}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    label={{
                      value: 'Mean Predicted Probability',
                      position: 'insideBottom',
                      offset: -2,
                      fontSize: 11,
                      fill: '#64748B',
                    }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => Number(value ?? 0).toFixed(3)}
                    contentStyle={{
                      borderRadius: '8px',
                      borderColor: '#E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="linear"
                    dataKey="perfect"
                    name="Perfect Calibration"
                    stroke="#94A3B8"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rf"
                    name="Random Forest (Brier 0.061)"
                    stroke="#0284C7"
                    strokeWidth={2.2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mlp"
                    name="MLP (Brier 0.107)"
                    stroke="#0D9488"
                    strokeWidth={2.2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lr"
                    name="Logistic Reg (Brier 0.130)"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    dot={{ r: 2.5 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Confusion Matrix & Operating Threshold Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Locked Threshold Operating Point — Held-Out Test Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated once on <span className="font-mono tabular-nums">13,757</span> test encounters at validation-locked threshold{' '}
              <span className="font-mono font-semibold text-teal-700 tabular-nums">
                {STUDY_METADATA.lockedThreshold.toFixed(6)}
              </span>
              .
            </p>
          </div>
          <div className="font-mono text-xs text-slate-600 tabular-nums">
            F1 {MLP_TEST_CONFUSION_MATRIX.f1.toFixed(4)} · Precision{' '}
            {MLP_TEST_CONFUSION_MATRIX.precision.toFixed(4)} · Recall{' '}
            {MLP_TEST_CONFUSION_MATRIX.recall.toFixed(4)} · Specificity{' '}
            {MLP_TEST_CONFUSION_MATRIX.specificity.toFixed(4)}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-medium text-slate-500">True Negatives (TN)</div>
            <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
              {MLP_TEST_CONFUSION_MATRIX.tn.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">Survived · Predicted Below</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-medium text-slate-500">False Positives (FP)</div>
            <div className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums">
              {MLP_TEST_CONFUSION_MATRIX.fp.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">Survived · Flagged High Risk</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-medium text-slate-500">False Negatives (FN)</div>
            <div className="mt-1 font-mono text-xl font-bold text-rose-700 tabular-nums">
              {MLP_TEST_CONFUSION_MATRIX.fn.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">Deceased · Predicted Below</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-teal-50/60 p-3.5">
            <div className="text-xs font-medium text-teal-800">True Positives (TP)</div>
            <div className="mt-1 font-mono text-xl font-bold text-teal-800 tabular-nums">
              {MLP_TEST_CONFUSION_MATRIX.tp.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-teal-700">Deceased · Flagged High Risk</div>
          </div>
        </div>
      </section>
    </div>
  );
}
