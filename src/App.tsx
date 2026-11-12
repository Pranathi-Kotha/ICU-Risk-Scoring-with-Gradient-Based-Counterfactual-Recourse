import { useState } from 'react';
import { AcademicDisclaimer } from './components/AcademicDisclaimer';
import { BackendModal } from './components/BackendModal';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { SAMPLE_PATIENT_PROFILES } from './data/samplePatients';
import { CounterfactualPage } from './pages/CounterfactualPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientPredictionPage } from './pages/PatientPredictionPage';
import {
  getInitialBackendConfig,
  requestCounterfactual,
  requestPrediction,
  saveBackendConfig,
} from './services/icuApi';
import {
  BackendConfig,
  CounterfactualResult,
  PageId,
  PatientFeatures,
  PredictionResult,
  SamplePatientProfile,
} from './types/icu';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendModalOpen, setBackendModalOpen] = useState(false);

  const [backendConfig, setBackendConfig] = useState<BackendConfig>(() =>
    getInitialBackendConfig(),
  );

  const [features, setFeatures] = useState<PatientFeatures>(
    () => ({ ...SAMPLE_PATIENT_PROFILES[0].features }),
  );
  const [activeSampleId, setActiveSampleId] = useState<string | null>(
    SAMPLE_PATIENT_PROFILES[0].id,
  );

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [predictionFallbackNotice, setPredictionFallbackNotice] = useState<
    string | null
  >(null);

  const [counterfactual, setCounterfactual] =
    useState<CounterfactualResult | null>(null);
  const [cfLoading, setCfLoading] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);
  const [cfFallbackNotice, setCfFallbackNotice] = useState<string | null>(null);

  const activeSampleName =
    SAMPLE_PATIENT_PROFILES.find((p) => p.id === activeSampleId)?.name ?? null;

  function handleSaveBackendConfig(next: BackendConfig) {
    setBackendConfig(next);
    saveBackendConfig(next);
  }

  function handleChangeFeatures(next: PatientFeatures) {
    setFeatures(next);
    setActiveSampleId(null);
    setPrediction(null);
    setCounterfactual(null);
    setPredictionError(null);
    setPredictionFallbackNotice(null);
    setCfError(null);
    setCfFallbackNotice(null);
  }

  function handleSelectSample(profile: SamplePatientProfile) {
    setFeatures({ ...profile.features });
    setActiveSampleId(profile.id);
    setPrediction(null);
    setCounterfactual(null);
    setPredictionError(null);
    setPredictionFallbackNotice(null);
    setCfError(null);
    setCfFallbackNotice(null);
    if (activePage === 'dashboard') {
      setActivePage('prediction');
    }
  }

  async function handlePredict() {
    setPredicting(true);
    setPredictionError(null);
    setPredictionFallbackNotice(null);

    const response = await requestPrediction(features, backendConfig);
    setPredicting(false);

    if (response.error && !response.result) {
      setPredictionError(response.error);
      setBackendConfig((prev) => ({
        ...prev,
        status: 'unreachable',
        lastError: response.error,
      }));
      return;
    }

    if (response.fallbackUsed && response.error) {
      setPredictionFallbackNotice(response.error);
      setBackendConfig((prev) => ({
        ...prev,
        status: 'unreachable',
        lastError: response.error,
      }));
    } else if (response.result?.data_source === 'fastapi') {
      setBackendConfig((prev) => ({
        ...prev,
        status: 'connected',
        lastError: undefined,
      }));
    }

    if (response.result) {
      setPrediction(response.result);
      setCounterfactual(null);
    }
  }

  async function handleGenerateCounterfactual(
    overrideFeatures?: PatientFeatures,
    overridePrediction?: PredictionResult | null,
  ) {
    const targetFeatures = overrideFeatures ?? features;
    const targetPrediction =
      overridePrediction !== undefined ? overridePrediction : prediction;

    setCfLoading(true);
    setCfError(null);
    setCfFallbackNotice(null);

    const response = await requestCounterfactual(
      targetFeatures,
      targetPrediction,
      backendConfig,
    );
    setCfLoading(false);

    if (response.error && !response.result) {
      setCfError(response.error);
      setBackendConfig((prev) => ({
        ...prev,
        status: 'unreachable',
        lastError: response.error,
      }));
      return;
    }

    if (response.fallbackUsed && response.error) {
      setCfFallbackNotice(response.error);
      setBackendConfig((prev) => ({
        ...prev,
        status: 'unreachable',
        lastError: response.error,
      }));
    } else if (response.result?.data_source === 'fastapi') {
      setBackendConfig((prev) => ({
        ...prev,
        status: 'connected',
        lastError: undefined,
      }));
    }

    if (response.result) {
      setCounterfactual(response.result);
    }
  }

  async function handleGoToCounterfactual() {
    setActivePage('counterfactual');
    if (!counterfactual) {
      await handleGenerateCounterfactual(features, prediction);
    }
  }

  async function handleLoadSampleAndExplain(profile: SamplePatientProfile) {
    const nextFeatures = { ...profile.features };
    setFeatures(nextFeatures);
    setActiveSampleId(profile.id);
    setPredictionError(null);
    setPredictionFallbackNotice(null);
    setCfError(null);
    setCfFallbackNotice(null);

    const predResp = await requestPrediction(nextFeatures, backendConfig);
    const nextPrediction = predResp.result ?? null;
    if (nextPrediction) {
      setPrediction(nextPrediction);
    }
    await handleGenerateCounterfactual(nextFeatures, nextPrediction);
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        backendConfig={backendConfig}
        onOpenBackendModal={() => setBackendModalOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activePage={activePage}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          backendConfig={backendConfig}
          onOpenBackendModal={() => setBackendModalOpen(true)}
          onLoadSamplePatient={handleSelectSample}
          activeSampleName={activePage !== 'dashboard' ? activeSampleName : null}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {activePage === 'dashboard' && <DashboardPage />}

          {activePage === 'prediction' && (
            <PatientPredictionPage
              features={features}
              onChangeFeatures={handleChangeFeatures}
              onSelectSample={handleSelectSample}
              activeSampleId={activeSampleId}
              prediction={prediction}
              predicting={predicting}
              predictionError={predictionError}
              fallbackNotice={predictionFallbackNotice}
              backendConfig={backendConfig}
              onPredict={handlePredict}
              onGoToCounterfactual={handleGoToCounterfactual}
            />
          )}

          {activePage === 'counterfactual' && (
            <CounterfactualPage
              prediction={prediction}
              counterfactual={counterfactual}
              loading={cfLoading}
              error={cfError}
              fallbackNotice={cfFallbackNotice}
              activeSampleName={activeSampleName}
              onGenerateCounterfactual={() => handleGenerateCounterfactual()}
              onLoadSampleAndExplain={handleLoadSampleAndExplain}
            />
          )}

          <AcademicDisclaimer variant="banner" />
        </main>
      </div>

      <BackendModal
        open={backendModalOpen}
        config={backendConfig}
        onClose={() => setBackendModalOpen(false)}
        onSaveConfig={handleSaveBackendConfig}
      />
    </div>
  );
}
