import {
  Activity,
  Download,
  GitCompareArrows,
  LayoutDashboard,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { STUDY_METADATA } from '../data/notebookReference';
import { BackendConfig, PageId } from '../types/icu';
import { AcademicDisclaimer } from './AcademicDisclaimer';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  backendConfig: BackendConfig;
  onOpenBackendModal: () => void;
}

const NAV_ITEMS: { id: PageId; label: string; subtitle: string; icon: typeof LayoutDashboard }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    subtitle: 'Cohort & model benchmarks',
    icon: LayoutDashboard,
  },
  {
    id: 'prediction',
    label: 'Patient Prediction',
    subtitle: 'Risk scoring & threshold',
    icon: SlidersHorizontal,
  },
  {
    id: 'counterfactual',
    label: 'Counterfactual Explanation',
    subtitle: 'Gradient-guided recourse',
    icon: GitCompareArrows,
  },
];

export function Sidebar({
  activePage,
  onSelectPage,
  mobileOpen,
  onCloseMobile,
  backendConfig,
  onOpenBackendModal,
}: SidebarProps) {
  const connectionSummary =
    backendConfig.mode === 'demo'
      ? 'Synthetic Demo Mode'
      : backendConfig.status === 'connected'
        ? 'FastAPI Connected'
        : backendConfig.baseUrl
          ? 'FastAPI Auto / Fallback'
          : 'Demo Fallback Ready';

  const statusDotColor =
    backendConfig.status === 'connected'
      ? 'bg-emerald-400'
      : backendConfig.status === 'unreachable'
        ? 'bg-amber-400'
        : 'bg-teal-400';

  const navContent = (
    <div className="flex h-full flex-col bg-[#0F172A] text-slate-100">
      {/* Brand header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 ring-1 ring-teal-400/30">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">ICU Insight</div>
            <div className="text-[11px] font-medium text-slate-400">WiDS 2020 · XAI Study</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 space-y-1.5 px-3 py-5">
        <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectPage(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-teal-400 ${
                isActive
                  ? 'bg-teal-500/15 text-white ring-1 ring-teal-400/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon
                className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${
                  isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">{item.label}</div>
                <div
                  className={`mt-0.5 text-xs ${
                    isActive ? 'text-teal-200/80' : 'text-slate-400'
                  }`}
                >
                  {item.subtitle}
                </div>
              </div>
            </button>
          );
        })}

        {/* Frozen Protocol Summary */}
        <div className="mt-6 border-t border-slate-800 pt-5 px-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Locked Model Spec
          </div>
          <dl className="mt-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">Model</dt>
              <dd className="font-mono font-medium text-slate-200 truncate">
                Smaller_MLP
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">Threshold</dt>
              <dd className="font-mono tabular-nums font-medium text-teal-300">
                {STUDY_METADATA.lockedThreshold.toFixed(6)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">CF Target</dt>
              <dd className="font-mono tabular-nums font-medium text-sky-300">
                {STUDY_METADATA.cfTargetProbability.toFixed(6)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">Features</dt>
              <dd className="font-mono tabular-nums text-slate-200">
                {STUDY_METADATA.predictorColumns} → {STUDY_METADATA.transformedFeatures}
              </dd>
            </div>
          </dl>
        </div>
      </nav>

      {/* Bottom Connection + Disclaimer */}
      <div className="space-y-3 border-t border-slate-800 p-4">
        <button
          type="button"
          onClick={onOpenBackendModal}
          className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-left text-xs transition-colors hover:border-teal-500/50 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-400">Inference Backend</div>
            <div className="mt-0.5 flex items-center gap-2 font-medium text-slate-100">
              <span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
              <span className="truncate">{connectionSummary}</span>
            </div>
          </div>
          <span className="ml-2 shrink-0 text-[11px] font-semibold text-teal-400">
            Configure
          </span>
        </button>

        <a
          href="/icu-insight-project.zip"
          download="icu-insight-project.zip"
          className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-teal-500/50 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <span>Download Project (.zip)</span>
          <Download className="h-3.5 w-3.5 text-teal-400" />
        </a>

        <AcademicDisclaimer variant="compact" />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:block">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full w-72 max-w-[85vw] shadow-xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
