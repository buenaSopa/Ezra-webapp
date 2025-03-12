import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import AuthButton from "@/components/AuthButton";
import { 
  FileText, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  Plus,
  PanelLeftClose
} from "lucide-react";

export function Sidebar() {
  return (
    <ShadcnSidebar className="w-[250px] border-r">
      <SidebarRail className="w-2 hover:bg-accent" />
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard">
            <span className="font-semibold cursor-pointer">Ezra</span>
          </Link>
          <SidebarTrigger>
            <PanelLeftClose className="h-4 w-4" />
          </SidebarTrigger>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Products</h2>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <Link href="/products/magic-soap" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Magic Soap
                </Button>
              </Link>
              <Link href="/products/skin-brightening-kit" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Skin Brightening Kit
                </Button>
              </Link>
              <Link href="/products/magic-cream" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Magic Cream
                </Button>
              </Link>
              <Link href="/products/face-toner" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Face Toner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 space-y-2">
        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
        <Link href="/help">
          <Button variant="ghost" className="w-full justify-start">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </Button>
        </Link>
        <AuthButton />
      </SidebarFooter>
    </ShadcnSidebar>
  );
} 