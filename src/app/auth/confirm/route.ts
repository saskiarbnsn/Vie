import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Destino de los enlaces que llegan por email (confirmar cuenta, recuperar
 * contraseña). Canjea el token por una sesión y sigue a `next`.
 *
 * Soporta los dos formatos de enlace de Supabase:
 *   * token_hash + type → plantillas de email con {{ .TokenHash }}
 *   * code             → plantillas por defecto ({{ .ConfirmationURL }}, PKCE)
 */
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const tokenHash = parametros.get("token_hash");
  const tipo = parametros.get("type") as EmailOtpType | null;
  const codigo = parametros.get("code");

  // Solo rutas internas: un `next` externo sería un open redirect.
  const pedido = parametros.get("next") ?? "/";
  const next = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";

  const supabase = await crearClienteServidor();

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/login?aviso=enlace", request.url));
}
