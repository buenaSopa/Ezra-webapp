import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, AlertCircle, Edit, X, Link, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  created_at: string;
  metadata: {
    url?: string;
    description?: string;
    trustpilot_url?: string;
    amazon_asin?: string;
    is_competitor?: boolean;
    competitor_for?: string;
    [key: string]: any;
  };
}

interface ProductCompetitor {
  id: string;
  product_id: string;
  competitor_product_id: string;
  relationship_type: string;
  created_at: string;
  competitor?: Product;
}

interface ProductCompetitorsProps {
  competitors: ProductCompetitor[];
  availableProducts: Product[];
  isEditing: boolean;
  editingCompetitorId: string | null;
  editedCompetitor: Product | null;
  onAddCompetitor: (competitorId: string) => void;
  onRemoveCompetitor: (relationId: string) => void;
  onEditCompetitor: (relation: ProductCompetitor) => void;
  onSaveCompetitorEdit: () => void;
  onCancelCompetitorEdit: () => void;
  onCompetitorChange: (field: string, value: string) => void;
  onCompetitorMetadataChange: (field: string, value: any) => void;
  onCreateNewCompetitor?: (competitor: { name: string, url?: string, amazonAsin?: string, description?: string }) => Promise<void>;
}

export function ProductCompetitors({
  competitors,
  availableProducts,
  isEditing,
  editingCompetitorId,
  editedCompetitor,
  onAddCompetitor,
  onRemoveCompetitor,
  onEditCompetitor,
  onSaveCompetitorEdit,
  onCancelCompetitorEdit,
  onCompetitorChange,
  onCompetitorMetadataChange,
  onCreateNewCompetitor
}: ProductCompetitorsProps) {
  const router = useRouter();
  const [isAddingNewCompetitor, setIsAddingNewCompetitor] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    url: '',
    amazonAsin: '',
    description: ''
  });
  const [isCreatingCompetitor, setIsCreatingCompetitor] = useState(false);

  const handleNewCompetitorChange = (field: string, value: string) => {
    setNewCompetitor(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateCompetitor = async () => {
    if (!newCompetitor.name.trim()) {
      alert("Competitor name is required");
      return;
    }

    setIsCreatingCompetitor(true);
    try {
      // Call the parent component's create function if provided
      if (onCreateNewCompetitor) {
        await onCreateNewCompetitor({
          name: newCompetitor.name.trim(),
          url: newCompetitor.url.trim() || undefined,
          amazonAsin: newCompetitor.amazonAsin.trim() || undefined,
          description: newCompetitor.description.trim() || undefined
        });
      }
      
      // Reset form and close
      setNewCompetitor({
        name: '',
        url: '',
        amazonAsin: '',
        description: ''
      });
      setIsAddingNewCompetitor(false);
    } catch (error) {
      console.error("Error creating competitor:", error);
      alert("Error creating competitor: " + (error as Error).message);
    } finally {
      setIsCreatingCompetitor(false);
    }
  };
  
  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <Label>Competitors</Label>
        {isEditing && (
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setIsAddingNewCompetitor(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> New Competitor
            </Button>
          </div>
        )}
      </div>
      
      {/* New Competitor Form */}
      {isEditing && isAddingNewCompetitor && (
        <Card className="p-4">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-sm font-medium">Add New Competitor</h4>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsAddingNewCompetitor(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new-competitor-name" className="text-xs mb-1">Name <span className="text-red-500">*</span></Label>
              <Input
                id="new-competitor-name"
                value={newCompetitor.name}
                onChange={(e) => handleNewCompetitorChange('name', e.target.value)}
                placeholder="Competitor name"
                className="h-8 text-sm"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="new-competitor-description" className="text-xs mb-1">Description</Label>
              <Textarea
                id="new-competitor-description"
                value={newCompetitor.description}
                onChange={(e) => handleNewCompetitorChange('description', e.target.value)}
                placeholder="Add a description for this competitor"
                className="min-h-[80px] text-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label htmlFor="new-competitor-url" className="text-xs mb-1">Brand URL</Label>
                <div className="relative">
                  <Input
                    id="new-competitor-url"
                    type="url"
                    value={newCompetitor.url}
                    onChange={(e) => handleNewCompetitorChange('url', e.target.value)}
                    placeholder="https://competitor.com"
                    className="h-8 text-sm pl-7"
                  />
                  <Link className="h-3.5 w-3.5 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label htmlFor="new-competitor-amazon" className="text-xs mb-1">Amazon ASIN</Label>
                <Input
                  id="new-competitor-amazon"
                  value={newCompetitor.amazonAsin}
                  onChange={(e) => handleNewCompetitorChange('amazonAsin', e.target.value)}
                  placeholder="B00EXAMPLE"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNewCompetitor(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateCompetitor}
                disabled={isCreatingCompetitor || !newCompetitor.name.trim()}
              >
                {isCreatingCompetitor ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create Competitor
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {competitors.length ? (
        <div className="space-y-3 max-h-[180px] overflow-y-auto border rounded-md p-3">
          {competitors.map((relation) => {
            const isEditingThisCompetitor = relation.competitor && editingCompetitorId === relation.competitor.id;
            
            return (
              <div key={relation.id} className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                
                {isEditingThisCompetitor && editedCompetitor ? (
                  <div className="flex-grow">
                    <div className="space-y-4 mb-4">
                      <div>
                        <Label htmlFor={`comp-name-${relation.id}`} className="text-xs mb-1">Name</Label>
                        <Input
                          id={`comp-name-${relation.id}`}
                          value={editedCompetitor.name}
                          onChange={(e) => onCompetitorChange('name', e.target.value)}
                          placeholder="Competitor name"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`comp-description-${relation.id}`} className="text-xs mb-1">Description</Label>
                        <Textarea
                          id={`comp-description-${relation.id}`}
                          value={editedCompetitor.metadata?.description || ''}
                          onChange={(e) => onCompetitorMetadataChange('description', e.target.value)}
                          placeholder="Add a description for this competitor"
                          className="min-h-[80px] text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`comp-url-${relation.id}`} className="text-xs mb-1">Brand URL</Label>
                          <Input
                            id={`comp-url-${relation.id}`}
                            value={editedCompetitor.metadata?.url || ''}
                            onChange={(e) => onCompetitorMetadataChange('url', e.target.value)}
                            placeholder="https://competitor.com"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`comp-amazon-${relation.id}`} className="text-xs mb-1">Amazon ASIN</Label>
                          <Input
                            id={`comp-amazon-${relation.id}`}
                            value={editedCompetitor.metadata?.amazon_asin || ''}
                            onChange={(e) => onCompetitorMetadataChange('amazon_asin', e.target.value)}
                            placeholder="Enter Amazon ASIN"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={onCancelCompetitorEdit}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button" 
                        variant="default" 
                        size="sm" 
                        onClick={onSaveCompetitorEdit}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col flex-grow">
                      <span className="text-sm font-medium">{relation.competitor?.name || "Unknown Competitor"}</span>
                      
                      {relation.competitor?.metadata?.description && (
                        <p className="text-xs text-muted-foreground mt-1 mb-1 line-clamp-2">
                          {relation.competitor.metadata.description}
                        </p>
                      )}
                      
                      <div className="space-y-1 mt-1">
                        {relation.competitor?.metadata?.url && (
                          <a 
                            href={relation.competitor.metadata.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-blue-500 hover:underline flex items-center"
                          >
                            <span className="mr-1">•</span> Website: {relation.competitor.metadata.url}
                          </a>
                        )}
                        
                        {relation.competitor?.metadata?.amazon_asin && (
                          <p className="text-xs text-muted-foreground flex items-center">
                            <span className="mr-1">•</span> Amazon ASIN: {relation.competitor.metadata.amazon_asin}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {isEditing && (
                      <div className="flex space-x-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={() => onEditCompetitor(relation)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-destructive hover:text-destructive/90"
                          onClick={() => onRemoveCompetitor(relation.id)}
                        >
                          <span className="sr-only">Remove</span>
                          <AlertCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No competitors added yet</p>
      )}
    </div>
  );
} 