import Link from "next/link";
import { headers, cookies } from "next/headers";
import { createClient } from "./utils/supabase/server";
import { redirect } from "next/navigation";
import { SubmitButton } from './components/SubmitButton';
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { createProfile, generateDefaultUsername } from "./actions/createProfile";
import { GoogleSignInButton } from './components/GoogleSignInButton';

export default async function Login({
  searchParams,
}: {
  searchParams: { message: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return redirect("/dashboard");
  }

  const signIn = async (formData: FormData) => {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return redirect("/?message=Could not authenticate user");
    }

    return redirect("/dashboard");
  };

  const signUp = async (formData: FormData) => {
    "use server";

    const origin = headers().get("origin");
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (authError || !authData.user) {
      return redirect("/?message=Could not authenticate user");
    }

    // Create profile for the new user
    const { error: profileError } = await createProfile({
      userId: authData.user.id,
      userName: generateDefaultUsername(email),
    });
    if (profileError) {
      // If profile creation fails, attempt to clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return redirect("/?message=Could not create user profile");
    }
    return redirect("/?message=Check email to continue sign in process");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#f8f0fc] via-[#fef3e8] to-[#fce7ef]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Welcome to Ezra</h1>
          <p className="text-gray-500">
            AI-powered marketing assistant for creative strategists
          </p>
        </CardHeader>

        <CardContent>
          <form
            className="flex flex-col gap-4"
            action={signIn}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                className="w-full rounded-md px-4 py-2 bg-background border shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition"
                name="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                className="w-full rounded-md px-4 py-2 bg-background border shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-2 pt-2">
              <SubmitButton className="w-full hover:bg-green-800 text-white bg-primary rounded-md px-4 py-2 transition-colors">
                Sign In
              </SubmitButton>
              <SubmitButton
                formAction={signUp}
                className="w-full border border-gray-300 hover:bg-gray-50 rounded-md px-4 py-2 transition-colors"
              >
                Sign Up
              </SubmitButton>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <GoogleSignInButton />
            </div>

            {searchParams?.message && (
              <p className="p-4 bg-foreground/10 text-foreground text-center text-sm rounded-md">
                {searchParams.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
