import { AuthForm } from "@/app/auth/auth-form";
import { signUpAction } from "@/app/auth/actions";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export default function SignUpPage() {
  return (
    <AuthForm
      action={signUpAction}
      description="Create an account to save your study goals privately and return to them anytime."
      disabledReason={
        getSupabasePublicConfig()
          ? undefined
          : "Supabase is not configured. Copy .env.example to .env.local, add your project URL and publishable key, then restart the development server."
      }
      fields={[
        { name: "displayName", label: "Name", type: "text", autoComplete: "name" },
        { name: "email", label: "Email address", type: "email", autoComplete: "email" },
        { name: "password", label: "Password (10 characters minimum)", type: "password", autoComplete: "new-password" },
      ]}
      links={[{ label: "Already have an account? Sign in", href: "/auth/sign-in" }]}
      submitLabel="Create account"
      title="Start with a study goal"
    />
  );
}
