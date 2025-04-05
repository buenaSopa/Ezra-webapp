"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";

interface Product {
  id: string;
  name: string;
}

// Event to refresh product list when a new product is added
const EVENT_NAME = "product-list-changed";
export const refreshProductList = () => {
  // Dispatch an event when products are added or deleted
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
};

export function RecentProductsWrapper({ limit = 5 }: { limit?: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchProducts = async () => {
    setIsLoading(true);
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const { data } = await supabase
      .from("products")
      .select("id, name")
      .eq("user_id", user.id) // Only fetch products belonging to the current user
      .not("metadata->is_competitor", "eq", true)
      .order("updated_at", { ascending: false })
      .limit(limit);
    
    if (data) {
      setProducts(data);
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchProducts();
    
    // Listen for product changes and refresh the list
    const handleProductChange = () => {
      fetchProducts();
    };
    
    window.addEventListener(EVENT_NAME, handleProductChange);
    
    return () => {
      window.removeEventListener(EVENT_NAME, handleProductChange);
    };
  }, [limit]);
  
  if (isLoading) {
    // Show loading state
    return (
      <div className="space-y-1 mt-2">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="h-8 w-full bg-muted/20 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }
  
  if (products.length === 0) {
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