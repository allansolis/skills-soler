/**
 * Test playground para Elena. NO envia via Meta, solo genera respuesta.
 * POST { business, message } -> { text, hotLead, shouldEscalate }
 */
import { NextRequest, NextResponse } from "next/server";
import { isValidBusinessId } from "@/lib/businessConfig";
import { generateResponse } from "@/lib/elena/respond";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { business, message } = body;

  if (!business || !isValidBusinessId(business)) {
    return NextResponse.json({ error: "invalid business" }, { status: 400 });
  }
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // Usar un contactId virtual para el test (no inserta nada real)
  const fakeContactId = `test_${crypto.randomBytes(6).toString("hex")}`;

  const elena = await generateResponse({
    business,
    contactId: fakeContactId,
    userMessage: message,
  });

  return NextResponse.json(elena);
}
