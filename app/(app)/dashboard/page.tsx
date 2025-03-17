import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { AddProductButton } from "@/components/add-product-dialog";

export default async function Dashboard() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  return (
    <div className="text-center max-w-[400px] px-4 mx-auto">
      <h2 className="text-2xl font-semibold mb-3">Get Started</h2>
      <p className="text-muted-foreground mb-6">Add your first product to start creating marketing content</p>
      <AddProductButton />
    </div>
  );
} 