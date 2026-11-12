import { AlertTriangle } from 'lucide-react';

interface AcademicDisclaimerProps {
  variant?: 'banner' | 'compact';
}

export function AcademicDisclaimer({ variant = 'banner' }: AcademicDisclaimerProps) {
  if (variant === 'compact') {
    return (
      <div className="rounded-lg border border-slate-700/80 bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-300">
        <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Academic ML Research Only</span>
        </div>
        <p className="text-slate-400">
          Not a clinical decision-making tool. Model outputs and counterfactuals do not represent medical advice or causal effects.
        </p>
      </div>
    );
  }

  return (
    <footer className="mt-8 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-slate-700">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="leading-relaxed">
          <span className="font-semibold text-slate-900">Academic Research Disclaimer:</span>{' '}
          ICU Insight is an academic machine learning project evaluated on the WiDS Datathon 2020 dataset and is{' '}
          <span className="font-semibold text-slate-900">not a clinical decision-making tool</span>.
          Predicted probabilities and counterfactual feature changes reflect statistical behavior of the frozen MLP model rather than causal clinical interventions or treatment recommendations.
        </p>
      </div>
    </footer>
  );
}
