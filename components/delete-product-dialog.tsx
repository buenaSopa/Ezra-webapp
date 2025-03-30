"use client";

import { useState } from "react";
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteProduct } from "@/app/actions/products";
import { useRouter } from "next/navigation";

interface DeleteProductButtonProps {
  productId: string;
  productName: string;
}

export function DeleteProductButton({ productId, productName }: DeleteProductButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteProduct(productId);
      setIsOpen(false);
      router.push("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Only allow closing if we're not in the middle of deleting
    if (isDeleting && !open) return;
    setIsOpen(open);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    // Stop event propagation to prevent the dropdown from closing
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 w-full justify-start"
        onClick={handleTriggerClick}
      >
        <Trash className="h-4 w-4 mr-2" />
        Delete
      </Button>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium">{productName}</span>?
            This action cannot be undone and will permanently delete the product and all associated data.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 