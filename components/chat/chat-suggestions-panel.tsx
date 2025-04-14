import { Button } from "@/components/ui/button";
import { Lightbulb, Sparkles } from "lucide-react";
import { adsCreativeTemplate, beliefPrompt, compareToCompetitorsPrompt, conceptAnglePrompt, customerAvatarPrompt, headlinePrompt, hookPrompt, productSummaryPrompt, testPrompt } from "@/lib/prompts/prompt";
interface ChatSuggestionsPanelProps {
  onSuggestionClick: (suggestion: {
    content: string;
    hiddenPrompt: string;
  }) => void;
  className?: string;
}

export function ChatSuggestionsPanel({ onSuggestionClick, className }: ChatSuggestionsPanelProps) {
  // Predefined suggestion buttons
  const suggestions = [
    {
      content: "Product Summary",
      hiddenPrompt: productSummaryPrompt
    },
    {
      content: 'Belief Challenge',
      hiddenPrompt: beliefPrompt
    },
    {
      content: 'Concepts and Angles',
      hiddenPrompt: conceptAnglePrompt
    },
    {
      content: 'Customer Avatar',
      hiddenPrompt: customerAvatarPrompt
    },
    {
      content: 'Ads Scripts',
      hiddenPrompt: adsCreativeTemplate
    },
    {
      content: 'Headlines',
      hiddenPrompt: headlinePrompt
    },
    {
      content: 'Hook',
      hiddenPrompt: hookPrompt
    },
    {
      content: 'Competitor Analysis',
      hiddenPrompt: compareToCompetitorsPrompt
    },
  ];

  return (
    <div className={`w-full lg:w-64 border-l bg-gray-50/50 p-4 ${className || ''} overflow-y-auto`}>
      <div className="space-y-5">
        
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-auto py-2.5 px-3 text-sm font-normal border border-transparent hover:border-gray-200 hover:bg-white/80 rounded-md"
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion.content}
            </Button>
          ))}
        </div>
        
        <div className="pt-2 mt-4 border-t border-gray-200">
          <div className="text-xs text-muted-foreground">
            Click any prompt to send it directly to the AI
          </div>
        </div>
      </div>
    </div>
  );
} 