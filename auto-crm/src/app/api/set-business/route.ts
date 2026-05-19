/**
 * Endpoint server para setear cookie `business`.
 *
 * Por que existe: el cliente puede escribir `document.cookie` directo,
 * pero hay race condition con `router.refresh()`: si el server lee la cookie
 * antes de que el browser la haya propagado, ve el valor viejo.
 * Setear via API garantiza que la cookie esta en el response del request,
 * disponible para el siguiente RSC fetch.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidBusinessId } from "@/lib/businessConfig";

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (!isValidBusinessId(body?.business)) {
    return NextResponse.json(
      { error: `business invalido: ${body?.business}` },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("business", body.business, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false, // Permitir lectura desde JS para evitar mismatch con context client
  });

  return NextResponse.json({ ok: true, business: body.business });
}
