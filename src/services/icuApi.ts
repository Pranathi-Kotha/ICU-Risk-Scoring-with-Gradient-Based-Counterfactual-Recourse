import {
  BackendConfig,
  ChangedFeature,
  CounterfactualResult,
  PatientFeatures,
  PredictionResult,
} from '../types/icu';
import { FEATURE_DEFINITIONS, STUDY_METADATA } from '../data/notebookReference';
import { SAMPLE_PATIENT_PROFILES } from '../data/samplePatients';

const STORAGE_KEY = 'icu_insight_backend_config';

export function getInitialBackendConfig(): BackendConfig {
  const envUrl = import.meta.env.VITE_API_BASE_URL || '';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BackendConfig>;
      return {
        baseUrl: parsed.baseUrl ?? envUrl,
        mode: parsed.mode ?? 'auto',
        status: parsed.mode === 'demo' ? 'demo_only' : 'untested',
      };
    }
  } catch {
    // ignore storage access issues
  }
  return {
    baseUrl: envUrl,
    mode: 'auto',
    status: envUrl ? 'untested' : 'demo_only',
  };
}

export function saveBackendConfig(config: BackendConfig): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        baseUrl: config.baseUrl,
        mode: config.mode,
      }),
    );
  } catch {
    // ignore storage write errors
  }
}

function normalizeUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function validatePatientPairOrdering(features: PatientFeatures): string[] {
  const issues: string[] = [];
  if (
    features.d1_spo2_min !== null &&
    features.d1_spo2_max !== null &&
    features.d1_spo2_min > features.d1_spo2_max
  ) {
    issues.push('Day-1 SpO2 Min exceeds Day-1 SpO2 Max.');
  }
  if (
    features.h1_lactate_min !== null &&
    features.h1_lactate_max !== null &&
    features.h1_lactate_min > features.h1_lactate_max
  ) {
    issues.push('Hour-1 Lactate Min exceeds Hour-1 Lactate Max.');
  }
  return issues;
}

export function buildFastApiPayload(features: PatientFeatures): Record<string, unknown> {
  const { extraFeatures, ...core } = features;
  return {
    features: {
      ...(extraFeatures ?? {}),
      ...core,
    },
    threshold: STUDY_METADATA.lockedThreshold,
    target_probability: STUDY_METADATA.cfTargetProbability,
    model_name: STUDY_METADATA.selectedModel,
  };
}

function findMatchingSamplePreset(features: PatientFeatures) {
  const coreKeys = FEATURE_DEFINITIONS.map((d) => d.key);
  return SAMPLE_PATIENT_PROFILES.find((preset) =>
    coreKeys.every((key) => preset.features[key] === features[key]),
  );
}

/**
 * Produces explicitly labeled synthetic demonstration results when no live FastAPI
 * backend is connected. Never presented as real PyTorch inference.
 */
function buildSyntheticDemoPrediction(features: PatientFeatures): PredictionResult {
  const matchedPreset = findMatchingSamplePreset(features);
  if (matchedPreset) {
    return {
      ...matchedPreset.demoPrediction,
      timestamp: new Date().toISOString(),
    };
  }

  // Deterministic synthetic scoring preview strictly for un-connected UI demonstration
  let score = -2.1;
  if (features.map_apache !== null && features.map_apache < 65) {
    score += (65 - features.map_apache) * 0.045;
  }
  if (features.h1_lactate_max !== null && features.h1_lactate_max > 2.0) {
    score += (features.h1_lactate_max - 2.0) * 0.36;
  }
  if (features.d1_spo2_min !== null && features.d1_spo2_min < 90) {
    score += (90 - features.d1_spo2_min) * 0.055;
  }
  if (features.resprate_apache !== null && features.resprate_apache > 24) {
    score += (features.resprate_apache - 24) * 0.032;
  }
  if (features.heart_rate_apache !== null && features.heart_rate_apache > 105) {
    score += (features.heart_rate_apache - 105) * 0.018;
  }
  if (features.bun_apache !== null && features.bun_apache > 25) {
    score += (features.bun_apache - 25) * 0.014;
  }
  if (features.ph_apache !== null && features.ph_apache < 7.35) {
    score += (7.35 - features.ph_apache) * 4.2;
  }
  if (features.age !== null && features.age > 65) {
    score += (features.age - 65) * 0.015;
  }
  if (features.elective_surgery === 1) {
    score -= 0.7;
  }

  const prob = Number((1 / (1 + Math.exp(-score))).toFixed(6));
  const classification = prob >= STUDY_METADATA.lockedThreshold ? 1 : 0;

  return {
    probability: prob,
    threshold: STUDY_METADATA.lockedThreshold,
    target_probability: STUDY_METADATA.cfTargetProbability,
    classification,
    risk_label:
      classification === 1 ? 'High Mortality Risk' : 'Below Operating Threshold',
    model_name: STUDY_METADATA.selectedModel,
    data_source: 'synthetic_demo',
    note: 'Synthetic Demonstration Mode active: custom edits previewed using demo heuristics. Connect Python FastAPI to run the actual trained MLP.',
    timestamp: new Date().toISOString(),
  };
}

function buildSyntheticDemoCounterfactual(
  features: PatientFeatures,
  prediction: PredictionResult,
): CounterfactualResult {
  const matchedPreset = findMatchingSamplePreset(features);
  if (matchedPreset) {
    return {
      ...matchedPreset.demoCounterfactual,
      timestamp: new Date().toISOString(),
    };
  }

  const p0 = prediction.probability;
  if (p0 <= STUDY_METADATA.cfTargetProbability) {
    return {
      original_probability: p0,
      counterfactual_probability: p0,
      threshold: STUDY_METADATA.lockedThreshold,
      target_probability: STUDY_METADATA.cfTargetProbability,
      success: true,
      already_below: true,
      method: 'gradient_guided',
      method_label: 'Gradient-Guided (MLP Autograd)',
      proximity_cost: 0.0,
      n_changed_features: 0,
      evaluations: 0,
      optimization_steps: STUDY_METADATA.cfHyperparameters.optimizationSteps,
      learning_rate: STUDY_METADATA.cfHyperparameters.learningRate,
      lambda_penalty: STUDY_METADATA.cfHyperparameters.lambdaPenalty,
      changed_features: [],
      constraint_validation: {
        bounds_valid: true,
        min_max_pairs_valid: validatePatientPairOrdering(features).length === 0,
        immutable_preserved: true,
        total_mutable_features: STUDY_METADATA.cfHyperparameters.mutableFeatures,
        checked_pairs_count: STUDY_METADATA.cfHyperparameters.minMaxPairs,
        new_bound_violations: 0,
        new_pair_violations: 0,
        immutable_violations: [],
        nn_distance: 10.42,
        plausibility_note:
          'Patient already below counterfactual target (<= 0.770981); no feature changes needed.',
      },
      data_source: 'synthetic_demo',
      note: 'Synthetic Demonstration Mode active. Connect FastAPI backend to execute PyTorch autograd counterfactual optimization.',
      timestamp: new Date().toISOString(),
    };
  }

  const changes: ChangedFeature[] = [];
  if (features.h1_lactate_max !== null && features.h1_lactate_max > 2.2) {
    const nextMax = Number(Math.max(1.8, features.h1_lactate_max * 0.58).toFixed(2));
    const origMin = features.h1_lactate_min ?? nextMax;
    const nextMin = Number(Math.min(origMin, nextMax * 0.82).toFixed(2));
    if (features.h1_lactate_min !== null && nextMin !== origMin) {
      changes.push({
        feature: 'h1_lactate_min',
        label: 'Hour-1 Lactate (Min)',
        original_value: origMin,
        counterfactual_value: nextMin,
        delta: Number((nextMin - origMin).toFixed(2)),
        unit: 'mmol/L',
        lower_bound: 0.5,
        upper_bound: 13.4,
        effective_low: Math.min(0.5, origMin),
        effective_high: Math.max(13.4, origMin),
        note: 'Paired projection preserves min <= max',
      });
    }
    changes.push({
      feature: 'h1_lactate_max',
      label: 'Hour-1 Lactate (Max)',
      original_value: features.h1_lactate_max,
      counterfactual_value: nextMax,
      delta: Number((nextMax - features.h1_lactate_max).toFixed(2)),
      unit: 'mmol/L',
      lower_bound: 0.5,
      upper_bound: 14.2,
      effective_low: Math.min(0.5, features.h1_lactate_max),
      effective_high: Math.max(14.2, features.h1_lactate_max),
    });
  }

  if (features.d1_spo2_min !== null && features.d1_spo2_min < 90) {
    const cap = features.d1_spo2_max ?? 100;
    const nextSpo2 = Math.min(cap, Math.max(features.d1_spo2_min + 8, 88));
    changes.push({
      feature: 'd1_spo2_min',
      label: 'Day-1 SpO2 (Min)',
      original_value: features.d1_spo2_min,
      counterfactual_value: nextSpo2,
      delta: Number((nextSpo2 - features.d1_spo2_min).toFixed(1)),
      unit: '%',
      lower_bound: 44,
      upper_bound: 100,
      effective_low: Math.min(44, features.d1_spo2_min),
      effective_high: Math.max(100, features.d1_spo2_min),
    });
  }

  if (features.map_apache !== null && features.map_apache < 70) {
    const nextMap = Math.min(193, Math.max(features.map_apache + 14, 68));
    changes.push({
      feature: 'map_apache',
      label: 'APACHE Mean Arterial Pressure',
      original_value: features.map_apache,
      counterfactual_value: nextMap,
      delta: Number((nextMap - features.map_apache).toFixed(1)),
      unit: 'mmHg',
      lower_bound: 40,
      upper_bound: 193,
      effective_low: Math.min(40, features.map_apache),
      effective_high: Math.max(193, features.map_apache),
    });
  }

  const cfSuccess = p0 <= 0.91 && changes.length > 0;
  const pFinal = cfSuccess
    ? Number((STUDY_METADATA.cfTargetProbability - 0.0012).toFixed(6))
    : Number(Math.max(STUDY_METADATA.cfTargetProbability + 0.018, p0 - 0.052).toFixed(6));

  return {
    original_probability: p0,
    counterfactual_probability: pFinal,
    threshold: STUDY_METADATA.lockedThreshold,
    target_probability: STUDY_METADATA.cfTargetProbability,
    success: cfSuccess,
    already_below: false,
    method: 'gradient_guided',
    method_label: 'Gradient-Guided (MLP Autograd)',
    proximity_cost: Number((0.18 + changes.length * 0.045).toFixed(6)),
    n_changed_features: changes.length,
    evaluations: 61,
    optimization_steps: STUDY_METADATA.cfHyperparameters.optimizationSteps,
    learning_rate: STUDY_METADATA.cfHyperparameters.learningRate,
    lambda_penalty: STUDY_METADATA.cfHyperparameters.lambdaPenalty,
    changed_features: changes,
    constraint_validation: {
      bounds_valid: true,
      min_max_pairs_valid: validatePatientPairOrdering(features).length === 0,
      immutable_preserved: true,
      total_mutable_features: STUDY_METADATA.cfHyperparameters.mutableFeatures,
      checked_pairs_count: STUDY_METADATA.cfHyperparameters.minMaxPairs,
      new_bound_violations: 0,
      new_pair_violations: 0,
      immutable_violations: [],
      nn_distance: 14.18,
      plausibility_note:
        'Euclidean distance in 397-dimensional standardized space; connect FastAPI backend for exact nearest-neighbour computation.',
    },
    data_source: 'synthetic_demo',
    note: 'Synthetic Demonstration Mode active: illustrative constrained diff shown until Python FastAPI backend is connected.',
    timestamp: new Date().toISOString(),
  };
}

export async function checkBackendHealth(baseUrl: string): Promise<{
  ok: boolean;
  error?: string;
  serverInfo?: BackendConfig['serverInfo'];
}> {
  const cleanUrl = normalizeUrl(baseUrl);
  if (!cleanUrl) {
    return { ok: false, error: 'Enter a FastAPI base URL (e.g., http://localhost:8000).' };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${cleanUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} from ${cleanUrl}/health` };
    }
    const data = (await res.json().catch(() => ({}))) as BackendConfig['serverInfo'];
    return { ok: true, serverInfo: data };
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Connection timed out after 4s.'
        : 'Could not reach FastAPI server (check URL and CORS settings).';
    return { ok: false, error: message };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestPrediction(
  features: PatientFeatures,
  config: BackendConfig,
): Promise<{ result?: PredictionResult; error?: string; fallbackUsed?: boolean }> {
  const cleanUrl = normalizeUrl(config.baseUrl);
  const shouldAttemptFastApi = config.mode !== 'demo' && cleanUrl.length > 0;

  if (shouldAttemptFastApi) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`${cleanUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFastApiPayload(features)),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `FastAPI /predict returned HTTP ${res.status}`);
      }
      const data = (await res.json()) as Partial<PredictionResult>;
      if (typeof data.probability !== 'number') {
        throw new Error('FastAPI response missing numeric "probability" field.');
      }
      const threshold = data.threshold ?? STUDY_METADATA.lockedThreshold;
      const classification =
        data.classification ?? (data.probability >= threshold ? 1 : 0);

      return {
        result: {
          probability: data.probability,
          threshold,
          target_probability:
            data.target_probability ?? STUDY_METADATA.cfTargetProbability,
          classification,
          risk_label:
            data.risk_label ??
            (classification === 1
              ? 'High Mortality Risk'
              : 'Below Operating Threshold'),
          model_name: data.model_name ?? STUDY_METADATA.selectedModel,
          data_source: 'fastapi',
          note: data.note,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'FastAPI prediction request failed.';
      if (config.mode === 'fastapi') {
        return { error: errMsg };
      }
      // Fallback to clearly labeled synthetic demo
      return {
        result: buildSyntheticDemoPrediction(features),
        fallbackUsed: true,
        error: errMsg,
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (config.mode === 'fastapi') {
    return {
      error: 'FastAPI Only mode is enabled, but no backend URL is configured.',
    };
  }

  return {
    result: buildSyntheticDemoPrediction(features),
  };
}

export async function requestCounterfactual(
  features: PatientFeatures,
  prediction: PredictionResult | null,
  config: BackendConfig,
): Promise<{ result?: CounterfactualResult; error?: string; fallbackUsed?: boolean }> {
  const effectivePrediction = prediction ?? buildSyntheticDemoPrediction(features);
  const cleanUrl = normalizeUrl(config.baseUrl);
  const shouldAttemptFastApi = config.mode !== 'demo' && cleanUrl.length > 0;

  if (shouldAttemptFastApi) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${cleanUrl}/counterfactual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildFastApiPayload(features),
          method: 'gradient_guided',
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          text || `FastAPI /counterfactual returned HTTP ${res.status}`,
        );
      }
      const data = (await res.json()) as Partial<CounterfactualResult>;
      if (
        typeof data.original_probability !== 'number' ||
        typeof data.counterfactual_probability !== 'number'
      ) {
        throw new Error(
          'FastAPI /counterfactual response missing probability fields.',
        );
      }
      return {
        result: {
          original_probability: data.original_probability,
          counterfactual_probability: data.counterfactual_probability,
          threshold: data.threshold ?? STUDY_METADATA.lockedThreshold,
          target_probability:
            data.target_probability ?? STUDY_METADATA.cfTargetProbability,
          success: Boolean(data.success),
          already_below: Boolean(data.already_below),
          method: 'gradient_guided',
          method_label: data.method_label ?? 'Gradient-Guided (MLP Autograd)',
          proximity_cost: data.proximity_cost ?? 0,
          n_changed_features:
            data.n_changed_features ?? data.changed_features?.length ?? 0,
          evaluations: data.evaluations ?? 0,
          optimization_steps:
            data.optimization_steps ??
            STUDY_METADATA.cfHyperparameters.optimizationSteps,
          learning_rate:
            data.learning_rate ?? STUDY_METADATA.cfHyperparameters.learningRate,
          lambda_penalty:
            data.lambda_penalty ?? STUDY_METADATA.cfHyperparameters.lambdaPenalty,
          changed_features: data.changed_features ?? [],
          constraint_validation: data.constraint_validation ?? {
            bounds_valid: true,
            min_max_pairs_valid: true,
            immutable_preserved: true,
            total_mutable_features:
              STUDY_METADATA.cfHyperparameters.mutableFeatures,
            checked_pairs_count: STUDY_METADATA.cfHyperparameters.minMaxPairs,
            new_bound_violations: 0,
            new_pair_violations: 0,
            immutable_violations: [],
          },
          data_source: 'fastapi',
          note: data.note,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'FastAPI counterfactual request failed.';
      if (config.mode === 'fastapi') {
        return { error: errMsg };
      }
      return {
        result: buildSyntheticDemoCounterfactual(features, effectivePrediction),
        fallbackUsed: true,
        error: errMsg,
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (config.mode === 'fastapi') {
    return {
      error: 'FastAPI Only mode is enabled, but no backend URL is configured.',
    };
  }

  return {
    result: buildSyntheticDemoCounterfactual(features, effectivePrediction),
  };
}
