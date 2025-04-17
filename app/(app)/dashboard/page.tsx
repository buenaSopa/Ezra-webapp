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
      <div className="container rounded-xl min-h-screen p-8 mx-auto ">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-light mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#B58ECC] via-[#E28A3F] to-[#C11F60]">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-400">Welcome</span> {' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500">to Ezra</span>
          </h1>
          <p className="text-muted-foreground">Your AI-powered creative strategist for better marketing decisions</p>
        </div>
        <RecentChats limit={6} />
      </div>
  );
} 