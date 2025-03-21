import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, AlertCircle, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  created_at: string;
  metadata: {
    url?: string;
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
  onCompetitorMetadataChange
}: ProductCompetitorsProps) {
  const router = useRouter();
  
  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <Label>Competitors</Label>
        {isEditing && (
          <div className="flex space-x-2">
            <select 
              className="text-sm rounded border p-1"
              onChange={(e) => {
                if (e.target.value) {
                  onAddCompetitor(e.target.value);
                  e.target.value = ""; // Reset after selection
                }
              }}
            >
              <option value="">Select competitor...</option>
              {availableProducts.map(prod => (
                <option key={prod.id} value={prod.id}>
                  {prod.name}
                </option>
              ))}
            </select>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/products/new')}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> New Competitor
            </Button>
          </div>
        )}
      </div>
      
      {competitors.length ? (
        <div className="space-y-3 max-h-[180px] overflow-y-auto border rounded-md p-3">
          {competitors.map((relation) => {
            const isEditingThisCompetitor = relation.competitor && editingCompetitorId === relation.competitor.id;
            
            return (
              <div key={relation.id} className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                
                {isEditingThisCompetitor && editedCompetitor ? (
                  <div className="flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
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
                        <Label htmlFor={`comp-url-${relation.id}`} className="text-xs mb-1">URL</Label>
                        <Input
                          id={`comp-url-${relation.id}`}
                          value={editedCompetitor.metadata?.url || ''}
                          onChange={(e) => onCompetitorMetadataChange('url', e.target.value)}
                          placeholder="https://competitor.com"
                          className="h-8 text-sm"
                        />
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
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col flex-grow">
                      <span className="text-sm font-medium">{relation.competitor?.name || "Unknown Competitor"}</span>
                      {relation.competitor?.metadata?.url && (
                        <a 
                          href={relation.competitor.metadata.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {relation.competitor.metadata.url}
                        </a>
                      )}
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