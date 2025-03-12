import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings } from "lucide-react";

interface ProductPageProps {
  params: {
    productId: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const productName = params.productId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const chatPrompts = [
    {
      title: "Help me find winning concepts from customer reviews",
      description: "Analyze customer reviews to identify successful marketing angles",
    },
    {
      title: "Summarize the negative reviews of my product",
      description: "Get insights from negative feedback to improve marketing strategy",
    },
    {
      title: "Help me build a storyboard for my next ad",
      description: "Create a compelling narrative structure for your advertisement",
    },
    {
      title: "What are the top purchase triggers for my product?",
      description: "Identify key factors that drive customer purchasing decisions",
    },
  ];

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-muted rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{productName}</h1>
              <p className="text-sm text-muted-foreground">Add URLs for reviews, product page, competitors</p>
            </div>
          </div>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {chatPrompts.map((prompt, index) => (
            <Card key={index} className="p-4 hover:bg-muted/50 cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{prompt.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Previous chats about {productName}</h2>
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{productName} reduces your Tan lines</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    I've been using the {productName} for a week now, and I can already see a reduction in my tan lines.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 