"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
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

export function AddProductButton() {
  const [open, setOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const productName = formData.get("productName") as string
    const productDescription = formData.get("productDescription") as string
    const productUrl = formData.get("productUrl") as string

    // TODO: Add API call to create product
    console.log({ productName, productDescription, productUrl })
    
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to analyze and create marketing content for.
            </DialogDescription>
          </DialogHeader>
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
              <label htmlFor="productDescription" className="text-sm font-medium">
                Product Description
              </label>
              <Input
                id="productDescription"
                name="productDescription"
                placeholder="Enter product description"
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
          </div>
          <DialogFooter>
            <Button type="submit">Add Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddProductIcon() {
  const [open, setOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const productName = formData.get("productName") as string
    const productDescription = formData.get("productDescription") as string
    const productUrl = formData.get("productUrl") as string

    // TODO: Add API call to create product
    console.log({ productName, productDescription, productUrl })
    
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to analyze and create marketing content for.
            </DialogDescription>
          </DialogHeader>
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
              <label htmlFor="productDescription" className="text-sm font-medium">
                Product Description
              </label>
              <Input
                id="productDescription"
                name="productDescription"
                placeholder="Enter product description"
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
          </div>
          <DialogFooter>
            <Button type="submit">Add Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 