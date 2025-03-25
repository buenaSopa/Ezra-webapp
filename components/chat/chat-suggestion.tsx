import { Button } from "../ui/button";

interface ChatSuggestionProps {
  text: string;
  onClick: () => void;
}

export function ChatSuggestion({ text, onClick }: ChatSuggestionProps) {
  return (
    <Button
      variant="outline"
      className="h-auto py-2 px-4 whitespace-normal text-left justify-start font-normal border-gray-200 hover:bg-gray-50"
      onClick={onClick}
    >
      {text}
    </Button>
  );
}

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  if (!suggestions.length) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {suggestions.map((suggestion, index) => (
        <ChatSuggestion
          key={index}
          text={suggestion}
          onClick={() => onSelect(suggestion)}
        />
      ))}
    </div>
  );
} 