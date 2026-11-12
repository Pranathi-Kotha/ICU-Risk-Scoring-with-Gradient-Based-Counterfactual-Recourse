import { useState } from 'react';
import { CheckCircle2, Loader2, Server, X, XCircle } from 'lucide-react';
import { checkBackendHealth } from '../services/icuApi';
import { BackendConfig, ConnectionMode } from '../types/icu';

interface BackendModalProps {
  open: boolean;
  config: BackendConfig;
  onClose: () => void;
  onSaveConfig: (next: BackendConfig) => void;
}

export function BackendModal({
  open,
  config,
  onClose,
  onSaveConfig,
}: BackendModalProps) {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [mode, setMode] = useState<ConnectionMode>(config.mode);
  const [testing, setTesting] = useState(false);
  const [testOutcome, setTestOutcome] = useState<{
    ok?: boolean;
    message?: string;
    serverInfo?: BackendConfig['serverInfo'];
  }>({});

  if (!open) return null;

  async function handleTestConnection() {
    setTesting(true);
    setTestOutcome({});
    const res = await checkBackendHealth(baseUrl);
    setTesting(false);
    if (res.ok) {
      setTestOutcome({
        ok: true,
        message: 'FastAPI /health endpoint responded successfully.',
        serverInfo: res.serverInfo,
      });
    } else {
      setTestOutcome({
        ok: false,
        message: res.error || 'Connection failed.',
      });
    }
  }

  function handleSave() {
    const nextStatus: BackendConfig['status'] =
      mode === 'demo'
        ? 'demo_only'
        : testOutcome.ok === true
          ? 'connected'
          : testOutcome.ok === false
            ? 'unreachable'
            : baseUrl.trim()
              ? 'untested'
              : 'demo_only';

    onSaveConfig({
      baseUrl: baseUrl.trim(),
      mode,
      status: nextStatus,
      lastCheckedAt: testOutcome.message ? new Date().toISOString() : config.lastCheckedAt,
      lastError: testOutcome.ok === false ? testOutcome.message : undefined,
      serverInfo: testOutcome.serverInfo ?? config.serverInfo,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backend-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Server className="h-5 w-5 text-teal-600" />
            <div>
              <h2 id="backend-modal-title" className="text-base font-bold text-slate-900">
                Python FastAPI Backend Connection
              </h2>
              <p className="text-xs text-slate-500">
                Connect your trained PyTorch MLP and counterfactual solver, or run in Synthetic Demo Mode.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Mode selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Execution Mode
            </label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                {
                  id: 'auto' as const,
                  title: 'Auto + Fallback',
                  desc: 'Use FastAPI if reachable; fall back to synthetic demo.',
                },
                {
                  id: 'fastapi' as const,
                  title: 'FastAPI Only',
                  desc: 'Require live Python backend; error if offline.',
                },
                {
                  id: 'demo' as const,
                  title: 'Synthetic Demo',
                  desc: 'Use notebook-grounded demonstration cases only.',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    mode === opt.id
                      ? 'border-teal-600 bg-teal-50/70 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.title}</div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-500">
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* URL input */}
          <div>
            <label htmlFor="fastapi-base-url" className="block text-xs font-semibold text-slate-700">
              FastAPI Base URL
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="fastapi-base-url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:8000"
                disabled={mode === 'demo'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || mode === 'demo'}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Test /health</span>
                )}
              </button>
            </div>
            {testOutcome.message && (
              <div
                className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                  testOutcome.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                {testOutcome.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span>{testOutcome.message}</span>
              </div>
            )}
          </div>

          {/* FastAPI contract reference */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-semibold text-slate-800">
              Expected Python FastAPI Endpoints
            </div>
            <div className="mt-2 space-y-1.5 font-mono text-[11px] text-slate-600">
              <div>
                <span className="font-semibold text-teal-700">GET /health</span> →{' '}
                {'{ "status": "ok", "model_name": "Smaller_MLP_lr0.0005", "threshold": 0.790981 }'}
              </div>
              <div>
                <span className="font-semibold text-sky-700">POST /predict</span> →{' '}
                {'{ "features": {...}, "threshold": 0.790981 }'} →{' '}
                {'{ probability, classification, threshold }'}
              </div>
              <div>
                <span className="font-semibold text-sky-700">POST /counterfactual</span> →{' '}
                {'{ "features": {...}, "method": "gradient_guided" }'} →{' '}
                {'{ original_probability, counterfactual_probability, changed_features, proximity_cost, constraint_validation }'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
          >
            Save Connection Settings
          </button>
        </div>
      </div>
    </div>
  );
}
