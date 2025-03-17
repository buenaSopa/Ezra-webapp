import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  // Check if the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to login page
  if (!user) {
    return redirect("/?message=Please sign in to access this page");
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background w-full">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
} 