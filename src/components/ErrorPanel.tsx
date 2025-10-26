import { AlertCircle, X } from 'lucide-react';

interface ErrorPanelProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorPanel = ({ error, onDismiss }: ErrorPanelProps) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
        <p className="text-sm text-red-700 font-mono">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:bg-red-100 p-1 rounded transition-colors"
          title="Dismiss"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};