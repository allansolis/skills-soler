---
name: Ecosistema n8n Marketing - Esmeraldas SOLER
description: 10 workflows activos en n8n Cloud, 2 credenciales, tunnel Cloudflare al CRM local
type: project
---

## n8n Cloud
- URL: https://allannsolis94.app.n8n.cloud
- MCP Server: configurado en Claude Desktop

## Workflows (10 total, ~70 nodos)

### 1. Cerebro Marketing IA (PRINCIPAL)
- **ID:** LuQgnovmDXEUufDv
- **Nodos (12):** Webhook Meta, Parsear Mensaje, Elena IA (Agent), Claude Sonnet, Memoria Conversacion, Catalogo Tool, Preparar Respuesta, Actualizar CRM, Router Canal, Enviar WhatsApp, Enviar Instagram, Enviar Messenger
- **Funcion:** Recibe mensajes de WhatsApp/IG/Messenger via webhook Meta, Elena IA responde como vendedora, consulta catalogo Meta Commerce (944718051249202), envia fotos de productos, detecta intencion de compra, sincroniza con CRM
- **Webhook:** POST /esmeraldas-soler

### 2. Meta Ads Performance Sync
- **ID:** c6OZ7rYM7HqXUtgX
- **Nodos (7):** Cada 6 Horas, Fetch Meta Data, Calcular KPIs, Sync al CRM, Alerta?, Enviar Alerta WA, Todo Normal
- **Funcion:** Cada 6h sincroniza metricas de campanas (spend, CTR, cost/msg, health score), alerta por WhatsApp si KPIs fuera de umbral

### 3. Marketing Intelligence Report
- **ID:** dCAPKArJlFaIXMNr
- **Nodos (6):** Diario 8AM, Fetch Metricas, Fetch CRM Data, Generar Reporte, Enviar x WhatsApp, Log en CRM
- **Funcion:** Reporte diario a las 8AM con metricas dia/semana/mes, mejor campana, stats CRM, recomendaciones automaticas

### 4. Lead Pipeline Automator
- **ID:** cPx5acMifh7wARHl
- **Nodos (7):** Webhook Lead, Enriquecer Lead, AI Lead Scorer (Agent), Claude Sonnet, Procesar Pipeline, IF Lead Caliente, Alerta Owner WhatsApp
- **Funcion:** Recibe leads via webhook, enriquece con keywords de compra/urgencia/budget, AI scoring 1-100, clasifica temperatura (caliente/tibio/frio), crea deals y follow-ups en CRM, alerta al owner para leads calientes (score >= 70)
- **Webhook:** POST /lead-pipeline

### 5. Campaign Optimizer AI
- **ID:** 9SmWWSItZ09bsBT0
- **Nodos (7):** Cada 12 Horas, Fetch Campanas Meta, AI Campaign Analyst (Agent), Claude Sonnet, Meta Ads Tool, Generar Reporte, Enviar Reporte WhatsApp
- **Funcion:** Cada 12h analiza rendimiento de campanas, AI genera diagnostico con optimizaciones (pausar, escalar budget, cambiar creative), Meta Ads Tool puede ejecutar acciones (pausar campana, cambiar budget), envia reporte por WhatsApp

### 7. Agent 7 - KB Updater Inteligente
- **ID:** RWfjSn9Wb72NGZrW
- **Nodos (7):** GET Conversaciones Recientes, GET Contactos Activos, Claude Analiza Patrones, Guardar Analisis en Zolutium + más
- **Funcion:** Analiza conversaciones recientes y patrones de contactos para actualizar la base de conocimiento en Zolutium
- **Credenciales:** Anthropic + Zolutium API

### 8. Agent 8 - Inventory Manager Catalogo
- **ID:** WHkOUlw3bFqHlv1a
- **Funcion:** Gestiona inventario del catálogo, sincroniza entre CRM local y Zolutium
- **Credenciales:** Zolutium API

### 9. Agent 9 - CRM Sync Bidireccional
- **ID:** FMqTp80qW1WJeqhO
- **Nodos (7):** Cada 3 horas, GET Contactos Zolutium, GET Conversaciones Zolutium, GET Oportunidades Pipeline, Merge & Enrich Data, Sync to CRM Local, Resumen Sync
- **Funcion:** Cada 3h sincroniza contactos/conversaciones/oportunidades entre Zolutium (leadconnectorhq.com) y CRM local
- **Credenciales:** Zolutium API (httpHeaderAuth)
- **NOTA:** Cambiado de 15min a 3h el 2026-04-13 para ahorrar ejecuciones del trial

### 10. Agent 10 - Executive Report Diario
- **ID:** qLLT0ckP5Q6nPSTa
- **Nodos (~7):** GET Total Contactos, GET Total Conversaciones, más
- **Funcion:** Genera reporte ejecutivo diario con datos de Zolutium y CRM local
- **Credenciales:** Zolutium API + Anthropic

## Credenciales Configuradas
1. **Anthropic account** (anthropicApi) - ID: BVVbfOoAfOmqoQfm
2. **Zolutium API (Soler)** (httpHeaderAuth) - ID: ZmDt7KNuTUndyGjC

## Trial n8n Cloud (al 2026-04-13)
- 9 dias restantes (expira ~2026-04-22)
- 298/1000 ejecuciones usadas
- Failure rate 99.3% era por CRM offline + tunnel caido (ARREGLADO 2026-04-13)
- Consumo estimado actual: ~24 ejecuciones/dia → ~216 en 9 dias → OK dentro del limite

## Frecuencias actualizadas (2026-04-13)
- Cerebro Marketing IA: Webhook (on demand)
- Lead Pipeline Automator: Webhook (on demand)
- Meta Ads Performance Sync: Cada 6h
- Marketing Intelligence Report: Diario 8AM (cron 3 8 * * *)
- Campaign Optimizer AI: Cada 12h
- Campaign Creator & Strategist AI: Cada 48h
- Agent 7 - KB Updater: Cada 6h
- Agent 8 - Inventory Manager: Cada 4h
- Agent 9 - CRM Sync: Cada 3h (bajado de 15min)
- Agent 10 - Executive Report: Diario 8AM (cron 0 8 * * *)

## Dependencias para activar
1. **ANTHROPIC_API_KEY** - Necesaria como credencial "Header Auth" en n8n para los nodos Claude Sonnet
2. **Tunnel (ngrok/cloudflare)** - Para que n8n Cloud llegue al CRM local (localhost:3000)
3. **Meta Webhook** - Registrar URL del webhook de n8n en Meta Developer para recibir mensajes en vivo

## Umbrales de rendimiento configurados
- Cost/msg EXCELENTE: < 50 CRC
- Cost/msg BUENO: 50-150 CRC
- Cost/msg ACEPTABLE: 150-300 CRC
- Cost/msg MALO: > 300 CRC (considerar pausar)
- CTR bueno: > 2%
- Frequency max: 3.0
- Lead CALIENTE: score >= 70
- Lead TIBIO: score 40-69
- Lead FRIO: score < 40

### 6. Campaign Creator & Strategist AI
- **ID:** vSVixd1d6tCOyD4u
- **Nodos (9):** Cada 48 Horas, Fetch Datos Meta, AI Creative Strategist (Agent), Claude Sonnet, Web Research Tool, Meta Campaign Tool, Catalogo Tool, Formatear Propuesta, Enviar Propuesta WhatsApp
- **Funcion:** Cada 48h investiga tendencias mundiales (Firecrawl), analiza rendimiento actual, consulta catalogo, crea propuestas de campanas UNICAS inspiradas en Tiffany/Pandora/Mejuri/Cartier. Puede crear campanas en Meta (PAUSADAS) y envia propuesta al owner para aprobacion. AI con temperature 0.8 para maxima creatividad.
- **Tools:** web_research (Firecrawl API), meta_campaign_create (Meta API), catalogo_query (Commerce API)

## Tunnel Cloudflare
- URL: https://buttons-bios-ferry-parliamentary.trycloudflare.com
- Mapea a: http://localhost:3000 (Auto-CRM)
- Tipo: Quick tunnel (temporal, cambia al reiniciar)
- Los 10 workflows usan esta URL para CRM calls
- **IMPORTANTE:** Al reiniciar tunnel, actualizar URL en los 10 workflows via API:
  - `/rest/workflows/{id}` PATCH con find-replace en JSON de nodes
  - 6 WFs originales tenian URL de tunnel, 4 Agents nuevos tenian localhost:3000

## Alertas WhatsApp al owner
- Todos los workflows envian alertas/reportes al owner: +50687985656
- Via WhatsApp Business API (Phone ID: 777414378791556)

## Skill: ai-marketing-brain
- Path: ~/.claude/skills/ai-marketing-brain/SKILL.md
- Funcion: Skill consultora de marketing para Claude Code, actua como cerebro estrategico que asesora a las IAs de n8n

**Creado:** 2026-04-10
**Actualizado:** 2026-04-13 (4 agents nuevos, tunnel actualizado, localhost→tunnel fix, credenciales verificadas)
