import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { RecentChats } from "@/components/RecentChats";

export default async function Dashboard() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  return (
    <div className="container py-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome to Ezra</h1>
        <p className="text-muted-foreground">Your AI-powered creative strategist for better marketing decisions</p>
      </div>
      <RecentChats limit={5} />
    </div>
  );
} 