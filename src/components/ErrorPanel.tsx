import { AlertCircle, X } from 'lucide-react';

interface ErrorPanelProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorPanel = ({ error, onDismiss }: ErrorPanelProps) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 flex items-start gap-2">
      <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={14} />
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-semibold text-red-800 dark:text-red-300">Error</h3>
        <p className="text-xs text-red-700 dark:text-red-400 font-mono break-words">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 p-0.5 rounded transition-colors flex-shrink-0"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};