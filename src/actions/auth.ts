"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/siteUrl";

async function createAuthClient(rememberMe = false) {
  const cookieStore = await cookies();
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(maxAge ? { maxAge } : {}),
              })
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}

export async function signIn(
  email: string,
  password: string,
  rememberMe = false
) {
  const supabase = await createAuthClient(rememberMe);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in failed" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return {
      error:
        "Your account is pending admin approval. Please wait for an administrator to activate your account.",
      pending: true,
    };
  }

  redirect("/dashboard");
}

export async function signUp(params: {
  email: string;
  password: string;
  full_name: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.full_name,
        role: "senior_sales",
        approved: false,
      },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Sign up failed" };

  await supabase.auth.signOut();

  return {
    success: true,
    message:
      "Account created successfully. An administrator must approve your account before you can sign in.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(email: string) {
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });

  if (error) return { error: error.message };

  return {
    success: true,
    message:
      "If an account exists with that email, password reset instructions have been sent.",
  };
}

export async function updatePassword(password: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  return { success: true };
}
