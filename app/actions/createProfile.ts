import { createClient } from "@/app/utils/supabase/server";

export async function createProfile({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      user_name: userName,
    })
    .single();
  return { error };
}

export function generateDefaultUsername(email: string): string {
  return email.split('@')[0];
} 