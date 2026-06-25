import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!supabaseUrl || !supabaseKey) {
    return jsonError("Faltan variables de entorno de Supabase en el servidor.", 500);
  }

  const { id: entryId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!entryId) return jsonError("Falta el ID del registro.");
  if (!body) return jsonError("Payload inválido.");

  const projectId = String(body.project_id ?? "");
  const amount = Number(body.amount);

  if (!projectId) return jsonError("Selecciona un proyecto válido.");
  if (!amount || amount <= 0) return jsonError("Introduce una cantidad válida.");

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) return jsonError(projectError.message, 500);
  if (!project) return jsonError("El proyecto seleccionado no existe.", 404);

  const { error: updateError } = await supabase
    .from("entries")
    .update({
      project_id: project.id,
      project: project.name,
      amount,
    })
    .eq("id", entryId);

  if (updateError) return jsonError(updateError.message, 500);

  const { data: updatedEntry, error: readError } = await supabase
    .from("entries")
    .select("id,project,project_id,amount")
    .eq("id", entryId)
    .maybeSingle();

  if (readError) return jsonError(readError.message, 500);
  if (!updatedEntry) return jsonError("No se ha encontrado el registro actualizado.", 404);

  if (updatedEntry.project_id !== project.id) {
    return jsonError("Supabase no ha aplicado el cambio. Revisa la política UPDATE/RLS de entries o añade SUPABASE_SERVICE_ROLE_KEY en Vercel.", 500);
  }

  return NextResponse.json({ ok: true, entry: updatedEntry });
}
