/**
 * Orchestrador: handle inbound message → Elena response → send via Meta → log in DB.
 *
 * Se llama desde el webhook DESPUES de insertar el mensaje inbound en la DB.
 * Corre en background (no bloquea el response del webhook a Meta).
 */
import crypto from "crypto";
import { db } from "@/db";
import { conversations, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { BusinessId } from "@/lib/businessConfig";
import { generateResponse } from "./respond";
import { sendResponse, type Platform } from "./send";
import { notifyHotLead } from "./notify-asesor";

export interface HandleMessageInput {
  business: BusinessId;
  contactId: string;
  platform: Platform;
  recipientExternalId: string; // el externalId del USER (no de la page)
  userMessage: string;
}

export interface HandleMessageResult {
  responded: boolean;
  hotLead: boolean;
  shouldEscalate: boolean;
  text?: string;
  error?: string;
}

export async function handleInboundMessage(
  input: HandleMessageInput
): Promise<HandleMessageResult> {
  // 1) Skip si el contacto esta marcado como "no-bot" (escalado)
  const contact = await db
    .select({ id: contacts.id, name: contacts.name, temperature: contacts.temperature })
    .from(contacts)
    .where(eq(contacts.id, input.contactId))
    .get();

  if (!contact) {
    return { responded: false, hotLead: false, shouldEscalate: false, error: "contact not found" };
  }

  // 2) Generar respuesta con Anthropic
  const elena = await generateResponse({
    business: input.business,
    contactId: input.contactId,
    userMessage: input.userMessage,
    contactName: contact.name,
  });

  // 3) Si Elena dice escalar, NO responder automaticamente — solo loggear y subir temperatura
  if (elena.shouldEscalate || elena.hotLead) {
    await db.update(contacts)
      .set({
        temperature: elena.hotLead ? "hot" : "warm",
        score: elena.hotLead ? 80 : 50,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, input.contactId))
      .run();

    // Notificar WhatsApp al asesor humano (fire-and-forget)
    if (elena.hotLead) {
      notifyHotLead({
        business: input.business,
        contactName: contact.name,
        contactExternalId: input.recipientExternalId,
        platform: input.platform,
        userMessage: input.userMessage,
        detectedReason: elena.reason,
      }).catch((err) => console.error("[elena] notify asesor error:", err));
    }
  }

  // 4) Enviar respuesta via Meta
  const send = await sendResponse({
    business: input.business,
    platform: input.platform,
    recipientId: input.recipientExternalId,
    text: elena.text,
  });

  if (!send.success) {
    console.error(`[elena] send failed: ${send.error}`);
    // Igual loggear el intento de respuesta para auditoria (con status=failed)
    await db.insert(conversations)
      .values({
        id: crypto.randomUUID(),
        contactId: input.contactId,
        platform: input.platform,
        externalId: `elena_failed_${Date.now()}`,
        direction: "outbound",
        message: elena.text,
        messageType: "text",
        status: "failed",
        senderName: "Elena (bot)",
        business: input.business,
        createdAt: new Date(),
      })
      .run();
    return {
      responded: false,
      hotLead: elena.hotLead,
      shouldEscalate: elena.shouldEscalate,
      text: elena.text,
      error: send.error,
    };
  }

  // 5) Loggear respuesta exitosa
  await db.insert(conversations)
    .values({
      id: crypto.randomUUID(),
      contactId: input.contactId,
      platform: input.platform,
      externalId: send.externalId || `elena_${Date.now()}`,
      direction: "outbound",
      message: elena.text,
      messageType: "text",
      status: "sent",
      senderName: "Elena (bot)",
      business: input.business,
      createdAt: new Date(),
    })
    .run();

  return {
    responded: true,
    hotLead: elena.hotLead,
    shouldEscalate: elena.shouldEscalate,
    text: elena.text,
  };
}
