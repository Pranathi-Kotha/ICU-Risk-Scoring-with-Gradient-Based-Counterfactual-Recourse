import { ChevronRight, Menu, Server, UserCheck } from 'lucide-react';
import { SAMPLE_PATIENT_PROFILES } from '../data/samplePatients';
import { BackendConfig, PageId, SamplePatientProfile } from '../types/icu';

interface TopBarProps {
  activePage: PageId;
  onOpenMobileMenu: () => void;
  backendConfig: BackendConfig;
  onOpenBackendModal: () => void;
  onLoadSamplePatient: (profile: SamplePatientProfile) => void;
  activeSampleName?: string | null;
}

const PAGE_LABELS: Record<PageId, string> = {
  dashboard: 'Dashboard',
  prediction: 'Patient Prediction',
  counterfactual: 'Counterfactual Explanation',
};

export function TopBar({
  activePage,
  onOpenMobileMenu,
  backendConfig,
  onOpenBackendModal,
  onLoadSamplePatient,
  activeSampleName,
}: TopBarProps) {
  const isLiveConnected =
    backendConfig.mode !== 'demo' && backendConfig.status === 'connected';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile toggle + Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 lg:hidden focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden font-medium text-slate-500 sm:inline">ICU Insight</span>
          <ChevronRight className="hidden h-4 w-4 text-slate-400 sm:inline" />
          <h1 className="truncate font-semibold text-slate-900">
            {PAGE_LABELS[activePage]}
          </h1>
          {activeSampleName && (
            <span className="hidden truncate text-xs text-slate-500 md:inline">
              · {activeSampleName}
            </span>
          )}
        </div>
      </div>

      {/* Right: At most 2 crisp action buttons */}
      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => onLoadSamplePatient(SAMPLE_PATIENT_PROFILES[0])}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <UserCheck className="h-3.5 w-3.5 text-teal-600" />
          <span>Load Sample Case</span>
        </button>

        <button
          type="button"
          onClick={onOpenBackendModal}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
            isLiveConnected
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Server
            className={`h-3.5 w-3.5 ${
              isLiveConnected ? 'text-emerald-600' : 'text-sky-600'
            }`}
          />
          <span>{isLiveConnected ? 'FastAPI Live' : 'FastAPI / Demo'}</span>
        </button>
      </div>
    </header>
  );
}
