export type PageId = 'dashboard' | 'prediction' | 'counterfactual';

export type DataSourceMode = 'fastapi' | 'synthetic_demo';

export type ConnectionMode = 'auto' | 'fastapi' | 'demo';

export interface BackendConfig {
  baseUrl: string;
  mode: ConnectionMode;
  status: 'untested' | 'connected' | 'unreachable' | 'demo_only';
  lastCheckedAt?: string;
  lastError?: string;
  serverInfo?: {
    model_name?: string;
    threshold?: number;
    target_probability?: number;
  };
}

export interface FamilyTestMetric {
  family: 'MLP' | 'LogisticRegression' | 'RandomForest';
  configLabel: string;
  rocAuc: number;
  prAuc: number;
  prAucMedian: number;
  prAucCiLow: number;
  prAucCiHigh: number;
  brier: number;
  logLoss: number;
  selected: boolean;
}

export interface ValidationCandidate {
  candidate: string;
  family: 'MLP' | 'LogisticRegression' | 'RandomForest';
  rocAuc: number;
  prAuc: number;
  brier: number;
  logLoss: number;
  selected: boolean;
}

export interface CounterfactualMethodBenchmark {
  method: 'gradient_guided' | 'greedy_single_feature' | 'random_feature';
  label: string;
  totalCases: number;
  successes: number;
  successRatePct: number;
  meanCost: number;
  medianSuccessCost: number;
  meanChangedFeatures: number;
  medianEvaluations: number;
  medianNnDistance: number;
  boundViolations: number;
  pairViolations: number;
}

export interface PairwiseBootstrapDiff {
  comparison: string;
  diffPctPoints: number;
  ciLowPctPoints: number;
  ciHighPctPoints: number;
}

export interface PatientFeatures {
  // Immutable / non-actionable context
  age: number | null;
  gender: 'M' | 'F';
  bmi: number | null;
  elective_surgery: 0 | 1;
  apache_3j_bodysystem: string;

  // APACHE physiology
  heart_rate_apache: number | null;
  map_apache: number | null;
  resprate_apache: number | null;
  temp_apache: number | null;
  sodium_apache: number | null;
  bun_apache: number | null;
  creatinine_apache: number | null;
  glucose_apache: number | null;

  // Oxygenation & acid-base
  fio2_apache: number | null;
  pao2_apache: number | null;
  paco2_apache: number | null;
  ph_apache: number | null;

  // Day-1 & Hour-1 paired markers
  d1_spo2_min: number | null;
  d1_spo2_max: number | null;
  h1_lactate_min: number | null;
  h1_lactate_max: number | null;

  // Optional full 178-column extra fields from JSON import
  extraFeatures?: Record<string, number | string | boolean | null>;
}

export interface FeatureDefinition {
  key: keyof Omit<PatientFeatures, 'extraFeatures'>;
  label: string;
  group: 'context' | 'apache' | 'blood_gas' | 'markers';
  inputType: 'number' | 'select';
  unit?: string;
  step?: number;
  immutable?: boolean;
  nonActionable?: boolean;
  minBound?: number;
  maxBound?: number;
  pairCounterpart?: keyof Omit<PatientFeatures, 'extraFeatures'>;
  pairRole?: 'min' | 'max';
  options?: { label: string; value: string | number }[];
  hint?: string;
}

export interface PredictionResult {
  probability: number;
  threshold: number;
  target_probability: number;
  classification: 0 | 1;
  risk_label: 'High Mortality Risk' | 'Below Operating Threshold';
  model_name: string;
  data_source: DataSourceMode;
  note?: string;
  timestamp: string;
}

export interface ChangedFeature {
  feature: string;
  label: string;
  original_value: number;
  counterfactual_value: number;
  delta: number;
  unit: string;
  lower_bound: number;
  upper_bound: number;
  effective_low: number;
  effective_high: number;
  note?: string;
}

export interface ConstraintAudit {
  bounds_valid: boolean;
  min_max_pairs_valid: boolean;
  immutable_preserved: boolean;
  total_mutable_features: number;
  checked_pairs_count: number;
  new_bound_violations: number;
  new_pair_violations: number;
  immutable_violations: string[];
  nn_distance?: number;
  plausibility_note?: string;
}

export interface CounterfactualResult {
  original_probability: number;
  counterfactual_probability: number;
  threshold: number;
  target_probability: number;
  success: boolean;
  already_below: boolean;
  method: 'gradient_guided';
  method_label: string;
  proximity_cost: number;
  n_changed_features: number;
  evaluations: number;
  optimization_steps: number;
  learning_rate: number;
  lambda_penalty: number;
  changed_features: ChangedFeature[];
  constraint_validation: ConstraintAudit;
  data_source: DataSourceMode;
  note?: string;
  timestamp: string;
}

export interface SamplePatientProfile {
  id: string;
  name: string;
  cohortTag: string;
  summary: string;
  features: PatientFeatures;
  demoPrediction: Omit<PredictionResult, 'timestamp'>;
  demoCounterfactual: Omit<CounterfactualResult, 'timestamp'>;
}
