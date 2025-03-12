'use client';

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function AuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      router.refresh();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      className="w-full justify-start text-destructive hover:text-destructive"
      onClick={handleSignOut}
      disabled={isLoading}
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span className={isLoading ? 'opacity-0' : 'opacity-100'}>Logout</span>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </Button>
  );
}
