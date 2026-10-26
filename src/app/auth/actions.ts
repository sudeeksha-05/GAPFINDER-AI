"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  message: string;
  error?: boolean;
};

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Enter at least 2 characters.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters for your password.").max(128),
});

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the information and try again.";
}

function authCallbackUrl(next: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callback = new URL("/auth/callback", siteUrl);
  callback.searchParams.set("next", next);
  return callback.toString();
}

export async function signInAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { message: validationMessage(parsed.error), error: true };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { message: error.message, error: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Could not connect to Supabase.",
      error: true,
    };
  }

  redirect("/dashboard");
}

export async function signUpAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { message: validationMessage(parsed.error), error: true };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.displayName },
        emailRedirectTo: authCallbackUrl("/dashboard"),
      },
    });
    if (error) return { message: error.message, error: true };
    if (!data.session) {
      return {
        message:
          "Account request received. Check your email to confirm your address before signing in.",
      };
    }
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Could not connect to Supabase.",
      error: true,
    };
  }

  redirect("/dashboard");
}

export async function requestPasswordResetAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { message: validationMessage(parsed.error), error: true };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: authCallbackUrl("/auth/update-password"),
    });
    if (error) return { message: error.message, error: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Could not connect to Supabase.",
      error: true,
    };
  }

  return {
    message: "If an account uses that email, a password reset link will arrive shortly.",
  };
}

export async function updatePasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  const parsed = z
    .object({
      password: z.string().min(10, "Use at least 10 characters.").max(128),
      confirmation: z.string(),
    })
    .refine((value) => value.password === value.confirmation, {
      path: ["confirmation"],
      message: "Passwords do not match.",
    })
    .safeParse({ password, confirmation });
  if (!parsed.success) return { message: validationMessage(parsed.error), error: true };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) return { message: `Could not verify the session: ${authError.message}`, error: true };
    if (!user) return { message: "Open a valid password-reset link to continue.", error: true };

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { message: error.message, error: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Could not connect to Supabase.",
      error: true,
    };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Sign out failed: ${error.message}`);
  redirect("/");
}

const studyGoalSchema = z.object({
  subjectId: z.enum(["machine-learning", "mathematics", "biology"]),
  examName: z.string().trim().max(120),
  examDate: z.string().date(),
  dailyMinutes: z.number().int().min(10).max(1440),
  sessionDuration: z.number().int().min(10).max(180),
  selectedTopicIds: z.array(z.string().min(1).max(120)).max(100),
});

export async function saveStudyGoalAction(input: unknown) {
  const parsed = studyGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: validationMessage(parsed.error) };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) return { error: `Could not verify the session: ${authError.message}` };
    if (!user) return { error: "Sign in to save your study goal." };

    const { error } = await supabase.rpc("save_study_goal", {
      p_subject_id: parsed.data.subjectId,
      p_exam_name: parsed.data.examName || null,
      p_exam_date: parsed.data.examDate,
      p_daily_minutes: parsed.data.dailyMinutes,
      p_session_duration: parsed.data.sessionDuration,
      p_topic_ids: parsed.data.selectedTopicIds,
    });
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/workspace/dashboard");
    revalidatePath("/onboarding");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save the study goal.",
    };
  }
}
