import { createClient } from "@/app/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { AddProductButton } from "@/components/add-product-dialog";

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
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Your Products</h1>
        <AddProductButton />
      </div>
      
      {/* Empty state or products table will go here */}
      {!products || products.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <h2 className="text-xl font-medium mb-2">No products yet</h2>
          <p className="text-muted-foreground mb-6">
            Get started by adding your first product
          </p>
          <AddProductButton />
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">URL</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.metadata?.url || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={`/products/${product.id}`}>View</a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 