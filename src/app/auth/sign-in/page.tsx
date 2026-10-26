import { AuthForm } from "@/app/auth/auth-form";
import { signInAction } from "@/app/auth/actions";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export default function SignInPage() {
  const isConfigured = Boolean(getSupabasePublicConfig());

  return (
    <AuthForm
      action={signInAction}
      description="Sign in to access your private study goals and account workspace."
      disabledReason={
        isConfigured
          ? undefined
          : "Supabase is not configured. Copy .env.example to .env.local, add your project URL and publishable key, then restart the development server."
      }
      fields={[
        { name: "email", label: "Email address", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
      ]}
      links={[
        { label: "Create an account", href: "/auth/sign-up" },
        { label: "Forgot password?", href: "/auth/forgot-password" },
      ]}
      submitLabel="Sign in"
      title="Welcome back"
    />
  );
}
