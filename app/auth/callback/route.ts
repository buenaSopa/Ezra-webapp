import { createClient } from "../../utils/supabase/server";
import { NextResponse } from "next/server";
import { createProfile } from "@/app/actions/createProfile";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!authError && user) {
      // Check if this is a new OAuth user by looking at their email verification
      const isNewUser = user.created_at === user.confirmed_at;
      
      if (isNewUser) {
        // Create profile for new OAuth users
        const userName = user.email ? user.email.split('@')[0] : `user_${user.id.slice(0, 8)}`;
        const { error: profileError } = await createProfile({
          userId: user.id,
          userName,
        });

        if (profileError) {
          console.error('Failed to create profile:', profileError);
          return NextResponse.redirect(`${requestUrl.origin}/?message=Could not create user profile`);
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}
