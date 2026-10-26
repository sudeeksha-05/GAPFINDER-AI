import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { processOwnedDocument } from "@/lib/documents/processing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const documentIdSchema = z.string().uuid();

export async function POST(
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
    return NextResponse.json({ error: "Sign in before processing a document." }, { status: 401 });
  }
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Document processing requires the server-only SUPABASE_SERVICE_ROLE_KEY. Configure it before processing." },
      { status: 503 },
    );
  }

  try {
    const result = await processOwnedDocument(supabase, admin, user.id, id);
    const status = result.status === "processing" ? 202 : 200;
    return NextResponse.json(result, { status, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document processing failed.";
    const notFound = /not found/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: notFound ? 404 : 422, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
