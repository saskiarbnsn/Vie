import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Corre antes de cada página:
 *  1. Refresca la sesión de Supabase (renueva el token si está por vencer).
 *  2. Si no hay sesión, solo deja pasar las rutas de cuenta (login, registro,
 *     recuperación y el canje de enlaces de email). Todo lo demás pide sesión.
 *  3. Con sesión, las pantallas de login/registro/recuperar mandan a "Hoy".
 */

// Accesibles sin sesión.
const RUTAS_PUBLICAS = ["/login", "/registro", "/recuperar", "/auth/confirm"];

// Con sesión no tiene sentido verlas (actualizar-contrasena sí: usa la sesión
// del enlace de recuperación, o la normal si quiere cambiarla estando adentro).
const RUTAS_SOLO_SIN_SESION = ["/login", "/registro", "/recuperar"];

const coincide = (pathname: string, rutas: string[]) =>
  rutas.some((r) => pathname === r || pathname.startsWith(r + "/"));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida el token contra Supabase; no confiar solo en la cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !coincide(pathname, RUTAS_PUBLICAS)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && coincide(pathname, RUTAS_SOLO_SIN_SESION)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  // Todo menos archivos estáticos e imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
