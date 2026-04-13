---
name: Auto-CRM Local Setup
description: CRM local Next.js para Esmeraldas SOLER, integrado con n8n workflows
type: project
---

## Ubicacion
- **Path:** C:\Users\Usuario\.claude\skills\auto-crm
- **DB:** data/crm.db (SQLite)
- **URL local:** http://localhost:3000
- **URL publica:** https://buttons-bios-ferry-parliamentary.trycloudflare.com (tunnel temporal, cambia al reiniciar)
- **Estado:** PERSONALIZADO para Esmeraldas SOLER con datos reales

## Stack
Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, SQLite + Drizzle ORM

## Pipeline SOLER (9 etapas)
1. Lead [Orgánico/Web] (verde)
2. Lead [META] (azul)
3. Lead [TikTok] (rosa)
4. Contactado (indigo)
5. Calificado (amarillo)
6. Propuesta Enviada (violeta)
7. Seguimiento/Negociación (rojo)
8. Cerrado (verde - isWon)
9. Perdido (gris - isLost)

## Datos Actuales (20+ contactos, 20 deals, actividades)
- Pipeline 9 etapas: Lead Orgánico, Lead META, Lead TikTok, Contactado, Calificado, Propuesta Enviada, Seguimiento/Negociación, Cerrado, Perdido
- Deals activos en negociación: Andrea Mora ₡75k, Jesús Flores ₡85k, Gabriela V. ₡45k
- Deals cerrados: Ana Lucía ₡95k, Vilma ₡32k, Mariela ₡18k
- Fuentes: meta_ads, instagram_dm, whatsapp, messenger, referido, organico, catalogo_whatsapp, tiktok, google

## Lead Sources configurados
whatsapp, instagram_dm, facebook_messenger, meta_ads, referido, organico, catalogo_whatsapp, google, otro

## API Endpoints (usados por n8n)
- POST /api/contacts - Crear contacto
- PUT /api/contacts/[id] - Actualizar contacto
- POST /api/deals - Crear deal
- POST /api/activities - Crear actividad (llamada/email/nota/follow-up)
- POST /api/webhook - Recibir leads externos
- POST /api/classify - Clasificar lead (IA o reglas)
- GET /api/followups - Follow-ups pendientes
- GET /api/export - Exportar CSV
- GET /api/pipeline - Pipeline completo

## Integracion con n8n (10 workflows)
- WF1 (Cerebro): Actualizar CRM node crea contactos y actividades por cada mensaje
- WF2 (Ads Sync): Sync al CRM node registra metricas como actividades
- WF3 (Intelligence): Fetch CRM Data node lee estadisticas para reporte
- WF4 (Pipeline): Procesar Pipeline node crea deals y follow-ups automaticos
- WF5 (Optimizer): Log en CRM node registra optimizaciones como notas
- WF6 (Creator): Registra propuestas de campanas como notas
- Agent 7 (KB Updater): Analiza patrones → actualiza KB Zolutium
- Agent 8 (Inventory): Sincroniza inventario catálogo
- Agent 9 (CRM Sync): Sync bidireccional Zolutium ↔ CRM cada 3h
- Agent 10 (Executive Report): Reporte ejecutivo diario con datos CRM + Zolutium

## Config (crm-config.json)
- Negocio: Esmeraldas SOLER, joyeria, Costa Rica, CRC
- Ticket promedio: 35,000 - 250,000 CRC
- Meta Ads: act_1868510380157902, Pixel 1644701100171663
- Owner phone: +50687985656
- Umbrales: cost/msg excelente <50, bueno <150, aceptable <300

## Pendiente
- Tunnel actual es TEMPORAL (cambia al reiniciar cloudflared)
- Para produccion necesita tunnel nombrado o dominio fijo

**Creado:** 2026-04-10
**Actualizado:** 2026-04-13 (pipeline 9 etapas, 20+ contactos, tunnel actualizado, integración con 10 workflows n8n)
