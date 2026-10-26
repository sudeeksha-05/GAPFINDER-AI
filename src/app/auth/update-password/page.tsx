import { AuthForm } from "@/app/auth/auth-form";
import { updatePasswordAction } from "@/app/auth/actions";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export default function UpdatePasswordPage() {
  return (
    <AuthForm
      action={updatePasswordAction}
      description="Choose a new password for your GapFinder AI account."
      disabledReason={
        getSupabasePublicConfig()
          ? undefined
          : "Supabase is not configured. Add your project settings to .env.local first."
      }
      fields={[
        { name: "password", label: "New password (10 characters minimum)", type: "password", autoComplete: "new-password" },
        { name: "confirmation", label: "Confirm new password", type: "password", autoComplete: "new-password" },
      ]}
      submitLabel="Update password"
      title="Choose a new password"
    />
  );
}
