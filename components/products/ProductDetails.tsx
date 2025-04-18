import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  created_at: string;
  metadata: {
    description?: string;
    url?: string;
    trustpilot_url?: string;
    amazon_asin?: string;
    [key: string]: any;
  };
}

interface ProductDetailsProps {
  product: Product;
  isEditing: boolean;
  onMetadataChange: (field: string, value: any) => void;
}

export function ProductDetails({
  product,
  isEditing,
  onMetadataChange,
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
          <Label htmlFor="productUrl">Brand URL</Label>
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
          <Label htmlFor="amazonAsin">Amazon ASIN</Label>
          {isEditing ? (
            <Input
              id="amazonAsin"
              value={product.metadata.amazon_asin || ''}
              onChange={(e) => onMetadataChange('amazon_asin', e.target.value.trim())}
              placeholder="Enter Amazon ASIN"
              onBlur={(e) => {
                // Also trim on blur to clean up any spaces
                if (e.target.value !== e.target.value.trim()) {
                  onMetadataChange('amazon_asin', e.target.value.trim());
                }
              }}
            />
          ) : (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground flex items-center">
                {product.metadata.amazon_asin ? (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5 mr-1 text-blue-500" />
                    <span>{product.metadata.amazon_asin}</span>
                  </>
                ) : "No Amazon ASIN added"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 