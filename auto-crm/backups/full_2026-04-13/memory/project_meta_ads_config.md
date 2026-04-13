---
name: Meta Ads Config - Esmeraldas SOLER
description: Configuracion completa de Meta Business, Commerce Manager, Pixel, campanas y acceso API para cuenta Esmeraldas SOLER (Allann Solis)
type: project
---

## Cuenta Meta Ads - Esmeraldas SOLER

**Ad Account Principal:** act_1868510380157902 (cuenta publicitaria principal)
**Ad Account #2:** act_2385776465260628 (Allann Solis - DESACTIVADA por Meta, necesita revision)
**Business ID:** 1145191446124291 (Farmacologia deportiva)
**Business ID #2:** 1106361001133983
**Page ID:** 797310113463115 (Esmeraldas SOLER)
**IG ID:** 17841477346690740 (@esmeraldas_soler, 3203 seguidores)
**Currency:** CRC (Colones costarricenses)
**Timezone:** America/Costa_Rica
**App:** Soler Inversiones (ID: 950123147611259) - EN MODO DESARROLLO

**API Token:** EAANgIci0zHsBRMTUZCCrP9rT6w1aMqH4bC14ZCxC6mcmvygYTooyHtny3KwlxcoZC53TGGLclVliSQqSE4hi7gX54iTCdndPNTZBbZAy3PY7f5OrM5eyEDnv9RxmN1q2jYSlIB5eI6SJckirkwBDyZBOMB7O9XMrZCiRKkeIumExZCNq1QCLyVSOQT2sLGNV

**Pago cuenta principal:** VISA *7003 (SIN FONDOS a 2026-04-09, balance 309 CRC)

## Pixel
- **Pixel ID:** 1644701100171663
- **Nombre:** Esmeraldas SOLER - Pixel Principal
- **Advanced Matching:** Activado (10 campos)
- **First Party Cookie:** Activado
- **Sin sitio web** — venta solo por IG/WhatsApp/Facebook

## Commerce Manager
- **Catalog ID:** 944718051249202 (Esmeraldas SOLER - Joyeria Plata 925)
- **Productos:** 30 con fotos reales del catalogo (actualizado 2026-04-09)
  - 5 Cadenas con dije (₡50,000 - ₡250,000)
  - 2 Sets collar + aretes (₡100,000)
  - 3 Aretes (₡35,000 - ₡50,000)
  - 1 Pulsera tennis (₡125,000)
  - 9 Anillos (₡65,000 - ₡175,000)
  - 10 Piedras sueltas (₡50,000 - ₡250,000)
- **Fotos:** Subidas como ad images con URLs permanentes (facebook.com/ads/image/)
- **Retailer IDs:** SOLER-CAD-xxx, SOLER-SET-xxx, SOLER-ARE-xxx, SOLER-PUL-xxx, SOLER-ANI-xxx, SOLER-PIE-xxx
- **WhatsApp Commerce:** Conectado, carrito habilitado
- **WhatsApp Phone ID:** 777414378791556
- **WhatsApp Number:** +506 8798 5656
- **Catalogos vacios (ignorar):** 925501976963013, 1476317673700711

## Campana Activa (creada 2026-04-08)
- **Campaign ID:** 120246875695680260
- **Ad Set ID:** 120246876082640260
- **Ad ID:** 120246876083540260
- **Nombre:** SOLER - Mensajes WhatsApp - Joyeria Plata 925
- **Budget:** 5,000 CRC/dia
- **Objetivo:** OUTCOME_ENGAGEMENT > CONVERSATIONS
- **Target:** Mujeres 18-65, Costa Rica, Advantage+ con intereses joyeria
- **Destino:** WhatsApp + IG DM + Messenger
- **Creativo:** Cadena Plata 925 (mejor performer, ~25 CRC/msg)

## Campanas que quedaron activas (las buenas)
- "Belleza verde, lujo eterno" — 24.63 CRC/msg (EXCELENTE)
- "Cadena de Plata 925" — 25.73 CRC/msg (EXCELENTE)
- "Estilo Unico y elegante" — 46.24 CRC/msg (BUENA)

## Lo que se hizo (2026-04-08)
- 175 campanas pausadas (4 perdedoras + 5 boosted stories + 166 zombies)
- 9 Special Ad Categories corregidas (quitado FINANCIAL_PRODUCTS_SERVICES)
- Pixel creado y configurado
- Catalogo creado con 5 productos, vinculado a WhatsApp
- Campana nueva creada y activada

## Lo que se hizo (2026-04-09) - Auditoria profesional
- Catalogo actualizado: 30 productos con fotos reales (36 imagenes subidas como ad images)
- Campana catalogo creada: 120246928902800260 (SOLER - Catalogo Dinamico WhatsApp)
  - Ad Set: 120246930830090260 | Ad: 120246930832970260
  - Destination: MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP
  - Creative: 1266996274945308 (existente, Cadena Plata 925)
- CAPI activado: 4 eventos enviados (Lead, ViewContent, AddToCart, Purchase)
- Spend Cap: subido de 500,000 a 2,000,000 CRC
- Campana WhatsApp Plata 925 PAUSADA (0 mensajes en 7 dias)
- Campana Cadena Plata 925 ESCALADA: budget de 1,000 a 3,000/dia
- 13 campanas archivadas (Boosted Stories, VENDIDO, VENDIDA)
- Pagina FB actualizada: about, descripcion, telefono, website
- Auditoria completa ejecutada (10 areas analizadas)

## Rendimiento 30 dias (a 2026-04-09)
- Gasto: 103,331 CRC | Impresiones: 135,523 | Alcance: 77,452
- CTR: 4.76% (excelente) | CPC: 16 CRC | CPM: 762 CRC
- Mensajes: 190 | Costo/mensaje: 544 CRC
- Frecuencia: 1.75

## Campanas activas (rendimiento 7 dias a 2026-04-09)
- "Cadena Plata 925" — 64 msgs, 150 CRC/msg (MEJOR, ESCALADA)
- "Belleza verde, lujo eterno" — 49 msgs, 172 CRC/msg
- "Estilo Unico, mama" — 34 msgs, 262 CRC/msg
- "SOLER Catalogo Dinamico" — 0 (en revision/sin budget remaining)

## Webhook n8n (configurado 2026-04-11)
- **Callback URL:** https://allannsolis94.app.n8n.cloud/webhook/esmeraldas-soler
- **Verify Token:** soler_verify_2024
- **Campo suscrito:** messages v25.0
- **Estado:** Verificado y activo, pero solo recibe webhooks de prueba (app en modo desarrollo)

## n8n Workflows (10 activos - 2026-04-11)
### Originales (6)
- Agent 1: Cerebro Marketing IA (LuQgnovmDXEUufDv) - Elena IA responde WhatsApp/IG/Messenger
- Agent 2: Campaign Creator (vSVixd1d6tCOyD4u) - Crea campanas Meta Ads
- Agent 3: Campaign Optimizer (9SmWWSItZ09bsBT0) - Optimiza campanas activas
- Agent 4: Marketing Intelligence Report (dCAPKArJlFaIXMNr) - Reportes inteligencia
- Agent 5: Lead Pipeline Automator (cPx5acMifh7wARHl) - Automatiza pipeline leads
- Agent 6: Meta Ads Performance Sync (c6OZ7rYM7HqXUtgX) - Sincroniza rendimiento
### Nuevos (4 - creados 2026-04-11)
- Agent 7: KB Updater Inteligente (RWfjSn9Wb72NGZrW) - Analiza conversaciones c/6h, genera FAQs, mejora Elena
- Agent 8: Inventory Manager Catalogo (WHkOUlw3bFqHlv1a) - Monitorea catalogo Meta + demanda c/4h
- Agent 9: CRM Sync Bidireccional (FMqTp80qW1WJeqhO) - Sincroniza Zolutium <-> CRM Local c/15min
- Agent 10: Executive Report Diario (qLLT0ckP5Q6nPSTa) - Reporte ejecutivo diario 8am con Claude AI
### Credenciales
- **Credencial Anthropic:** BVVbfOoAfOmqoQfm ("Anthropic account", claude-sonnet-4-20250514)
- **Credencial Zolutium:** ZmDt7KNuTUndyGjC ("Zolutium API (Soler)", httpHeaderAuth)
### Endpoints CRM Local (para n8n)
- POST /api/sync/zolutium - Agent 9 envia contactos enriquecidos
- POST /api/kb/update - Agent 7 envia insights KB
- POST /api/inventory/sync - Agent 8 envia inventario
- POST /api/reports/executive - Agent 10 envia reportes
- GET /api/reports/retrospective?days=7 - Retrospectiva IA agregada (JSON)
- GET /api/reports/retrospective?days=30&format=csv - Descarga CSV

### CRM Local Pages
- / - Dashboard principal
- /reports - Reportes Ejecutivos + Retrospectiva IA (creada 2026-04-11)
  - Tab "Reportes Diarios": tabla interactiva con detalle, alertas, recomendaciones
  - Tab "Retrospectiva IA": KB insights, inventario, tendencias, recomendaciones acumuladas
  - Descargas: CSV y JSON
- /pipeline, /contacts, /deals, /conversations, /loyalty, /activities, /settings

## Zolutium API (Privada - creada 2026-04-11)
- **API Key:** pit-0ea1a634-e80f-4f37-8949-798f99cb3eb3
- **Secret ID:** pit-3fa9ba99-e18d-4db4-9379-049faf0bbb56
- **Nombre Integracion:** Soler (Privado)
- **Location ID:** CzqwqD6eS1JrCHQxdvy2
- **Base URL:** https://services.leadconnectorhq.com (GoHighLevel API v2)
- **Scopes:** Ver y actualizar datos de la cuenta
- **Uso:** Conectar n8n con Zolutium para sincronizar contactos, conversaciones, pipelines, KB

## Zolutium AI Agents
- **Elena** (Principal) - OpenAI GPT 4.1, piloto automatico, SMS+IG+4 canales
- Asistente de Ventas Online o Ecommerce
- IA Asistente de Agendamientos de Citas
- Allann IA
- Ink Puntual (Apagado)
- **Base de Conocimiento:** "Soler" (creada 7 abril 2026) + 2 bases existentes

## PENDIENTE: Publicar App Meta (requiere landing page)
- La app necesita estar en modo "En vivo" para recibir webhooks reales de clientes
- Requisito previo: tener la LANDING PAGE lista con politica de privacidad y terminos
- Cuando la landing este lista: developers.facebook.com > App > Publicar

## Limitaciones del token/app actual
- App "Soler Inversiones" en MODO DESARROLLO - esto bloquea:
  - Crear Custom Audiences (engagement, saved, website)
  - Crear Ad Creatives nuevos (error 1885183)
  - Crear Saved Audiences (error #3)
  - Crear Offline Event Sets
  - Recibir webhooks reales (solo prueba)
- Las audiencias se DEBEN crear manualmente en Ads Manager > Audiencias
- Para desbloquear: developers.facebook.com > App > Configuracion > Cambiar a modo "En vivo"
- SI puede: crear/pausar campanas, crear ad sets, enviar CAPI events, manejar catalogo, pixel

## Herramientas instaladas
- **Firecrawl MCP:** Instalado con API key fc-7d6ddf95c8e24aa6a64bfa85c0142bb9
- **Playwright MCP:** Instalado en Claude Desktop
- **Node.js:** v24.14.1
- **Python:** 3.12 (3.14 tambien disponible)

**Why:** El usuario maneja marketing digital para Esmeraldas SOLER, joyeria de plata 925 con esmeraldas colombianas en Costa Rica. Ventas por WhatsApp/IG/FB sin sitio web.

**How to apply:** Siempre conectarse via API con el token. Usar Firecrawl/Chrome MCP para tareas que la API no puede hacer. Monitorear campanas activas y pausar si cost/msg sube de 100 CRC.
