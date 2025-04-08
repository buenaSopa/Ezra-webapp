"use client"

import { useState } from "react"
import { Plus, X, Upload, Link, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { createProduct, uploadMarketingResourceFile } from "@/app/actions/products"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { cn } from "@/lib/utils"
import { refreshProductList } from "./RecentProductsWrapper"

// Define types for our form data
type Competitor = {
  name: string;
  url: string;
  amazonAsin?: string;
  files: File[];
  isAdditionalInfoOpen?: boolean;
}

type Resource = {
  type: 'document' | 'other';
  title: string;
  file: File | null;
  url?: string;
  forEntityId?: string; // Links resource to either main product or a competitor
}

// Shared form component
function AddProductForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const router = useRouter()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [productFiles, setProductFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false)
  const [isCompetitorsOpen, setIsCompetitorsOpen] = useState(false)
  const [competitorCollapsibleStates, setCompetitorCollapsibleStates] = useState<boolean[]>([])

  const handleAddCompetitor = () => {
    if (competitors.length < 5) {
      const newCompetitor: Competitor = {
        name: '',
        url: '',
        files: [],
      }
      setCompetitors([...competitors, newCompetitor])
      setCompetitorCollapsibleStates([...competitorCollapsibleStates, false])
    }
  }

  const handleRemoveCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index))
    setCompetitorCollapsibleStates(competitorCollapsibleStates.filter((_, i) => i !== index))
  }

  const handleCompetitorChange = (index: number, field: keyof Competitor, value: string | File[]) => {
    const updatedCompetitors = [...competitors]
    updatedCompetitors[index] = {
      ...updatedCompetitors[index],
      [field]: value
    }
    setCompetitors(updatedCompetitors)
  }

  const handleProductFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    const files = Array.from(event.target.files);
    console.log('Product files added:', files.map(f => f.name));
    
    // Create a copy of the files for state update
    const newFiles = [...files];
    
    // Update state with the new files
    setProductFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...newFiles];
      console.log('Updated productFiles state:', updatedFiles.map(f => f.name));
      return updatedFiles;
    });
  }

  const handleCompetitorFileChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    console.log(`Competitor ${index} files added:`, files.map(f => f.name))
    const updatedCompetitors = [...competitors]
    updatedCompetitors[index].files = [...updatedCompetitors[index].files, ...files]
    setCompetitors(updatedCompetitors)
  }

  const handleRemoveProductFile = (index: number) => {
    setProductFiles(productFiles.filter((_, i) => i !== index))
  }

  const handleRemoveCompetitorFile = (competitorIndex: number, fileIndex: number) => {
    const updatedCompetitors = [...competitors]
    updatedCompetitors[competitorIndex].files = updatedCompetitors[competitorIndex].files.filter((_, i) => i !== fileIndex)
    setCompetitors(updatedCompetitors)
  }

  const handleCompetitorCollapsibleChange = (index: number, isOpen: boolean) => {
    const newStates = [...competitorCollapsibleStates]
    newStates[index] = isOpen
    setCompetitorCollapsibleStates(newStates)
  }
  
  // File handling with drag and drop support
  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) {
      return;
    }
    
    const files = Array.from(event.dataTransfer.files);
    console.log('Files dropped:', files.map(f => f.name));
    
    setProductFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...files];
      console.log('Updated productFiles state after drop:', updatedFiles.map(f => f.name));
      return updatedFiles;
    });
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Get form data
    const formData = new FormData(e.currentTarget)
    const productName = formData.get("productName") as string
    const productUrl = formData.get("productUrl") as string
    const productAmazonAsin = formData.get("productAmazonAsin") as string
    
    // Only check if we have a product name - no other validation
    if (!productName) {
      toast.error("Please provide a product name");
      return;
    }
    
    setIsSubmitting(true)
    
    try {
      // Prepare data for API call
      const productData = {
        name: productName,
        url: productUrl || undefined,
        amazonAsin: productAmazonAsin || undefined,
        competitors: competitors.filter(c => c.name && c.url).map(c => ({
          name: c.name,
          url: c.url,
          amazonAsin: c.amazonAsin,
        })),
        resources: [] // Empty resources array, since we're handling files directly
      }

      console.log('Product files before submission:', productFiles.map(f => f.name))
      console.log('Competitor files before submission:', competitors.map(c => ({ 
        name: c.name, 
        files: c.files.map(f => f.name) 
      })))

      // Call the server action to create the product
      const result = await createProduct(productData)
      
      if (!result.success) {
        toast.error(`Failed to create product: ${result.error}`, { id: "product-creation" })
        throw new Error(result.error || "Failed to create product")
      }
      
      // Handle file uploads if any
      const allFiles = [
        ...productFiles.map(file => ({ file, type: 'document', title: file.name })),
        ...competitors.flatMap((competitor, index) => 
          competitor.files.map(file => ({ file, type: 'document', title: `${competitor.name} - ${file.name}` }))
        )
      ]
      
      console.log(`All files to upload (${allFiles.length}):`, allFiles.map(f => ({ 
        title: f.title, 
        type: f.type, 
        fileName: f.file.name,
        fileSize: f.file.size,
        fileType: f.file.type
      })))
      
      // Upload all files as resources
      if (allFiles.length > 0) {
        // Create a unique ID for the file upload toast
        const fileUploadToastId = "file-upload-" + result.productId
        
        // Show initial upload toast
        toast.info(`Uploading ${allFiles.length} files...`, { id: fileUploadToastId })
        
        let successCount = 0
        let failureCount = 0
        
        for (const { file, type, title } of allFiles) {
          console.log(`Starting upload for file: ${file.name}`)
          const resourceId = uuidv4()
          try {
            // Convert File to base64 string
            const base64String = await fileToBase64(file);
            console.log(`Converted file to base64 string (length: ${base64String.length})`);
            
            // Show individual file upload toast
            const fileToastId = "file-" + resourceId
            toast.loading(`Uploading ${file.name}...`, { id: fileToastId })
            
            // Call the server action with file data instead of File object
            const result2 = await uploadMarketingResourceFile(
              result.productId!, 
              resourceId, 
              file.name,
              file.type,
              base64String
            )
            
            console.log(`Upload result for ${file.name}:`, result2)
            if (!result2.success) {
              console.error(`Failed to upload file ${file.name}:`, result2.error)
              toast.error(`Failed to upload ${file.name}: ${result2.error}`, { id: fileToastId })
              failureCount++
            } else {
              toast.success(`Uploaded ${file.name}`, { id: fileToastId })
              successCount++
            }
          } catch (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError)
            toast.error(`Error uploading ${file.name}`, { id: "file-" + resourceId })
            failureCount++
          }
        }
        
        // Update the main file upload toast with final status
        if (failureCount === 0) {
          toast.success(`All ${allFiles.length} files uploaded successfully!`, { id: fileUploadToastId })
        } else if (successCount === 0) {
          toast.error(`Failed to upload all ${allFiles.length} files`, { id: fileUploadToastId })
        } else {
          toast.warning(`Uploaded ${successCount} files, ${failureCount} failed`, { id: fileUploadToastId })
        }
      } else {
        console.log('No files to upload')
      }
      
      // Reset form
      setCompetitors([])
      setProductFiles([])
      
      // Call the success callback
      if (onSuccess) {
        onSuccess()
      }
      
      // Refresh the product list in the sidebar
      refreshProductList()
      
      // Navigate to the product page
      if (result.productId) {
        // Short delay before redirect to allow user to see the success message
        setTimeout(() => {
          router.push(`/products/${result.productId}`)
        }, 1000)
      }
    } catch (error) {
      console.error("Error creating product:", error)
      toast.error((error as Error).message || "Failed to create product")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add New Product</DialogTitle>
      </DialogHeader>
      
      {/* Main Product Section */}
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <label htmlFor="productName" className="text-sm font-medium">
            Product Name
          </label>
          <Input
            id="productName"
            name="productName"
            placeholder="Enter product name"
            required
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="productUrl" className="text-sm font-medium">
            Brand URL
          </label>
          <Input
            id="productUrl"
            name="productUrl"
            type="url"
            placeholder="https://example.com"
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="productAmazonAsin" className="text-sm font-medium">
            Amazon ASIN
          </label>
          <Input
            id="productAmazonAsin"
            name="productAmazonAsin"
            placeholder="B00EXAMPLE"
          />
        </div>
        
        {/* Direct file upload option */}
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <label htmlFor="productFiles" className="text-sm font-medium">
              Upload Files Directly
            </label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Trigger the hidden file input
                const fileInput = document.getElementById('productFiles') as HTMLInputElement;
                if (fileInput) fileInput.click();
              }}
            >
              <Upload className="h-4 w-4 mr-1" /> Select Files
            </Button>
          </div>
          
          <Input
            id="productFiles"
            name="productFiles"
            type="file"
            multiple
            onChange={handleProductFileChange}
            accept=".csv,.xlsx,.xls,.txt,.pdf,.doc,.docx"
            className="hidden" // Hide the default file input
          />
          
          {productFiles.length > 0 ? (
            <div className="grid gap-2 mt-2 border rounded-md p-3">
              <div className="text-sm font-medium text-green-600 flex items-center mb-2">
                <Upload className="h-4 w-4 mr-2" />
                {productFiles.length} file(s) selected
              </div>
              
              {productFiles.map((file, fileIndex) => (
                <div key={fileIndex} className="flex items-center justify-between bg-muted p-2 rounded-md">
                  <span className="text-sm truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveProductFile(fileIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer"
                 onClick={() => {
                   const fileInput = document.getElementById('productFiles') as HTMLInputElement;
                   if (fileInput) fileInput.click();
                 }}
                 onDrop={handleFileDrop}
                 onDragOver={handleDragOver}
                 onDragEnter={handleDragOver}>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supported formats: CSV, PDF, DOC, TXT
              </p>
            </div>
          )}
        </div>
      </div>
      
      <Separator className="my-2" />
      
      {/* Competitors Section */}
      <div className="grid gap-4 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Competitors</h3>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleAddCompetitor}
            disabled={competitors.length >= 5}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Competitor
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Add up to 5 competitors for comparison.</p>
        
        {competitors.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No competitors added yet.</p>
        ) : (
          <div className="space-y-4">
            {competitors.map((competitor, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-medium">Competitor {index + 1}</h4>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveCompetitor(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <label className="text-sm">Name</label>
                    <Input
                      value={competitor.name}
                      onChange={(e) => handleCompetitorChange(index, 'name', e.target.value)}
                      placeholder="Competitor name"
                      required
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm">URL</label>
                    <Input
                      type="url"
                      value={competitor.url}
                      onChange={(e) => handleCompetitorChange(index, 'url', e.target.value)}
                      placeholder="https://competitor-website.com"
                      required
                    />
                  </div>
                  <Collapsible 
                    open={competitorCollapsibleStates[index]} 
                    onOpenChange={(isOpen) => handleCompetitorCollapsibleChange(index, isOpen)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex w-full justify-between">
                        <span>Additional Competitor Information</span>
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          competitorCollapsibleStates[index] && "transform rotate-180"
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-4">
                      <div className="grid gap-1">
                        <label className="text-sm">Amazon ASIN (optional)</label>
                        <Input
                          value={competitor.amazonAsin || ''}
                          onChange={(e) => handleCompetitorChange(index, 'amazonAsin', e.target.value)}
                          placeholder="B00EXAMPLE"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm">Additional Files</label>
                        <Input
                          type="file"
                          onChange={(e) => handleCompetitorFileChange(index, e)}
                          className="flex-1"
                          multiple
                          accept=".pdf,.doc,.docx,.txt,.csv"
                        />
                        {competitor.files.length > 0 && (
                          <div className="grid gap-2 mt-2">
                            {competitor.files.map((file, fileIndex) => (
                              <div key={fileIndex} className="flex items-center justify-between bg-muted p-2 rounded-md">
                                <span className="text-sm truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveCompetitorFile(index, fileIndex)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Separator className="my-2" />
      
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Product'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Main button in the products page
export function AddProductButton() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <AddProductForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

// Icon button in the sidebar
export function AddProductIcon() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <AddProductForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}