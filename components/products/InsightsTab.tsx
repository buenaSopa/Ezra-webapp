import { Card } from "@/components/ui/card";
import InsightsTestButton from "@/app/components/InsightsTestButton";


// Default export with predefined prompt categories
export default function DefaultInsightsTab({ productName, productId }: { productName: string, productId?: string }) {

  return (
    <div className="space-y-8">
      {productId && (
          <InsightsTestButton productId={productId} />
      )}
    </div>
  );
} 