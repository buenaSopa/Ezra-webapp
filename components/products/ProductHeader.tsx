import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, MessageSquare, ExternalLink, RefreshCw } from "lucide-react";
import { IndexReviewsButton } from "./IndexReviewsButton";

interface ProductHeaderProps {
  product: {
    id: string;
    name: string;
    created_at: string;
    last_reviews_scraped_at?: string;
    last_indexed_at?: string;
    metadata: {
      url?: string;
      [key: string]: any;
    };
  };
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onStartChat: () => void;
  onRefreshReviews?: (includeCompetitors?: boolean) => void;
  isRefreshingReviews?: boolean;
  competitorCount?: number;
  reviewCount?: number;
  onInputChange: (field: string, value: string) => void;
  onMetadataChange: (field: string, value: any) => void;
  scrapingStatus?: {
    text: string;
    color: string;
    isReady: boolean;
    subtext?: string;
  };
  hideIndexForRag?: boolean;
  showRefreshButton?: boolean;
}

export function ProductHeader({
  product,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onStartChat,
  onRefreshReviews,
  isRefreshingReviews = false,
  competitorCount = 0,
  reviewCount = 0,
  onInputChange,
  onMetadataChange,
  scrapingStatus = { text: 'Ready', color: 'text-muted-foreground', isReady: true },
  hideIndexForRag = false,
  showRefreshButton = false
}: ProductHeaderProps) {
  // Format the last reviews scraped date
  const formatLastScrapedDate = () => {
    if (!product.last_reviews_scraped_at) return null;
    
    try {
      const date = new Date(product.last_reviews_scraped_at);
      // Check if date is valid
      if (isNaN(date.getTime())) return null;
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Reviews updated today';
      } else if (diffDays === 1) {
        return 'Reviews updated yesterday';
      } else if (diffDays < 7) {
        return `Reviews updated ${diffDays} days ago`;
      } else {
        return `Reviews last updated on ${date.toLocaleDateString()}`;
      }
    } catch (error) {
      return null;
    }
  };

  // Format the last indexed date
  const formatLastIndexedDate = () => {
    if (!product.last_indexed_at) return null;
    
    try {
      const date = new Date(product.last_indexed_at);
      // Check if date is valid
      if (isNaN(date.getTime())) return null;
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Reviews indexed today';
      } else if (diffDays === 1) {
        return 'Reviews indexed yesterday';
      } else if (diffDays < 7) {
        return `Reviews indexed ${diffDays} days ago`;
      } else {
        return `Reviews last indexed on ${date.toLocaleDateString()}`;
      }
    } catch (error) {
      return null;
    }
  };

  const lastScrapedText = formatLastScrapedDate();
  const lastIndexedText = formatLastIndexedDate();
  const hasCompetitors = competitorCount > 0;

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center text-2xl font-bold">
          {product.name.charAt(0)}
        </div>
        <div>
          {isEditing ? (
            <Input
              value={product.name}
              onChange={(e) => onInputChange('name', e.target.value)}
              className="text-xl font-bold mb-1 h-9"
            />
          ) : (
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          )}
          <p className="text-sm text-muted-foreground">
            {isEditing ? (
              <Input
                value={product.metadata.url || ''}
                onChange={(e) => onMetadataChange('url', e.target.value)}
                placeholder="Add product URL"
                className="mt-1 text-sm"
              />
            ) : product.metadata.url ? (
              <a href={product.metadata.url} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline text-blue-500">
                <ExternalLink className="h-3 w-3 mr-1" /> View product
              </a>
            ) : (
              "No product URL added"
            )}
          </p>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" /> Edit Product
              </Button>
              {onRefreshReviews && showRefreshButton && (
                <div className="flex gap-2">
                  <Button 
                    variant={isRefreshingReviews ? "default" : "outline"} 
                    onClick={() => onRefreshReviews(true)} 
                    disabled={isRefreshingReviews}
                    className={isRefreshingReviews ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-300" : ""}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingReviews ? 'animate-spin text-blue-600' : ''}`} /> 
                    {isRefreshingReviews ? "Scraping..." : `Refresh All (${competitorCount + 1})`}
                  </Button>
                  {!hideIndexForRag && (
                    <IndexReviewsButton 
                      productId={product.id} 
                      reviewCount={reviewCount}
                    />
                  )}
                </div>
              )}
              <Button 
                onClick={onStartChat} 
                disabled={!scrapingStatus.isReady}
                className={!scrapingStatus.isReady ? `${scrapingStatus.color} border border-current bg-transparent hover:bg-transparent` : ''}
              >
                {!scrapingStatus.isReady ? (
                  <>
                    <span className={`w-2 h-2 rounded-full mr-2 ${scrapingStatus.color.replace('text-', 'bg-')}`}></span>
                    {scrapingStatus.text}
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" /> Start New Chat
                  </>
                )}
              </Button>
            </>
          )}
        </div>
        {!isEditing && (
          <div className="text-xs text-muted-foreground space-y-1">
            {lastScrapedText && <p>{lastScrapedText}</p>}
            {/* {lastIndexedText && <p>{lastIndexedText}</p>} */}
            {scrapingStatus && !hideIndexForRag && <p className={scrapingStatus.text.includes('in progress') ? 'text-blue-500 font-medium' : ''}>{scrapingStatus.text}</p>}
          </div>
        )}
      </div>
    </div>
  );
} 