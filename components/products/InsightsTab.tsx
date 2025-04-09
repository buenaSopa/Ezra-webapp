import { Card } from "@/components/ui/card";
import InsightsTestButton from "@/app/components/InsightsTestButton";


// Default export with predefined prompt categories
export default function DefaultInsightsTab({ productName, productId }: { productName: string, productId?: string }) {

  return (
    <div className="space-y-8">
      {productId && (
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">AI Marketing Insights Generator</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate comprehensive marketing insights based on customer reviews.
            This tool analyzes customer feedback to identify key benefits, pain points,
            objections, and more to help optimize your marketing strategy.
          </p>
          <InsightsTestButton productId={productId} />
        </Card>
      )}
    </div>
  );
} 