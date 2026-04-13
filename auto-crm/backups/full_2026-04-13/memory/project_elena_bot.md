---
name: Proyecto Bot Elena - Esmeraldas SOLER
description: Bot de ventas IA para joyería de esmeraldas naturales, agente llamada Elena, Python + Claude API + Flask webhook
type: project
---

Bot de ventas IA "Elena" para la marca "Esmeraldas SOLER".

**Why:** Automatizar ventas de joyería de esmeraldas naturales vía WhatsApp con IA.

**How to apply:** El proyecto vive en `C:\Users\Usuario\Desktop\Bot glass soler\`. Archivo principal: `bot.py`.

Detalles clave:
- Agente se llama Elena, habla solo español, trata de "usted"
- Marca: Esmeraldas SOLER — joyería virtual, esmeraldas 100% naturales certificadas
- SINPE: 87530064 (Jazmín Solís Alvarado), PayPal: paypal.me/asolisa
- Precios: aretes/cadenas desde ₡30.000, anillos desde ₡50.000
- WhatsApp cierre: https://wa.me/p/26418820444470989/50687985656
- Stack: Python, Flask, Anthropic SDK (claude-opus-4-6 con adaptive thinking)
- Webhook en `/webhook` (POST), prueba directa en `/chat` (POST)
- Historial por usuario en memoria, límite 30 mensajes

## Elena en Zolutium (GoHighLevel)
- Configurada como agente en Zolutium con 3 secciones: Personalidad, Objetivo, Info adicional
- Info adicional tiene 4 bloques: REGLAS ABSOLUTAS, CATÁLOGO Y SELECCIÓN, REGLA 70/30, POST-VENTA
- Catálogo: https://wa.me/c/50687985656
- Regla clave: no cerrar antes del 5to mensaje
- Elena precalifica → Jazmín (humana) confirma precios y cierra

## Entrenamiento (2026-04-13)
- Simulación completa de 7 pasos: APROBADO
- Flujo testeado: saludo→catálogo→perfilado→reserva→pago→comprobante→envío
- 7/7 respuestas correctas (thumbs up)
- Backup config: ~/.claude/skills/auto-crm/backups/elena/
