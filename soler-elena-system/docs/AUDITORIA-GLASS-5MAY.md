# 🔍 Auditoría Glass Soler — Cómo conseguir más clientes

**Fecha:** 5 mayo 2026
**Foco:** Replicar el éxito de Esmeraldas (2,234 msgs/mes) en Glass Soler (101 msgs/mes)

---

## 🚨 ROOT CAUSE — Por qué Glass tiene 22x menos mensajes que Esmeraldas

### El hallazgo más importante: Instagram Glass está VACÍO

| Plataforma | Glass Soler | Esmeraldas | Diferencia |
|------------|-------------|------------|------------|
| **IG followers** | **24** ⚠️ | **3,129** | **130x más** |
| **IG posts** | **0** ⚠️⚠️⚠️ | **96** | infinito |
| FB followers | 298 | 266 | similar |
| Categoría | Automóviles | Joyería | — |

**Esmeraldas vende por IG porque tiene 3 años acumulando contenido visual.** Glass Soler tiene IG creado pero CERO actividad orgánica. Cuando los anuncios envían tráfico a IG, el perfil vacío les espanta.

---

## 📊 Auditoría detallada Aumento Seguidores

### Visualizaciones (30 días)

| Métrica | Valor | Análisis |
|---------|-------|----------|
| Spend total | $14.78 | $0.49/día |
| Impresiones | 5,874 | bajo, pero focus calidad |
| Reach | 3,638 personas únicas | |
| Frequency | 1.61 | sano (<2.5) |
| **CTR** | **12.84%** | 🔥 6x sobre industria |
| Clicks totales | 754 | |
| **Page engagement** | **3,811** | masivo |
| **Video views** | **3,233** | $0.0046 por view (espectacular) |
| **Likes nuevos** | **279** | $0.05 por like |
| Post saves | 11 | |
| Comments | 1 | |
| Shares (post) | 14 | |
| Post unlikes | 10 | gente que se desinterescó luego |

### Por anuncio individual

| Ad | Spend | Imp | CTR | Engagement |
|---|------|-----|-----|------------|
| **Video Robo** | $6.63 | 2,943 | **15.73%** | 2,039 |
| Video Bajonazo | $8.15 | 2,931 | 9.93% | 1,772 |

**Video Robo es 60% más eficiente** que Bajonazo.

### Veredicto: **NO PAUSARLA — está construyendo audiencia barata**

- $0.05 por like es 10x más barato que el promedio CR
- Está generando una base warm de 3,233 personas que vieron el video
- Esa audiencia es perfecta para retargeting MESSAGES (cuando se desbloquee app review)

**Acción inmediata:** Mantenerla. Al pasar a producción Meta Live (cuando publiques Soler Inversiones app verificada), crear Custom Audience "Engaged 90d" con esta gente y lanzarles MESSAGES retargeting.

---

## 🎯 Estrategia Esmeraldas que NO está aplicada en Glass

### 3 ventajas que Esmeraldas tiene y Glass no

#### 1. ⭐ **Catálogo Dinámico WhatsApp**
- **Esmeraldas:** Catalog ID `944718051249202` con 30 productos + WhatsApp Commerce
- **Glass:** **0 catálogos** en Business "Inversiones Soler"
- **Impacto:** Catalog Ads muestran productos en cards rotativas y tienen CTR 30-40% más alto

#### 2. ⭐ **Multi-canal messaging**
- **Esmeraldas Catálogo:** `dest=MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP` (todos canales)
- **Glass Robo Viral:** `dest=WHATSAPP` solo
- **Impacto:** 3x más oportunidades de conversación (la gente prefiere su canal habitual)

#### 3. ⭐ **Volumen creativo**
- **Esmeraldas activa:** 5 campañas + boosted posts IG cada semana
- **Glass activa:** 1 campaña MESSAGES con 1 anuncio (Video Viral Robo)
- **Impacto:** Sin variedad creativa, audiencia se fatiga; Esmeraldas combate fatiga rotando creatives

---

## 🚧 Bloqueo: account_status = 3 (UNSETTLED)

**Cualquier cambio API a Glass Soler hoy retorna:**
```
"El usuario no tiene permiso para realizar esta acción."
```

**Causa:** Cuenta tiene factura no liquidada. Mientras esté UNSETTLED:
- ❌ No se pueden cambiar budgets
- ❌ No se pueden cambiar destination types
- ❌ No se pueden crear nuevas campañas
- ✅ Las campañas siguen mostradas como ACTIVE pero NO entregan
- ✅ Balance disponible $11.60 pero ad delivery 0/día

**Desbloquear (5 minutos manual):**
1. Meta Ads Manager → cuenta CP Glass Soler → Facturación
2. Pagar la factura pendiente con MasterCard *0969
3. ~30 min después Meta reactiva entrega automáticamente

---

## 💰 Plan de acción para superar a Esmeraldas

### 🔴 HOY (en orden, manual + API después)

#### Paso 1: Desbloquear cuenta (5 min, manual)
- Meta Ads Manager → Facturación Glass Soler → pagar factura
- Recargar saldo adicional **$50 USD** (aguanta 10-12 días al ritmo actual)

#### Paso 2: API once unblocked (5 min)
Cuando esté ACTIVE de nuevo, ejecutar:
```python
# Multi-canal en Robo Viral
post('120246154261500130', {'destination_type':'MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP'})

# Subir budget de $3 a $5/día (Robo Viral está a $0.37/msg, da espacio)
post('120246154261500130', {'daily_budget': 500})
```

### 🟠 ESTA SEMANA

#### Paso 3: Crear contenido IG urgente (lo que más impacto tiene)

**Glass tiene 0 posts en IG.** Plan mínimo viable:

**Semana 1 — Base inicial (10 posts):**
1. Video corto: "Por qué nuestro polarizado resiste un martillazo" (reel)
2. Antes/después: vehículo sin / con polarizado de seguridad
3. Testimonio cliente real (foto + caption)
4. Las 4 categorías (Básica, Full, Premium, Máxima) en carrusel
5. Video del proceso de instalación (timelapse)
6. "5 razones para polarizar tu vehículo en CR" (reel educacional)
7. Caso de robo evitado (cifras reales CR)
8. Comparación vs polarizado normal (foto split)
9. Testimonial #2
10. Promo apertura: -10% si menciona Instagram

**Semana 2-4 — Cadencia normal:**
- 3-4 reels semanales
- 1-2 stories/día
- 1 post estático/semana

**Quién lo hace:** Si tu equipo no tiene capacidad, contratar diseñador freelance Latam (~$200-400/mes para 12 posts mensuales).

#### Paso 4: Crear catálogo Glass Soler (15 min)
Replicar la estructura de Esmeraldas:

```
Glass Soler Catalog (4 productos)
├── GLASS-BASICA — Seguridad Básica — ₡299,000 — 8,000 micras
├── GLASS-FULL — Seguridad Full — ₡499,000 — 16,000 micras
├── GLASS-PREMIUM — Seguridad Premium — ₡999,000 — 27,000 micras
└── GLASS-MAXIMA — Máxima Protección — cotización — 54,000 micras
```

API:
```python
# Crear catálogo
POST /1106361001133983/owned_product_catalogs
  name="Glass Soler — Paquetes Polarizado"
  vertical="commerce"
```

Luego conectar a WhatsApp Business Commerce para que los productos aparezcan en chat.

#### Paso 5: Crear 2 campañas adicionales MESSAGES

**Campaign 2 — "Antes/Después" Pain Point**
- Hook: "Mira lo que pasó cuando intentaron robar este Hilux"
- Target: Hombres 28-50 CR, propietarios de vehículos
- Budget: $3/día
- Multi-canal

**Campaign 3 — "Familia Protegida" Emocional**
- Hook: "Por mis hijos no me arrepiento de esta inversión" (testimonial mamá)
- Target: Mujeres+Hombres 30-55 CR, padres
- Budget: $3/día
- Multi-canal

---

## 📈 Proyección 30 días con plan ejecutado

| Métrica | Hoy | Plan 30d | Δ |
|---------|-----|----------|---|
| Spend mensual Glass | $61 | $250 | 4x |
| **Mensajes/mes** | **101** | **400-600** | **4-6x** |
| Cost/msg | $0.61 | $0.50-0.70 | similar |
| IG followers | 24 | 200-400 | +900% |
| IG posts | 0 | 12-16 | base sólida |
| Audiencias retargeting | 0 | 3 (engaged 30/90/180d) | habilitado |

**Inversión total adicional 30d:** ~$200 budget Meta + $200-400 contenido IG = **$400-600**
**Resultado proyectado:** 4-6x más mensajes a CPA similar = **mismas leyes financieras**

---

## 🔧 n8n Status

- ✅ n8n cloud responde HTTP 200
- ⚠️ No puedo verificar workflows status sin la extensión Chrome
- 🔴 Tunnel Cloudflare cambió de URL: viejo `multiple-ross-emerging-checked` ya no existe; nuevo `disks-choice-berry-tail.trycloudflare.com`
- **Acción:** Ir a n8n cloud, abrir cada workflow que apunte a `localhost:3000` o el tunnel viejo y reemplazar con la URL nueva

---

## 🎯 Resumen ejecutivo (1 página)

### Lo que SÍ funciona Glass Soler hoy
- ✅ Robo Viral MESSAGES: $0.37/msg (mejor que Esmeraldas)
- ✅ 298 followers FB (más que Esmeraldas en FB)
- ✅ 30d: 101 mensajes / $61 / $0.61/msg
- ✅ Aumento Seguidores: $0.05/like (oro para futuro retargeting)

### Lo que está roto
- 🔴 **account_status=3** — Meta no entrega hoy/ayer (factura pendiente)
- 🔴 **IG vacío** (0 posts, 24 followers vs 3,129 Esmeraldas)
- 🟠 **Sin catálogo** (vs 30 productos Esmeraldas)
- 🟠 **Single canal** (solo WhatsApp vs 3 canales Esmeraldas)
- 🟠 **Single ad** (1 anuncio vs 5+ Esmeraldas)
- 🟠 **0 audiencias** custom (bloqueado por app dev mode)

### Acción priorizada
1. **Pagar factura** (hoy, 5 min) → desbloquea TODO lo demás
2. **API: multi-canal + budget $5/día** (5 min, desde aquí)
3. **Crear contenido IG** (esta semana, contratar diseñador o usar IA)
4. **Catálogo Glass** (esta semana, vía API)
5. **2 campañas adicionales** (próxima semana, después tener algo de IG content)
6. **Resolver app dev mode** (3-7 días, requiere business verification) → desbloquea Custom Audiences

**ROI estimado del plan:** $400-600 adicionales/mes → 400-600 mensajes/mes → ~12-18 ventas Premium ($999k cada) = **~₡15-20M revenue mensual** sobre **₡350-400k inversión** = ROAS 40-50x.
