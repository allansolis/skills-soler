# 🎯 Playbook Semana 1 — Glass Soler Post-Pago Factura

**Pre-requisito:** Pagar factura Meta Ads + recargar saldo + verificar `account_status=1`

**Objetivo semana 1:** De `0 mensajes/día` a `15-25 mensajes/día consistentes`

---

## 📅 DÍA 0 (HOY) — Desbloqueo

### ⏰ 9:00 AM — Pago factura
- [ ] Meta Ads Manager → Glass Soler → Facturación
- [ ] Pagar factura pendiente (MasterCard *0969)
- [ ] Recargar **+$60 USD** (rinde 12 días al ritmo de scaling)

### ⏰ 9:30 AM — Verificar reactivación
```powershell
cd "C:\Users\Usuario\Desktop\Bot glass soler"
python -c "import truststore; truststore.inject_into_ssl(); import json, urllib.request; from dotenv import load_dotenv; load_dotenv(); import os; t=os.getenv('META_ADS_TOKEN'); print(json.loads(urllib.request.urlopen(f'https://graph.facebook.com/v25.0/act_1101364862188478?fields=account_status,balance&access_token={t}').read()))"
```
**Esperado:** `account_status: 1` (ACTIVE) + balance positivo.

### ⏰ 10:00 AM — Ejecutar auto-fix
```powershell
python auto-fix-glass.py --crear-campañas
```

**Output esperado:**
- ✅ Robo Viral → multi-canal Messenger+IG+WA
- ✅ Robo Viral → budget $5/día
- ✅ Campaña "Antes/Después" creada en PAUSED
- ✅ Campaña "Familia Protegida" creada en PAUSED
- ✅ Campaña "DPA Catálogo" creada en PAUSED

### ⏰ 11:00 AM — NO TOCAR NADA
Meta tarda **30-60 minutos** en procesar reactivación + cambios. Revisa en Ads Manager:
- Robo Viral: status verde, "Active"
- Las 3 nuevas: gris, "Paused"

### ⏰ 6:00 PM — Verificación tarde
```powershell
curl -s "http://localhost:3000/api/ads/live?business=glass" | python -c "import json, sys; d=json.load(sys.stdin); s=d.get('summary',{}); print(f'Today: spend=\${s.get(\"spend7d\",0)/7:.2f} | msgs={s.get(\"messages7d\",0)//7}')"
```

**Esperado:** Glass Soler ya gastó $0.50-1.00 en el día (Meta entregando otra vez).

---

## 📅 DÍA 1 (MARTES) — Activar DPA

### ⏰ 9:00 AM — Revisar Robo Viral 24h
- Ad Manager → Glass Soler → última 24h
- Verificar: ≥30 impresiones, CTR >5%, ≥1 mensaje

### ⏰ 10:00 AM — Activar **Catálogo Dinámico DPA** ⭐
- Click en campaña "Glass Soler — Catálogo Dinámico (DPA) 2026-05"
- Verificar:
  - Product set: "Glass — Todos los paquetes" (4 productos)
  - Budget: $4/día
  - Multi-canal habilitado
- **CLICK ACTIVAR**

### ⏰ Tarde — Empezar contenido IG
**Mientras DPA aprende, tú:**
- Toma fotos del taller (5-10 fotos rápidas con el celular)
- Graba un Reel "Proceso de instalación" (timelapse 30 seg)
- **OPCIONAL:** Contratar diseñador con `BRIEF-DISENADOR.md` esta semana

---

## 📅 DÍA 2 (MIÉRCOLES) — Primer post IG

### ⏰ 8:00 AM — Publicar Reel #1
- Usar caption del `IG-CONTENT-PLAN-30D.md` post 1 ("El martillazo")
- Si no tienes video del martillazo, usar Reel "Proceso instalación" del día 1
- Hashtags: 15 del plan editorial

### ⏰ 12:00 PM — Stories del día
- Behind the scenes del taller
- "¿Cuál polarizado es para tu carro?" (poll)

### ⏰ 6:00 PM — Métricas DPA 24h
- Esperado: 50-150 impresiones iniciales
- **Si 0 impresiones:** revisar status PAUSED por error, reactivar

---

## 📅 DÍA 3 (JUEVES) — Activar "Antes/Después"

### ⏰ 9:00 AM — Activar campaña 2
- "Glass Soler — Antes/Después Pain Point 2026-05"
- Verificar copy en placeholder (cambiar al real cuando diseñador entregue)
- **CLICK ACTIVAR**

### ⏰ 6:00 PM — Snapshot 3 días
```powershell
python -c "import truststore; truststore.inject_into_ssl(); import json, urllib.request; from dotenv import load_dotenv; load_dotenv(); import os; t=os.getenv('META_ADS_TOKEN'); url=f'https://graph.facebook.com/v25.0/act_1101364862188478/insights?fields=spend,impressions,actions&date_preset=last_3d&access_token={t}'; r=json.loads(urllib.request.urlopen(url).read()); d=r.get('data',[]); i=d[0] if d else {}; sp=float(i.get('spend',0)); m=sum(int(a['value']) for a in i.get('actions',[]) if 'messag' in a.get('action_type','').lower()); print(f'3d: spend=\${sp:.2f} msgs={m} cost/msg=\${sp/max(m,1):.2f}')"
```

**Métrica clave día 3:** Mensajes acumulados >5. Si <3, revisar:
- ¿Hay actividad del bot Elena respondiendo? (dashboard CRM)
- ¿WhatsApp/Messenger reciben los DMs? (revisar manualmente)

---

## 📅 DÍA 4 (VIERNES) — Activar "Familia Protegida"

### ⏰ 9:00 AM — Activar campaña 3
- "Glass Soler — Familia Protegida 2026-05"
- Sumar al mix activo

### ⏰ 12:00 PM — Reel #2
- Publicar segundo Reel del plan editorial
- "Antes/Después" o "Demo resistencia UV"

### ⏰ Tarde — Revisar primer ganador
**4 días con 4 ads activos:**
- Robo Viral original
- DPA Catálogo
- Antes/Después
- Familia Protegida

Identifica cuál tiene **menor cost/msg** y prepara escalado.

---

## 📅 DÍA 5 (SÁBADO) — Primer ajuste de budget

### ⏰ 10:00 AM — Análisis de ganadores 5d
| Campaña | Spend 5d | Msgs 5d | Cost/msg |
|---------|----------|---------|----------|
| Robo Viral | $25 | ? | ? |
| DPA Catálogo | $20 | ? | ? |
| Antes/Después | $9 | ? | ? |
| Familia Protegida | $3 | ? | ? |

**Regla de oro:**
- Cost/msg < $0.50: **subir budget +30%**
- Cost/msg $0.50-$1.50: **mantener**
- Cost/msg > $1.50: **pausar y analizar**

### ⏰ 6:00 PM — Ajustes
Subir budget de las 1-2 ganadoras. Pausar perdedoras.

---

## 📅 DÍA 6 (DOMINGO) — Carrusel + reflexión

### ⏰ 11:00 AM — Publicar Carrusel
- "Los 4 niveles de protección" (post 2 del plan editorial)
- 6 slides
- Caption con CTA fuerte

### ⏰ 8:00 PM — Resumen primera semana
**Métricas a tener:**
- Mensajes totales: meta **30-50** semana 1
- Cost/msg promedio: meta **<$0.80**
- Followers IG: meta **+10-20** orgánico (sin ads boost a IG aún)
- Conversaciones convertidas a cita: meta **3-5**

---

## 📅 DÍA 7 (LUNES) — Decisión semana 2

### Opciones según resultados:

#### 🟢 Si cost/msg <$0.50 y >40 msgs/semana
**Escalar agresivo:**
- Subir budget total Glass de $15/día (semana 1) a $25/día (semana 2)
- Activar variante adicional Robo Viral (Variante A o B del documento)
- Considerar boostear el primer Reel publicado (post #1)

#### 🟡 Si cost/msg $0.50-$1.20 y 25-40 msgs/semana
**Optimizar:**
- Mantener budget
- Identificar audiencia ganadora dentro del mix
- Probar 1 ad nuevo con la variante de mejor pain point

#### 🔴 Si cost/msg >$1.20 o <20 msgs/semana
**Diagnosticar:**
- ¿Bot Elena responde rápido? (verificar logs `bot_glass.log`)
- ¿Las conversaciones se convierten? (revisar transcripts)
- ¿Hay un canal subutilizado (Messenger vs WA)?
- Pausar la peor performer y reasignar budget a la mejor

---

## 📊 MÉTRICAS A MONITOREAR DIARIO

### Dashboard CRM `/ads`
- Spend hoy/ayer
- Mensajes hoy/ayer
- Cost/msg
- Active campaigns

### Página Facebook
- Likes nuevos (de campaña Aumento Seguidores)
- Reach orgánico

### IG insights (cuando empiece a haber posts)
- Impresiones
- Followers nuevos
- Saves (mejor que likes para algoritmo)

### Bot Elena `/stats`
- Total conversaciones
- Por canal
- Promedio respuesta

---

## 🚨 ALERTAS — Cuándo pausar TODO

- **Cost/msg >$3.00 sostenido 48h** → algo está mal con audiencia o creativo
- **Frequency >3.0** → audiencia agotada, rotar creatives
- **Balance <$5** → recargar inmediato
- **Bot Elena no responde** → puede estar tronando, revisar `bot_glass.log`
- **Webhook Meta no llega al bot** → revisar tunnel Cloudflare, regenerar URL si es quick tunnel

---

## 🎯 OBJETIVO FIN DE SEMANA 1

| Métrica | Meta |
|---------|------|
| Mensajes totales | **30-50** |
| Cost/msg promedio | **<$0.80** |
| Active campaigns ganadoras | **2-3** |
| Posts IG publicados | **2-3** |
| IG followers | **40-60** (de 24 inicial) |
| Conversaciones → citas agendadas | **3-5** |
| Citas → ventas | **1-2** |

**ROI esperado fin semana 1:**
- Inversión: $30-40 spend Meta + tiempo
- Conversiones: 1-2 ventas Premium o Full = **₡500k-1M revenue**
- ROAS: **15-30x** (recuperación inmediata + ROI escalable semana 2)

---

## 🔄 Sistema de revisión

**Cada lunes 9 AM:**
- Ejecutar análisis 7d en CRM dashboard
- Comparar con la semana anterior
- Decidir: escalar, mantener u optimizar
- Actualizar este playbook con aprendizajes

---

**📁 Archivos referencia:**
- `auto-fix-glass.py` — Activar todo post-pago
- `connect-catalog.py` — Conectar catálogo manual
- `IG-CONTENT-PLAN-30D.md` — Plan editorial 4 semanas
- `ADS-COPY-DPA.md` — Copy de los 4 ads del DPA
- `HOOKS-VARIANTES-ROBO-VIRAL.md` — 5 hooks alternativos
- `BRIEF-DISENADOR.md` — Para contratar freelance
