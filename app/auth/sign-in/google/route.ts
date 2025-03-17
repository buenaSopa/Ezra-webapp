import { createClient } from "@/app/utils/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST() {
  const headersList = headers();
  const origin = headersList.get("origin");
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  
  if (error) {
    return NextResponse.redirect(
      `${origin}/?message=Could not authenticate user`,
      {
        // a 301 status is required to redirect from a POST to a GET route
        status: 301,
      }
    );
  }
  
  return NextResponse.redirect(data.url, {
    // a 301 status is required to redirect from a POST to a GET route
    status: 301,
  });
} 