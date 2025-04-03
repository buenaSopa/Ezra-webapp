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
      <RecentChats limit={4} />
    </div>
  );
} 