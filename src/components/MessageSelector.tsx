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
      <div className="text-sm text-gray-400 italic">
        No messages available. Load a .proto file first.
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        Message Type
      </label>
      <div className="relative">
        <select
          value={selectedMessage || ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled || messages.length === 0}
          className="w-full appearance-none bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed hover:border-gray-300 transition-colors shadow-sm"
        >
          {messages.map((message) => (
            <option key={message} value={message}>
              {message}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={18}
        />
      </div>
    </div>
  );
};