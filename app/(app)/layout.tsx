import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
} 