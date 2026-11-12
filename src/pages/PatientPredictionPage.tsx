import { ChangeEvent, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  FileJson,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { FEATURE_DEFINITIONS, STUDY_METADATA } from '../data/notebookReference';
import { SAMPLE_PATIENT_PROFILES } from '../data/samplePatients';
import { validatePatientPairOrdering } from '../services/icuApi';
import {
  BackendConfig,
  FeatureDefinition,
  PatientFeatures,
  PredictionResult,
  SamplePatientProfile,
} from '../types/icu';

interface PatientPredictionPageProps {
  features: PatientFeatures;
  onChangeFeatures: (next: PatientFeatures) => void;
  onSelectSample: (profile: SamplePatientProfile) => void;
  activeSampleId: string | null;
  prediction: PredictionResult | null;
  predicting: boolean;
  predictionError: string | null;
  fallbackNotice: string | null;
  backendConfig: BackendConfig;
  onPredict: () => void;
  onGoToCounterfactual: () => void;
}

const GROUP_TITLES: Record<FeatureDefinition['group'], { title: string; subtitle: string }> = {
  context: {
    title: 'Demographics & Admission Context',
    subtitle: 'Immutable / non-actionable variables excluded from counterfactual changes',
  },
  apache: {
    title: 'APACHE II / III Physiology',
    subtitle: 'Core acute physiological measurements captured during first 24 hours',
  },
  blood_gas: {
    title: 'Oxygenation & Acid-Base',
    subtitle: 'Arterial blood gas & inspired oxygen parameters',
  },
  markers: {
    title: 'Day-1 & Hour-1 Paired Markers',
    subtitle: 'Min/Max physiological bounds enforced during counterfactual search',
  },
};

export function PatientPredictionPage({
  features,
  onChangeFeatures,
  onSelectSample,
  activeSampleId,
  prediction,
  predicting,
  predictionError,
  fallbackNotice,
  backendConfig,
  onPredict,
  onGoToCounterfactual,
}: PatientPredictionPageProps) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccessMsg, setJsonSuccessMsg] = useState<string | null>(null);

  const pairIssues = validatePatientPairOrdering(features);
  const extraCount = features.extraFeatures
    ? Object.keys(features.extraFeatures).length
    : 0;

  function handleNumericChange(
    key: FeatureDefinition['key'],
    rawValue: string,
  ) {
    if (rawValue === '') {
      onChangeFeatures({
        ...features,
        [key]: null,
      });
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isNaN(parsed)) {
      onChangeFeatures({
        ...features,
        [key]: parsed,
      });
    }
  }

  function handleSelectChange(
    key: FeatureDefinition['key'],
    rawValue: string,
  ) {
    if (key === 'elective_surgery') {
      onChangeFeatures({
        ...features,
        elective_surgery: rawValue === '1' ? 1 : 0,
      });
      return;
    }
    onChangeFeatures({
      ...features,
      [key]: rawValue,
    });
  }

  function applyImportedJson(rawJson: string) {
    setJsonError(null);
    setJsonSuccessMsg(null);
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON payload must be a flat key-value patient feature object.');
      }

      const sourceObj =
        parsed.features &&
        typeof parsed.features === 'object' &&
        !Array.isArray(parsed.features)
          ? (parsed.features as Record<string, unknown>)
          : parsed;

      const updated: PatientFeatures = { ...features };
      const extra: Record<string, number | string | boolean | null> = {
        ...(features.extraFeatures ?? {}),
      };
      const coreKeySet = new Set<string>(FEATURE_DEFINITIONS.map((d) => d.key));
      let mappedCoreCount = 0;
      let mappedExtraCount = 0;

      for (const [k, val] of Object.entries(sourceObj)) {
        if (coreKeySet.has(k)) {
          const def = FEATURE_DEFINITIONS.find((d) => d.key === k)!;
          if (def.inputType === 'number') {
            if (val === null || val === '') {
              (updated as unknown as Record<string, unknown>)[k] = null;
              mappedCoreCount++;
            } else if (typeof val === 'number' && Number.isFinite(val)) {
              (updated as unknown as Record<string, unknown>)[k] = val;
              mappedCoreCount++;
            } else if (typeof val === 'string' && !Number.isNaN(Number(val))) {
              (updated as unknown as Record<string, unknown>)[k] = Number(val);
              mappedCoreCount++;
            }
          } else if (k === 'elective_surgery') {
            updated.elective_surgery = Number(val) === 1 ? 1 : 0;
            mappedCoreCount++;
          } else if (k === 'gender' && (val === 'M' || val === 'F')) {
            updated.gender = val;
            mappedCoreCount++;
          } else if (typeof val === 'string') {
            (updated as unknown as Record<string, unknown>)[k] = val;
            mappedCoreCount++;
          }
        } else if (
          val === null ||
          typeof val === 'number' ||
          typeof val === 'string' ||
          typeof val === 'boolean'
        ) {
          extra[k] = val;
          mappedExtraCount++;
        }
      }

      updated.extraFeatures = Object.keys(extra).length > 0 ? extra : undefined;
      onChangeFeatures(updated);
      setJsonSuccessMsg(
        `Imported ${mappedCoreCount} core features${mappedExtraCount > 0 ? ` and ${mappedExtraCount} additional WiDS columns` : ''}.`,
      );
      setJsonOpen(false);
    } catch (err) {
      setJsonError(
        err instanceof Error ? err.message : 'Unable to parse JSON patient payload.',
      );
    }
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      setJsonText(content);
      applyImportedJson(content);
    };
    reader.readAsText(file);
  }

  const groups: FeatureDefinition['group'][] = [
    'context',
    'apache',
    'blood_gas',
    'markers',
  ];

  const probPct = prediction ? prediction.probability * 100 : null;
  const thresholdPct = STUDY_METADATA.lockedThreshold * 100;
  const targetPct = STUDY_METADATA.cfTargetProbability * 100;

  return (
    <div className="space-y-6">
      {/* Sample Patient & JSON Import Toolbar */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ICU Patient Feature Input
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Enter curated clinical parameters or import a full WiDS JSON patient record ({STUDY_METADATA.predictorColumns} predictor schema supported).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setJsonError(null);
                setJsonOpen((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileJson className="h-3.5 w-3.5 text-sky-600" />
              <span>Import Patient JSON</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectSample(SAMPLE_PATIENT_PROFILES[0])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset to Validation Case</span>
            </button>
          </div>
        </div>

        {/* Sample patient presets */}
        <div className="mt-4 grid gap-2.5 md:grid-cols-3">
          {SAMPLE_PATIENT_PROFILES.map((profile) => {
            const isSelected = activeSampleId === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => onSelectSample(profile)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/50'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {profile.name}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-teal-700 tabular-nums">
                    p₀={profile.demoPrediction.probability.toFixed(3)}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                  {profile.cohortTag}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-600">
                  {profile.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* JSON Import Drawer */}
        {jsonOpen && (
          <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Import Full Patient JSON Record
                </div>
                <p className="text-[11px] text-slate-600">
                  Paste or upload a JSON object containing any subset or all {STUDY_METADATA.predictorColumns} WiDS features. Unrecognized extra columns are forwarded to FastAPI unchanged.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJsonOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
                aria-label="Close JSON importer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              rows={5}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"age": 68, "map_apache": 45, "h1_lactate_max": 6.8, "d1_spo2_min": 79, ...}'
              className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
            />

            {jsonError && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload .json File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => applyImportedJson(jsonText)}
                disabled={!jsonText.trim()}
                className="rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                Apply JSON to Form
              </button>
            </div>
          </div>
        )}

        {(jsonSuccessMsg || extraCount > 0) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-sky-800">
            <Info className="h-4 w-4 shrink-0 text-sky-600" />
            <span>
              {jsonSuccessMsg ? `${jsonSuccessMsg} ` : ''}
              {extraCount > 0
                ? `${extraCount} extra WiDS JSON columns attached for FastAPI forwarding.`
                : ''}
            </span>
          </div>
        )}
      </section>

      {/* Main Split: Form Left + Prediction Output Right */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Form Sections */}
        <div className="space-y-5 xl:col-span-8">
          {pairIssues.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <div className="font-semibold">Min / Max Ordering Constraint Violation</div>
                <ul className="mt-0.5 list-disc pl-4">
                  {pairIssues.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {groups.map((groupKey) => {
            const defs = FEATURE_DEFINITIONS.filter((d) => d.group === groupKey);
            const meta = GROUP_TITLES[groupKey];
            return (
              <section
                key={groupKey}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">{meta.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{meta.subtitle}</p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {defs.map((def) => {
                    const val = features[def.key];
                    const numVal = typeof val === 'number' ? val : null;
                    const outsideBounds =
                      numVal !== null &&
                      def.minBound !== undefined &&
                      def.maxBound !== undefined &&
                      (numVal < def.minBound || numVal > def.maxBound);

                    return (
                      <div key={def.key}>
                        <div className="flex items-baseline justify-between gap-2">
                          <label
                            htmlFor={`field-${def.key}`}
                            className="text-xs font-semibold text-slate-700"
                          >
                            {def.label}
                          </label>
                          {def.unit && (
                            <span className="font-mono text-[11px] text-slate-400">
                              {def.unit}
                            </span>
                          )}
                        </div>

                        {def.inputType === 'select' ? (
                          <select
                            id={`field-${def.key}`}
                            value={String(val ?? '')}
                            onChange={(e) => handleSelectChange(def.key, e.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
                          >
                            {def.options?.map((opt) => (
                              <option key={String(opt.value)} value={String(opt.value)}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`field-${def.key}`}
                            type="number"
                            step={def.step ?? 'any'}
                            value={val === null || val === undefined ? '' : String(val)}
                            onChange={(e) => handleNumericChange(def.key, e.target.value)}
                            placeholder="Missing (imputed)"
                            className={`mt-1.5 w-full rounded-lg border px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:outline-none ${
                              outsideBounds
                                ? 'border-amber-400 bg-amber-50/40 focus:border-amber-600'
                                : 'border-slate-300 bg-white focus:border-teal-600'
                            }`}
                          />
                        )}

                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono">{def.key}</span>
                          {def.minBound !== undefined && def.maxBound !== undefined ? (
                            <span
                              className={`font-mono tabular-nums ${
                                outsideBounds ? 'font-semibold text-amber-700' : ''
                              }`}
                            >
                              1–99%: {def.minBound}–{def.maxBound}
                            </span>
                          ) : (
                            <span>{def.immutable ? 'Immutable' : 'Non-actionable'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Sticky Prediction Output Panel */}
        <aside className="xl:col-span-4">
          <div className="sticky top-20 space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Mortality Risk Prediction
                </h3>
                <span className="font-mono text-[11px] text-slate-500">
                  {STUDY_METADATA.selectedModel}
                </span>
              </div>

              <button
                type="button"
                onClick={onPredict}
                disabled={predicting || pairIssues.length > 0}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-teal-600"
              >
                {predicting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running Prediction...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Predict Mortality Probability</span>
                  </>
                )}
              </button>

              {predictionError && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <div className="font-semibold">Backend Connection Error</div>
                  <p className="mt-0.5">{predictionError}</p>
                </div>
              )}

              {fallbackNotice && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="font-semibold">FastAPI Unreachable — Demo Fallback Used</div>
                  <p className="mt-0.5 text-amber-800">{fallbackNotice}</p>
                </div>
              )}

              {prediction ? (
                <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                  {/* Source label */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Execution Source</span>
                    <span
                      className={`font-semibold ${
                        prediction.data_source === 'fastapi'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {prediction.data_source === 'fastapi'
                        ? 'Live Python FastAPI Model'
                        : 'Synthetic Demonstration Mode'}
                    </span>
                  </div>

                  {/* Predicted Probability */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-medium text-slate-500">
                      Predicted Hospital Mortality Probability
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span
                        className={`font-mono text-3xl font-bold tabular-nums ${
                          prediction.classification === 1
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {prediction.probability.toFixed(6)}
                      </span>
                      <span className="font-mono text-sm font-semibold text-slate-600 tabular-nums">
                        ({(prediction.probability * 100).toFixed(2)}%)
                      </span>
                    </div>

                    {/* Visual threshold gauge */}
                    <div className="mt-4">
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full transition-all duration-300 ${
                            prediction.classification === 1
                              ? 'bg-rose-600'
                              : 'bg-teal-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, probPct ?? 0))}%` }}
                        />
                        {/* Locked threshold marker */}
                        <div
                          className="absolute top-0 h-full w-0.5 bg-slate-900"
                          style={{ left: `${thresholdPct}%` }}
                          title={`Locked threshold: ${STUDY_METADATA.lockedThreshold.toFixed(6)}`}
                        />
                        {/* CF target marker */}
                        <div
                          className="absolute top-0 h-full w-0.5 bg-sky-600"
                          style={{ left: `${targetPct}%` }}
                          title={`CF target: ${STUDY_METADATA.cfTargetProbability.toFixed(6)}`}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums">
                        <span>0.00</span>
                        <span>
                          CF Target {prediction.target_probability.toFixed(3)} · Cutoff{' '}
                          {prediction.threshold.toFixed(3)}
                        </span>
                        <span>1.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Classification & Threshold breakdown */}
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500">Binary Classification</dt>
                      <dd
                        className={`font-semibold ${
                          prediction.classification === 1
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {prediction.risk_label} (ŷ = {prediction.classification})
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500">Locked Decision Threshold</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {prediction.threshold.toFixed(6)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500">Margin to Threshold</dt>
                      <dd className="font-mono font-medium text-slate-800 tabular-nums">
                        {prediction.probability - prediction.threshold >= 0 ? '+' : ''}
                        {(prediction.probability - prediction.threshold).toFixed(6)}
                      </dd>
                    </div>
                  </dl>

                  {prediction.note && (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600">
                      {prediction.note}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={onGoToCounterfactual}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <span>Inspect Counterfactual Explanation</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
                  <p className="text-xs font-medium text-slate-700">
                    No prediction executed for the current inputs.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Click <strong className="font-semibold">Predict Mortality Probability</strong> above to score this patient profile ({backendConfig.mode === 'demo' ? 'Synthetic Demo Mode' : backendConfig.baseUrl ? 'FastAPI / Auto Fallback' : 'Synthetic Demo Fallback'}).
                  </p>
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
