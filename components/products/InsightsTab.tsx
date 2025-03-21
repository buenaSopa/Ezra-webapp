import { Card } from "@/components/ui/card";
import { Plus, Star, MessageSquare, Upload, BarChart } from "lucide-react";
import { ReactNode } from "react";

interface PromptItem {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
}

interface PromptCategory {
  category: string;
  prompts: PromptItem[];
}

interface InsightsTabProps {
  productName: string;
  promptCategories: PromptCategory[];
  onCreateCustomPrompt?: () => void;
}

export function InsightsTab({ 
  productName, 
  promptCategories = [],
  onCreateCustomPrompt 
}: InsightsTabProps) {
  return (
    <div className="space-y-6">
      {promptCategories.map((category, idx) => (
        <div key={idx} className="space-y-3">
          <h2 className="text-lg font-medium">{category.category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.prompts.map((prompt, index) => (
              <Card 
                key={index} 
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={prompt.onClick}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {prompt.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{prompt.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
                  </div>
                </div>
              </Card>
            ))}
            
            <Card 
              className="p-4 border-dashed hover:bg-muted/20 cursor-pointer transition-colors"
              onClick={onCreateCustomPrompt}
            >
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="p-2 bg-muted rounded-full mx-auto w-fit mb-2">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Create custom prompt</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
}

// Default export with predefined prompt categories
export default function DefaultInsightsTab({ productName }: { productName: string }) {
  const defaultPromptCategories: PromptCategory[] = [
    {
      category: "Customer Insights",
      prompts: [
        {
          title: "Find winning concepts from reviews",
          description: "Analyze customer reviews to identify successful marketing angles",
          icon: <Star className="h-4 w-4 text-amber-500" />
        },
        {
          title: "Summarize negative reviews",
          description: "Get insights from negative feedback to improve marketing strategy",
          icon: <MessageSquare className="h-4 w-4 text-red-500" />
        }
      ]
    },
    {
      category: "Content Creation",
      prompts: [
        {
          title: "Build a storyboard for my next ad",
          description: "Create a compelling narrative structure for your advertisement",
          icon: <Upload className="h-4 w-4 text-blue-500" />
        },
        {
          title: "Identify top purchase triggers",
          description: "Identify key factors that drive customer purchasing decisions",
          icon: <BarChart className="h-4 w-4 text-green-500" />
        }
      ]
    }
  ];

  return <InsightsTab productName={productName} promptCategories={defaultPromptCategories} />;
} 