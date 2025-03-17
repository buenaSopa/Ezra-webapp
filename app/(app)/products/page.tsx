import { createClient } from "@/app/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { AddProductButton } from "@/components/add-product-dialog";
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
  DropdownMenuTrigger 
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
  Trash, 
  Eye 
} from "lucide-react";

export default async function ProductsPage() {
  const supabase = createClient();
  
  // Fetch products from the database
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, metadata, created_at")
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching products:", error);
  }
  
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Products</CardTitle>
              <CardDescription>
                All your products in one place, manage and edit your brand.
              </CardDescription>
            </div>
            <AddProductButton />
          </div>
        </CardHeader>
        <CardContent className="px-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
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
                  <Button variant="outline" className="flex items-center gap-1">
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
              <CardContent className="text-center py-12">
                <h2 className="text-xl font-medium mb-2">No products yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Get started by adding your first product. You can manage all your products from this dashboard.
                </p>
                <AddProductButton />
              </CardContent>
            </Card>
          ) : (
            <Card>
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
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {product.metadata?.description || "No description available"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.metadata?.url ? (
                          <a 
                            href={product.metadata.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {product.metadata.url}
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(product.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                            <DropdownMenuItem className="text-destructive flex items-center">
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 