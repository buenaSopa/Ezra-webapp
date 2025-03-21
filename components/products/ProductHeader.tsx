import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, MessageSquare, ExternalLink } from "lucide-react";

interface ProductHeaderProps {
  product: {
    id: string;
    name: string;
    created_at: string;
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
  onInputChange: (field: string, value: string) => void;
  onMetadataChange: (field: string, value: any) => void;
}

export function ProductHeader({
  product,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onStartChat,
  onInputChange,
  onMetadataChange
}: ProductHeaderProps) {
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
            <Button onClick={onStartChat}>
              <MessageSquare className="h-4 w-4 mr-2" /> Start New Chat
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 