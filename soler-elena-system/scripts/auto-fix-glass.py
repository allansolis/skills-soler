"""
Auto-fix Glass Soler — Ejecutar EN CUANTO se pague la factura Meta.

Aplica todos los fixes pendientes que requieren account_status=ACTIVE:
1. Multi-canal en Robo Viral (Messenger+IG+WA)
2. Subir budget Robo Viral $3 → $5/día
3. Pausar "Aumento Seguidores" (PAGE_LIKES sin conversión) — OPCIONAL, usuario decide
4. Crear 2 campañas adicionales: "Antes/Después" y "Familia Protegida"

Uso:
    python auto-fix-glass.py [--pausar-seguidores] [--crear-campañas]

Sin args ejecuta solo los fixes seguros (multi-canal + scaling Robo Viral).
"""
import truststore
truststore.inject_into_ssl()

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

# Load .env — buscar en multiples paths
ENV_CANDIDATES = [
    Path(__file__).parent.parent / ".env",
    Path("C:/Users/Usuario/Desktop/Bot glass soler/.env"),
    Path(__file__).parent / ".env",
]
ENV_PATH = next((p for p in ENV_CANDIDATES if p.exists()), None)
if ENV_PATH is None:
    print("[X] No se encontro .env en ninguna ubicacion conocida")
    sys.exit(1)

TOKEN = ""
with open(ENV_PATH, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("META_ADS_TOKEN="):
            TOKEN = line.split("=", 1)[1].strip()
            break

if not TOKEN:
    print("[X] META_ADS_TOKEN no encontrado en .env")
    sys.exit(1)

print(f"[OK] Usando .env: {ENV_PATH}")

API = "v25.0"
GLASS_ACT = "act_1101364862188478"
GLASS_PAGE = "860529027138846"
ROBO_VIRAL_CAMP = "120246154256950130"
ROBO_VIRAL_ADSET = "120246154261500130"
WINNING_CREATIVE = "1463945295210570"  # Video Viral Robo
AUMENTO_SEG_CAMP = "120245957532150130"


def post(path: str, fields: dict) -> dict:
    url = f"https://graph.facebook.com/{API}/{path}"
    fields = {**fields, "access_token": TOKEN}
    data = urllib.parse.urlencode(fields).encode()
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(url, data=data, method="POST"), timeout=30
        )
        return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = json.loads(e.read()).get("error", {})
        return {"ERROR": err.get("error_user_msg") or err.get("message", "?")[:200]}


def get(path: str) -> dict:
    sep = "&" if "?" in path else "?"
    url = f"https://graph.facebook.com/{API}/{path}{sep}access_token={TOKEN}"
    try:
        return json.loads(urllib.request.urlopen(url, timeout=20).read())
    except urllib.error.HTTPError as e:
        return {"ERROR": json.loads(e.read())}


def check_account_active() -> bool:
    r = get(f"{GLASS_ACT}?fields=account_status,balance,disable_reason")
    status = r.get("account_status")
    print(f"Account status: {status} (1=ACTIVE, 2=DISABLED, 3=UNSETTLED)")
    print(f"Balance: {int(r.get('balance', 0))/100} USD")
    if status != 1:
        print("⚠️ Cuenta NO está ACTIVE. Pagar factura Meta primero.")
        return False
    return True


def fix_robo_viral():
    """Cambiar a multi-canal + escalar budget."""
    print("\n=== Fix 1: Robo Viral multi-canal + budget $3 → $5 ===")
    r1 = post(
        ROBO_VIRAL_ADSET,
        {"destination_type": "MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP"},
    )
    print(f"  Multi-canal: {r1}")
    r2 = post(ROBO_VIRAL_ADSET, {"daily_budget": 500})
    print(f"  Budget $5/día (500 cents): {r2}")


def pause_aumento_seguidores():
    """Opcional: pausar campaña PAGE_LIKES (no convierte a mensajes)."""
    print("\n=== Fix 2: Pausar Aumento Seguidores (opcional) ===")
    r = post(AUMENTO_SEG_CAMP, {"status": "PAUSED"})
    print(f"  Pausar: {r}")


def crear_campana_antes_despues():
    """Nueva campaña MESSAGES con creativo Antes/Después."""
    print("\n=== Crear Campaña 'Antes/Después' ===")
    # Campaign
    c = post(
        f"{GLASS_ACT}/campaigns",
        {
            "name": "Glass Soler — Antes/Después Pain Point 2026-05",
            "objective": "OUTCOME_ENGAGEMENT",
            "status": "PAUSED",
            "special_ad_categories": json.dumps([]),
            "buying_type": "AUCTION",
            "is_adset_budget_sharing_enabled": "false",
        },
    )
    if "id" not in c:
        print(f"❌ Campaign error: {c}")
        return
    cid = c["id"]
    print(f"  Campaign: {cid}")

    # AdSet
    targeting = {
        "geo_locations": {"countries": ["CR"]},
        "age_min": 28,
        "age_max": 50,
        "genders": [1],  # Hombres (propietarios vehículos)
        "publisher_platforms": ["facebook", "instagram"],
        "facebook_positions": ["feed", "story", "marketplace"],
        "instagram_positions": ["stream", "story", "explore", "reels"],
        "device_platforms": ["mobile", "desktop"],
    }
    a = post(
        f"{GLASS_ACT}/adsets",
        {
            "name": "Hombres CR 28-50 Vehículos Premium",
            "campaign_id": cid,
            "daily_budget": 300,  # $3/día
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "CONVERSATIONS",
            "destination_type": "MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP",
            "promoted_object": json.dumps({"page_id": GLASS_PAGE}),
            "targeting": json.dumps(targeting),
            "status": "PAUSED",
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
        },
    )
    print(f"  AdSet: {a}")

    if "id" in a:
        # Ad with winning creative (reciclar Robo Viral por ahora)
        ad = post(
            f"{GLASS_ACT}/ads",
            {
                "name": "Antes/Después - Pain Point Robo",
                "adset_id": a["id"],
                "creative": json.dumps({"creative_id": WINNING_CREATIVE}),
                "status": "PAUSED",
            },
        )
        print(f"  Ad: {ad}")


def crear_campana_catalog_dpa():
    """Crear campaña Catalog Sales (DPA) — replica directa de Esmeraldas."""
    print("\n=== Crear Campaña 'Catálogo Dinámico Glass' (DPA) ===")

    CATALOG = "1670886954032475"
    PRODUCT_SET_ALL = "1303614245207196"  # Todos los paquetes

    # Campaign
    c = post(
        f"{GLASS_ACT}/campaigns",
        {
            "name": "Glass Soler — Catálogo Dinámico (DPA) 2026-05",
            "objective": "OUTCOME_ENGAGEMENT",
            "status": "PAUSED",
            "special_ad_categories": json.dumps([]),
            "buying_type": "AUCTION",
            "is_adset_budget_sharing_enabled": "false",
        },
    )
    if "id" not in c:
        print(f"❌ Campaign error: {c}")
        return
    cid = c["id"]
    print(f"  Campaign: {cid}")

    targeting = {
        "geo_locations": {"countries": ["CR"]},
        "age_min": 25,
        "age_max": 60,
        "genders": [1, 2],
        "publisher_platforms": ["facebook", "instagram"],
        "facebook_positions": ["feed", "story", "marketplace"],
        "instagram_positions": ["stream", "story", "explore", "reels"],
        "device_platforms": ["mobile", "desktop"],
    }

    # Promoted object debe tener product_set_id + page_id
    promoted_obj = {
        "page_id": GLASS_PAGE,
        "product_set_id": PRODUCT_SET_ALL,
    }

    a = post(
        f"{GLASS_ACT}/adsets",
        {
            "name": "CR 25-60 Catálogo Multi-canal Advantage+",
            "campaign_id": cid,
            "daily_budget": 400,  # $4/día
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "CONVERSATIONS",
            "destination_type": "MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP",
            "promoted_object": json.dumps(promoted_obj),
            "targeting": json.dumps(targeting),
            "status": "PAUSED",
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
        },
    )
    print(f"  AdSet: {a}")
    print(f"  📌 Productos en este DPA: 4 (Básica/Full/Premium/Máxima)")
    print(f"  💡 Cuando lo actives, Meta rota automáticamente los 4 paquetes")
    print(f"     según el algoritmo y muestra al usuario el más relevante.")


def crear_campana_familia():
    """Nueva campaña MESSAGES con ángulo emocional 'Familia Protegida'."""
    print("\n=== Crear Campaña 'Familia Protegida' ===")
    c = post(
        f"{GLASS_ACT}/campaigns",
        {
            "name": "Glass Soler — Familia Protegida 2026-05",
            "objective": "OUTCOME_ENGAGEMENT",
            "status": "PAUSED",
            "special_ad_categories": json.dumps([]),
            "buying_type": "AUCTION",
            "is_adset_budget_sharing_enabled": "false",
        },
    )
    if "id" not in c:
        print(f"❌ Campaign error: {c}")
        return
    cid = c["id"]
    print(f"  Campaign: {cid}")

    targeting = {
        "geo_locations": {"countries": ["CR"]},
        "age_min": 30,
        "age_max": 55,
        "genders": [1, 2],
        "publisher_platforms": ["facebook", "instagram"],
        "facebook_positions": ["feed", "story", "marketplace"],
        "instagram_positions": ["stream", "story", "explore", "reels"],
        "device_platforms": ["mobile", "desktop"],
        # Targeting interest: padres con vehículos
        "interests": [
            {"id": "6003020834693", "name": "Family"},
            {"id": "6003277229371", "name": "Cars"},
        ],
    }
    a = post(
        f"{GLASS_ACT}/adsets",
        {
            "name": "Padres CR 30-55 Familia + Vehículos",
            "campaign_id": cid,
            "daily_budget": 300,
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "CONVERSATIONS",
            "destination_type": "MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP",
            "promoted_object": json.dumps({"page_id": GLASS_PAGE}),
            "targeting": json.dumps(targeting),
            "status": "PAUSED",
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
        },
    )
    print(f"  AdSet: {a}")

    if "id" in a:
        ad = post(
            f"{GLASS_ACT}/ads",
            {
                "name": "Familia Protegida - Emocional",
                "adset_id": a["id"],
                "creative": json.dumps({"creative_id": WINNING_CREATIVE}),
                "status": "PAUSED",
            },
        )
        print(f"  Ad: {ad}")


def main():
    print("=" * 60)
    print("AUTO-FIX GLASS SOLER — Post pago factura Meta")
    print("=" * 60)

    if not check_account_active():
        print("\n🔴 ABORTAR: Pagar factura primero en Meta Ads Manager.")
        sys.exit(1)

    # Fixes seguros (siempre)
    fix_robo_viral()

    # Opcionales
    args = sys.argv[1:]
    if "--pausar-seguidores" in args:
        pause_aumento_seguidores()
    if "--crear-campañas" in args or "--crear-campanas" in args:
        crear_campana_antes_despues()
        crear_campana_familia()
        crear_campana_catalog_dpa()
        print("\n📌 3 campañas nuevas creadas en PAUSED. Activar manualmente desde Ads Manager")
        print("   después de revisar copy + targeting.")
        print("   La DPA Catálogo es la que MÁS impacto tiene (replica Esmeraldas).")

    print("\n✅ Auto-fix completado. Verifica en Ads Manager.")


if __name__ == "__main__":
    main()
