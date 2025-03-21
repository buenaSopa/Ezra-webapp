import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  created_at: string;
  metadata: {
    description?: string;
    url?: string;
    trustpilot_url?: string;
    [key: string]: any;
  };
}

interface ProductDetailsProps {
  product: Product;
  isEditing: boolean;
  onMetadataChange: (field: string, value: any) => void;
  onTestTrustpilot: () => void;
}

export function ProductDetails({
  product,
  isEditing,
  onMetadataChange,
  onTestTrustpilot
}: ProductDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        {isEditing ? (
          <Textarea
            id="description"
            value={product.metadata.description || ''}
            onChange={(e) => onMetadataChange('description', e.target.value)}
            placeholder="Add a description for your product"
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {product.metadata.description || "No description added"}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="productUrl">Product URL</Label>
          {isEditing ? (
            <Input
              id="productUrl"
              value={product.metadata.url || ''}
              onChange={(e) => onMetadataChange('url', e.target.value)}
              placeholder="https://your-product.com"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {product.metadata.url ? (
                <a href={product.metadata.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  {product.metadata.url}
                </a>
              ) : "No URL added"}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="trustpilot">Trustpilot URL</Label>
          <div className="flex flex-col space-y-2">
            {isEditing ? (
              <Input
                id="trustpilot"
                value={product.metadata.trustpilot_url || ''}
                onChange={(e) => onMetadataChange('trustpilot_url', e.target.value)}
                placeholder="https://trustpilot.com/review/your-product"
              />
            ) : (
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {product.metadata.trustpilot_url ? (
                    <a href={product.metadata.trustpilot_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {product.metadata.trustpilot_url}
                    </a>
                  ) : "No Trustpilot URL added"}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onTestTrustpilot}
                  className="flex items-center gap-1"
                >
                  <Search className="h-3.5 w-3.5" />
                  Test Trustpilot
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 