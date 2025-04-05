import { createClient } from "../../utils/supabase/server";
import { NextResponse } from "next/server";
import { createProfile } from "@/app/actions/createProfile";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const requestUrl = new URL(request.url);
  console.log("requestUrl", requestUrl);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!authError && user) {
      console.log('Auth callback - User data:', {
        id: user.id,
        email: user.email,
        provider: user.app_metadata?.provider,
        created_at: user.created_at,
      });
      // First check if a profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!existingProfile) {
        console.log('No existing profile found, creating new profile');
        
        // Get user details from OAuth metadata if available
        const fullName = user.user_metadata?.full_name;
        const preferredName = user.user_metadata?.name;
        const email = user.email;
        // Generate username with priority: preferred name > full name > email > user id
        let userName = preferredName 
          || (fullName?.split(' ')[0].toLowerCase()) 
          || (email?.split('@')[0]) 
          || `user_${user.id.slice(0, 8)}`;
        // Remove special characters and spaces from username
        userName = userName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const { error: profileError } = await createProfile({
          userId: user.id,
          userName,
        });
        if (profileError) {
          console.error('Failed to create profile:', profileError);
          return NextResponse.redirect(`${requestUrl.origin}/?message=Could not create user profile`);
        }
        console.log('Successfully created profile for user:', userName);
      } else {
        console.log('Existing profile found, skipping profile creation');
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}
