import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const products = [
    {
      id: "magic-soap",
      name: "Magic Soap",
      description: "Natural soap for skin brightening",
      chatCount: 3,
    },
    {
      id: "skin-brightening-kit",
      name: "Skin Brightening Kit",
      description: "Complete skincare routine",
      chatCount: 2,
    },
    {
      id: "magic-cream",
      name: "Magic Cream",
      description: "Advanced formula cream",
      chatCount: 1,
    },
    {
      id: "face-toner",
      name: "Face Toner",
      description: "Balancing toner for all skin types",
      chatCount: 4,
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Manage your products and marketing campaigns</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Link key={product.id} href={`/products/${product.id}`}>
            <Card className="p-4 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-xs text-gray-500">{product.chatCount} chats</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 