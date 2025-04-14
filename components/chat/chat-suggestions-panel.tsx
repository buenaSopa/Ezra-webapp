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
      description: "Get a concise overview of the product's key features and benefits",
      hiddenPrompt: productSummaryPrompt
    },
    {
      content: 'Belief Challenge',
      description: "Identify and challenge limiting beliefs customers might have",
      hiddenPrompt: beliefPrompt
    },
    {
      content: 'Concepts and Angles',
      description: "Generate unique positioning concepts and marketing angles",
      hiddenPrompt: conceptAnglePrompt
    },
    {
      content: 'Customer Avatar',
      description: "Create detailed personas based on real customer profiles",
      hiddenPrompt: customerAvatarPrompt
    },
    {
      content: 'Ads Scripts',
      description: "Generate ready-to-use ad copy for different platforms",
      hiddenPrompt: adsCreativeTemplate
    },
    {
      content: 'Headlines',
      description: "Craft attention-grabbing headlines for marketing materials",
      hiddenPrompt: headlinePrompt
    },
    {
      content: 'Hook',
      description: "Create compelling hooks to capture audience interest",
      hiddenPrompt: hookPrompt
    },
    {
      content: 'Competitor Analysis',
      description: "Analyze how the product compares to competing offerings",
      hiddenPrompt: compareToCompetitorsPrompt
    },
  ];

  return (
    <div className={`w-full lg:w-64 border-l bg-gray-50/50 p-4 ${className || ''} overflow-y-auto`}>
      <div className="space-y-5">
        
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="border border-transparent hover:border-gray-200 hover:bg-white/80 rounded-md transition-colors"
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left h-auto py-2.5 px-3 font-normal"
                onClick={() => onSuggestionClick(suggestion)}
              >
                <div className="flex flex-col">
                  <span>{suggestion.content}</span>
                  <span className="text-xs text-muted-foreground mt-0.5 text-wrap">{suggestion.description}</span>
                </div>
              </Button>
            </div>
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