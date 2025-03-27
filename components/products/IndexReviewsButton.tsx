"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { indexProductReviewsAction } from "@/app/actions/indexing-actions";
import { Database } from "lucide-react";
import { toast } from "sonner";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface IndexReviewsButtonProps {
  productId: string;
  reviewCount?: number;
}

type IndexingResult = 
  | { success: true; count: number; error?: undefined }
  | { success: false; error: string; count?: undefined };

export function IndexReviewsButton({ productId, reviewCount = 0 }: IndexReviewsButtonProps) {
  const [isIndexing, setIsIndexing] = useState(false);

  const handleIndexReviews = async () => {
    try {
      setIsIndexing(true);
      toast.loading("Indexing reviews for RAG...");
      
      const result = await indexProductReviewsAction(productId) as IndexingResult;
      
      if (result.success) {
        toast.success(`Successfully indexed ${result.count} reviews for RAG`);
      } else {
        toast.error(`Failed to index reviews: ${result.error}`);
      }
    } catch (error) {
      console.error("Error indexing reviews:", error);
      toast.error(`Error indexing reviews: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleIndexReviews}
            disabled={isIndexing || reviewCount === 0}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            {isIndexing ? "Indexing..." : "Index for RAG"}
            {reviewCount > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                {reviewCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reviewCount > 0 
            ? `Index ${reviewCount} reviews for RAG-powered AI chat` 
            : "No reviews available to index"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 