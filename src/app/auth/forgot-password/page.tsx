import { AuthForm } from "@/app/auth/auth-form";
import { requestPasswordResetAction } from "@/app/auth/actions";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  return (
    <AuthForm
      action={requestPasswordResetAction}
      description="We will send a password-reset link if an account matches the address."
      disabledReason={
        getSupabasePublicConfig()
          ? undefined
          : "Supabase is not configured. Copy .env.example to .env.local and add your project settings."
      }
      fields={[{ name: "email", label: "Email address", type: "email", autoComplete: "email" }]}
      links={[{ label: "Back to sign in", href: "/auth/sign-in" }]}
      submitLabel="Send reset link"
      title="Reset your password"
    />
  );
}
