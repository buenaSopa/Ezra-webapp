import { createClient } from "../app/utils/supabase/client";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function AuthButton() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const signOut = async () => {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    return redirect("/");
  };

  return user ? (
    <form action={signOut}>
      <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </form>
  ) : null;
}
