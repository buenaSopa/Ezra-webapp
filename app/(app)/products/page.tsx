import { createClient } from "@/app/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { AddProductButton } from "@/components/add-product-dialog";
import { DeleteProductButton } from "@/components/delete-product-dialog";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ChevronDown, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Eye 
} from "lucide-react";

export default async function ProductsPage() {
  const supabase = createClient();
  
  // Fetch products from the database, excluding competitors
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, metadata, created_at")
    .not("metadata->is_competitor", "eq", true) // Filter out products where is_competitor is true
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching products:", error);
  }
  
  return (
    <div className="container mx-auto py-4 max-w-5xl h-full overflow-auto">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0 pb-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Products</CardTitle>
              <CardDescription className="text-sm">
                All your products in one place, manage and edit your brand.
              </CardDescription>
            </div>
            <AddProductButton />
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name..."
                className="w-full pl-8"
              />
            </div>
            <div className="flex items-center">
              <span className="mr-2 text-sm text-muted-foreground">Sort by:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1 h-9">
                    Last Modified
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Name</DropdownMenuItem>
                  <DropdownMenuItem>Last Modified</DropdownMenuItem>
                  <DropdownMenuItem>Date Created</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Empty state or products table will go here */}
          {!products || products.length === 0 ? (
            <Card className="border border-dashed">
              <CardContent className="text-center py-8">
                <h2 className="text-lg font-medium mb-2">No products yet</h2>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">
                  Get started by adding your first product. You can manage all your products from this dashboard.
                </p>
                <AddProductButton />
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Name</TableHead>
                      <TableHead className="w-[30%]">URL</TableHead>
                      <TableHead className="w-[20%]">Created</TableHead>
                      <TableHead className="w-[10%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium py-3">
                          <div className="flex flex-col">
                            <span>{product.name}</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              {product.metadata?.description || "No description available"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3">
                          {product.metadata?.url ? (
                            <a 
                              href={product.metadata.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {product.metadata.url}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3 text-sm">
                          {new Date(product.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a href={`/products/${product.id}`} className="flex items-center">
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>View</span>
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`/products/${product.id}/edit`} className="flex items-center">
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DeleteProductButton 
                                productId={product.id} 
                                productName={product.name} 
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 