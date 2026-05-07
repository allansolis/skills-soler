# ⚡ Quick Wins — 22 abril

Arreglos de <15 minutos con impacto CRÍTICO o ALTO. Ordenados por impacto/esfuerzo.

---

## 🥇 Win 1 · Recargar balance Meta Ads — 2 min — CRITICAL

**Antes:** Esmeraldas ₡8,652 (2 días de runway) · Glass Soler $3.31 (1 día).
**Acción:** Meta Ads Manager → Facturación → Agregar fondos. Sugerido ₡50,000 Esmeraldas + $30 Glass.
**Después:** 15+ días de runway en ambas.

## 🥈 Win 2 · Pausar Glass Soler "Aumento Seguidores" — 1 min — HIGH

Gastó $5.93 → 0 mensajes. PAGE_LIKES no sirve para este negocio.
```bash
curl -X POST "https://graph.facebook.com/v25.0/120245957532150130?status=PAUSED&access_token=$META_ADS_TOKEN"
```
**Resultado:** ~$0.85/día liberados para la campaña nueva MESSAGES.

## 🥉 Win 3 · Crear Pixel Glass Soler — 5 min — CRITICAL

Cuenta sin pixel = cuenta ciega. Una llamada API.
```bash
curl -X POST "https://graph.facebook.com/v25.0/act_1101364862188478/adspixels" \
  -d "name=Glass Soler Pixel" \
  -d "access_token=$META_ADS_TOKEN"
```
Luego en Events Manager activar Advanced Matching (1 click).

## 4 · Vincular @glasssoler como Business IG — 3 min — HIGH

Meta Business Suite → Páginas → Glass Soler → Configuración → Conectar IG.
**Impacto:** Permite que ads salgan en feed orgánico-like de IG con marca.

## 5 · Fix Zolutium credential en n8n Agent 9 — 10 min — CRITICAL

811 ejecuciones fallidas hoy. Ir a:
- https://allannsolis94.app.n8n.cloud/workflow/FMqTp80qW1WJeqhO
- Abrir credencial "Zolutium API (Soler)" (`ZmDt7KNuTUndyGjC`)
- Regenerar token en Zolutium → Private Integrations
- Pegar nuevo en n8n → Save → Test execution

**Resultado:** Sync CRM se reanuda, Reporte Ejecutivo Diario vuelve a generar.

## 6 · Abrir Cloudflare Tunnel para CRM local — 5 min — HIGH

```powershell
cloudflared tunnel --url http://localhost:3000
```
Copiar URL resultante y reemplazar `http://localhost:3000` en nodos de n8n (Agent 7, 8, 9, 10).

## 7 · Archivar 88 campañas pausadas Esmeraldas — 10 min — MEDIUM

Un script Python de ~15 líneas. Reduce ruido en Ads Manager.
```bash
# Ver ACTION-PLAN-22ABR.md sección HIGH-5 para el script
```

## 8 · Test CAPI Esmeraldas pixel — 5 min — CRITICAL

Verifica si el canal sigue conectado:
```bash
curl -X POST "https://graph.facebook.com/v25.0/1644701100171663/events" \
  -d 'data=[{"event_name":"Lead","event_time":'$(date +%s)',"user_data":{"em":"'$(echo -n test@test.com | sha256sum | cut -d\  -f1)'"}}]' \
  -d "access_token=$META_ADS_TOKEN"
```
Si retorna `{"events_received":1}` → canal ok, falta conectar el bot que dispare eventos reales.
Si retorna error → reconectar CAPI desde Events Manager.

---

## 📊 Si haces TODOS los Quick Wins de arriba (45-50 min total):

| Métrica | Antes | Después |
|---------|-------|---------|
| Balance runway Esmeraldas | 2 días | 12+ días |
| Balance runway Glass | 1 día | 10+ días |
| n8n failure rate | 100% | <10% |
| Glass Soler pixel events | 0/día | ~50/día |
| Esmeraldas CAPI | 💀 13d sin fire | ✅ vivo |
| Campañas Glass optimizadas para msgs | 1/3 | 2/3 |
| IG @glasssoler integrado | No | Sí |
| **Health Score** | **58/100** | **~82/100** |

---

**Nota:** El token `META_ADS_TOKEN` dura 1-2 horas. Si algún comando falla con "Session expired" → regenerar en https://developers.facebook.com/tools/explorer/ con app "Soler Inversiones" (14 permisos) y actualizar en `C:\Users\Usuario\Desktop\Bot glass soler\.env` y `C:\Users\Usuario\.claude\skills\auto-crm\.env.local`.
