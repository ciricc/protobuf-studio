import { ChevronDown } from 'lucide-react';

interface MessageSelectorProps {
  messages: string[];
  selectedMessage: string | null;
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export const MessageSelector = ({ messages, selectedMessage, onSelect, disabled }: MessageSelectorProps) => {
  if (messages.length === 0) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500 italic">
        No messages available. Load a .proto file first.
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        Message Type
      </label>
      <div className="relative">
        <select
          value={selectedMessage || ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled || messages.length === 0}
          className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 pr-7 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          {messages.map((message) => (
            <option key={message} value={message}>
              {message}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
          size={14}
        />
      </div>
    </div>
  );
};