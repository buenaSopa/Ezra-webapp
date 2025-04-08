import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Link as LinkIcon, FileText, Download } from "lucide-react";

interface Resource {
  name: string;
  url: string;
  id?: string;
  description?: string;
  resourceType?: string;
  isFile?: boolean;
}

interface ProductResourcesProps {
  resources: Resource[];
  isEditing: boolean;
  onAddResource: () => void;
  onRemoveResource: (index: number) => void;
  onResourceChange: (index: number, field: string, value: string) => void;
}

export function ProductResources({
  resources = [],
  isEditing,
  onAddResource,
  onRemoveResource,
  onResourceChange
}: ProductResourcesProps) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <Label>Product Resources</Label>
        {isEditing && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={onAddResource}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Resource
          </Button>
        )}
      </div>
      
      {resources.length ? (
        <div className="space-y-3 max-h-[180px] overflow-y-auto border rounded-md p-3">
          {resources.map((resource, index) => (
            <div key={index} className={`flex items-center gap-2 ${isEditing ? 'mb-2' : ''}`}>
              {resource.isFile ? (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 w-full">
                  <Input
                    className="md:col-span-2"
                    value={resource.name}
                    onChange={(e) => onResourceChange(index, 'name', e.target.value)}
                    placeholder="Resource name"
                  />
                  {!resource.isFile && (
                    <Input
                      className="md:col-span-2"
                      value={resource.url}
                      onChange={(e) => onResourceChange(index, 'url', e.target.value)}
                      placeholder="https://example.com"
                    />
                  )}
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => onRemoveResource(index)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col w-full">
                  <span className="text-sm font-medium">{resource.name}</span>
                  {resource.isFile ? (
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-blue-500 hover:underline flex items-center"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download file
                    </a>
                  ) : (
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-blue-500 hover:underline"
                    >
                      {resource.url}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No resources added yet</p>
      )}
    </div>
  );
} 