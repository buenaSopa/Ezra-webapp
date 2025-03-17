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

// Define types for our form data
type Competitor = {
  name: string;
  url: string;
  amazonAsin?: string;
  trustpilotUrl?: string;
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
  const [resources, setResources] = useState<Resource[]>([])
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
    const files = Array.from(event.target.files || [])
    console.log('Product files added:', files.map(f => f.name))
    setProductFiles([...productFiles, ...files])
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

  const handleAddResource = () => {
    setResources([...resources, { type: 'document', title: '', file: null }])
  }

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index))
  }

  const handleResourceChange = (index: number, field: keyof Resource, value: any) => {
    const updatedResources = [...resources]
    updatedResources[index] = {
      ...updatedResources[index],
      [field]: value
    }
    
    // Log when a file is added to a resource
    if (field === 'file' && value) {
      console.log(`Resource ${index} file added:`, value.name)
    }
    
    setResources(updatedResources)
  }

  const handleCompetitorCollapsibleChange = (index: number, isOpen: boolean) => {
    const newStates = [...competitorCollapsibleStates]
    newStates[index] = isOpen
    setCompetitorCollapsibleStates(newStates)
  }

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
    setIsSubmitting(true)
    
    try {
      // Show initial toast
      toast.info("Creating product...", { id: "product-creation" })
      
      const formData = new FormData(e.currentTarget)
      const productName = formData.get("productName") as string
      const productUrl = formData.get("productUrl") as string
      const productAmazonAsin = formData.get("productAmazonAsin") as string
      const productTrustpilotUrl = formData.get("productTrustpilotUrl") as string
      
      // Prepare data for API call
      const productData = {
        name: productName,
        url: productUrl,
        amazonAsin: productAmazonAsin || undefined,
        trustpilotUrl: productTrustpilotUrl || undefined,
        competitors: competitors.filter(c => c.name && c.url).map(c => ({
          name: c.name,
          url: c.url,
          amazonAsin: c.amazonAsin,
          trustpilotUrl: c.trustpilotUrl
        })),
        resources: resources.filter(r => r.title && (r.url || r.file)).map(r => ({
          type: r.type,
          title: r.title,
          url: r.url
        }))
      }

      console.log('Product files before submission:', productFiles.map(f => f.name))
      console.log('Competitor files before submission:', competitors.map(c => ({ 
        name: c.name, 
        files: c.files.map(f => f.name) 
      })))
      console.log('Resource files before submission:', resources
        .filter(r => r.file)
        .map(r => ({ title: r.title, fileName: r.file?.name }))
      )

      // Call the server action to create the product
      const result = await createProduct(productData)
      
      if (!result.success) {
        toast.error(`Failed to create product: ${result.error}`, { id: "product-creation" })
        throw new Error(result.error || "Failed to create product")
      }
      
      // Update toast with success
      toast.success(`Product "${productName}" created successfully!`, { id: "product-creation" })
      
      // Handle file uploads if any
      const allFiles = [
        ...productFiles.map(file => ({ file, type: 'document', title: file.name })),
        ...competitors.flatMap((competitor, index) => 
          competitor.files.map(file => ({ file, type: 'document', title: `${competitor.name} - ${file.name}` }))
        ),
        ...resources.filter(r => r.file).map(r => ({ file: r.file!, type: r.type, title: r.title }))
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
      setResources([])
      
      // Call the success callback
      if (onSuccess) {
        onSuccess()
      }
      
      // Show final success message
      toast.success(`Product "${productName}" is ready!`, { 
        duration: 5000,
        description: "You'll be redirected to the product page."
      })
      
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
        {/* <h3 className="text-lg font-medium">Product Information</h3> */}
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
            Product URL
          </label>
          <Input
            id="productUrl"
            name="productUrl"
            type="url"
            placeholder="https://example.com/product"
            required
          />
        </div>

        <Collapsible open={isAdditionalInfoOpen} onOpenChange={setIsAdditionalInfoOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex w-full justify-between">
              <span>Additional Product Information</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isAdditionalInfoOpen && "transform rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid gap-2">
              <label htmlFor="productAmazonAsin" className="text-sm font-medium">
                Amazon ASIN (optional)
              </label>
              <Input
                id="productAmazonAsin"
                name="productAmazonAsin"
                placeholder="B00EXAMPLE"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="productTrustpilotUrl" className="text-sm font-medium">
                Trustpilot URL (optional)
              </label>
              <Input
                id="productTrustpilotUrl"
                name="productTrustpilotUrl"
                type="url"
                placeholder="https://www.trustpilot.com/review/example.com"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Product Files
              </label>
              <div className="grid gap-3">
                <Input
                  type="file"
                  onChange={handleProductFileChange}
                  className="flex-1"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.csv"
                />
                {productFiles.length > 0 && (
                  <div className="grid gap-2">
                    {productFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProductFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
                        <label className="text-sm">Trustpilot URL (optional)</label>
                        <Input
                          type="url"
                          value={competitor.trustpilotUrl || ''}
                          onChange={(e) => handleCompetitorChange(index, 'trustpilotUrl', e.target.value)}
                          placeholder="https://www.trustpilot.com/review/competitor.com"
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
      
      {/* Additional Resources Section */}
      <div className="grid gap-4 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Additional Resources</h3>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleAddResource}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Resource
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Add any additional resources like reviews, documents, etc.</p>
        
        {resources.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No additional resources added yet.</p>
        )}
        
        {resources.map((resource, index) => (
          <Card key={index} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-medium">Resource {index + 1}</h4>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => handleRemoveResource(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm">Resource Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={resource.type}
                  onChange={(e) => handleResourceChange(index, 'type', e.target.value as 'document' | 'other')}
                  required
                >
                  <option value="document">Document</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-sm">Title</label>
                <Input
                  value={resource.title}
                  onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                  placeholder="Resource title"
                  required
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm">Upload File</label>
                <Input
                  type="file"
                  onChange={(e) => handleResourceChange(index, 'file', e.target.files?.[0] || null)}
                  className="flex-1"
                  accept=".pdf,.doc,.docx,.txt,.csv"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm">Or Provide URL</label>
                <Input
                  type="url"
                  value={resource.url || ''}
                  onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                  placeholder="https://example.com/resource"
                  disabled={!!resource.file}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
      
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