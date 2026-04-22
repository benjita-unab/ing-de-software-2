import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/supabase";
import { jsonResponse, optionsResponse } from "@/lib/http";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return jsonResponse({ error: "email y password son obligatorios" }, 400);
    }

    const { data, error } = await getSupabaseAuthClient().auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session || !data.user) {
      return jsonResponse({ error: error?.message ?? "Credenciales inválidas" }, 401);
    }

    const { data: perfil, error: perfilError } = await getSupabaseAdmin()
      .from("usuarios")
      .select("id, email, nombre, rol, activo")
      .eq("id", data.user.id)
      .single();

    if (perfilError || !perfil) {
      return jsonResponse(
        {
          error:
            "Usuario autenticado en Auth pero sin perfil en tabla usuarios. Crea el registro en usuarios con el mismo id de auth.users."
        },
        403
      );
    }

    return jsonResponse({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: data.session.token_type,
      user: {
        id: data.user.id,
        email: data.user.email
      },
      perfil
    });
  } catch (error) {
    console.error("Error en /api/auth/login:", error);
    return jsonResponse(
      {
        error: "Error de configuración backend (variables Supabase faltantes)"
      },
      500
    );
  }
}
