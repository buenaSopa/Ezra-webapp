import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

interface ProductImageProps {
  imageUrl?: string;
  onUpload?: () => void;
}

export function ProductImage({ imageUrl, onUpload }: ProductImageProps) {
  return (
    <div className="space-y-2 pt-4 border-t">
      <Label>Product Image</Label>
      {imageUrl ? (
        <div className="relative w-full h-[200px] rounded-lg overflow-hidden">
          <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
          <Button
            variant="outline"
            size="sm"
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm"
            onClick={onUpload}
          >
            Change Image
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Drag and drop an image, or click to browse</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onUpload}>
            Upload Image
          </Button>
        </div>
      )}
    </div>
  );
} 