import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { createClient } from "@/app/utils/supabase/server";

interface Product {
  id: string;
  name: string;
}

export async function RecentProductsList({ limit = 5 }: { limit?: number }) {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  // Fetch recent products
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .eq("is_competitor", false)
    .order("updated_at", { ascending: false })
    .limit(limit);
  
  if (!products || products.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-1 mt-2">
      {products.map((product: Product) => (
        <Link key={product.id} href={`/products/${product.id}`} className="block">
          <Button variant="ghost" className="w-full justify-start text-xs h-8 px-2">
            <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{product.name}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
} 