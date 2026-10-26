import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { STORAGE_BUCKET } from "@/lib/documents/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const documentIdSchema = z.string().uuid();

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!documentIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid document identifier." }, { status: 400 });
  }
  if (!getSupabasePublicConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    return NextResponse.json({ error: "Could not verify your account session." }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "Sign in before deleting a document." }, { status: 401 });
  }
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Document deletion requires the server-only SUPABASE_SERVICE_ROLE_KEY. Configure it before deleting." },
      { status: 503 },
    );
  }

  const { data: document, error: lookupError } = await supabase
    .from("documents")
    .select("id,storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: "The document could not be checked for deletion." }, { status: 503 });
  }
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([document.storage_path]);
  if (storageError) {
    return NextResponse.json(
      { error: "The private file could not be deleted. Your document record was left unchanged." },
      { status: 503 },
    );
  }

  const { data: deleted, error: deleteError } = await admin.rpc(
    "delete_document_record",
    { p_user_id: user.id, p_document_id: id },
  );
  if (deleteError || !deleted) {
    return NextResponse.json(
      { error: "The file was removed from private storage, but its record could not be cleaned up. Retry deletion." },
      { status: 503 },
    );
  }

  return NextResponse.json({ deleted: true });
}
