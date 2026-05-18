"""
Deploy Pending Campaigns — Dispara las 6 campañas pre-empaquetadas en Meta Ads.

Requisitos:
- META_ADS_TOKEN en .env con scope ads_management
- Cuenta Glass status=ACTIVE (factura pagada)
- Saldo suficiente en cada ad account

Uso:
    python scripts/deploy-pending-campaigns.py              # dry-run (solo valida, no deploya)
    python scripts/deploy-pending-campaigns.py --deploy     # ejecuta deploy real
    python scripts/deploy-pending-campaigns.py --only glass_robo_viral_v2

Lee:  meta-config/campaign-pack.json
"""
import sys
import os
import json
import urllib.parse
import urllib.request
import urllib.error
import argparse
from pathlib import Path

# Norton AV TLS bypass
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

# Forzar UTF-8 stdout
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = Path(__file__).parent.parent

# Cargar .env (multi-path)
ENV_CANDIDATES = [
    ROOT / ".env",
    Path("C:/Users/Usuario/Desktop/Bot glass soler/.env"),
]
ENV = next((p for p in ENV_CANDIDATES if p.exists()), None)
if ENV is None:
    print("[X] No encontre .env")
    sys.exit(1)

ENV_VARS = {}
for line in ENV.read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        ENV_VARS[k.strip()] = v.strip()

TOKEN = ENV_VARS.get("META_ADS_TOKEN", "")
API = ENV_VARS.get("META_API_VERSION", "v25.0")

if not TOKEN or TOKEN.startswith("EAA..."):
    print("[X] META_ADS_TOKEN no configurado")
    sys.exit(1)


def api_get(path: str, params: dict = None) -> dict:
    params = params or {}
    params["access_token"] = TOKEN
    url = f"https://graph.facebook.com/{API}/{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_error": json.loads(e.read()).get("error", {}).get("message", "?")}


def api_post(path: str, fields: dict) -> dict:
    fields = {**fields, "access_token": TOKEN}
    data = urllib.parse.urlencode(fields).encode()
    url = f"https://graph.facebook.com/{API}/{path}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=20) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_error": json.loads(e.read()).get("error", {}).get("message", "?")}


def precheck() -> tuple[bool, list]:
    """Validate token scopes + accounts status. Returns (ok, errors)."""
    errors = []

    # Token debug
    d = api_get("debug_token", {"input_token": TOKEN})
    if "_error" in d:
        return False, [f"Token invalid: {d['_error']}"]

    scopes = d.get("data", {}).get("scopes", [])
    needed = ["ads_management", "ads_read"]
    missing = [s for s in needed if s not in scopes]
    if missing:
        errors.append(f"Token missing scopes: {missing}")

    # Account status
    for acct in ["act_1101364862188478", "act_2385776465260628"]:
        info = api_get(acct, {"fields": "account_status,balance,currency,name"})
        if "_error" in info:
            errors.append(f"{acct}: {info['_error']}")
            continue
        st = info.get("account_status")
        if st != 1:
            errors.append(f"{acct} status={st} (1=ACTIVE)")
        print(f"  {acct}: {info.get('name')} status={st} balance={info.get('balance')} {info.get('currency')}")

    return len(errors) == 0, errors


def create_campaign(c: dict) -> dict:
    """Crea una campaña dado el spec del campaign-pack."""
    body = {
        "name": f"[{c['negocio'].upper()}] {c['id']}",
        "objective": c["objetivo"],
        "status": "PAUSED",
        "special_ad_categories": "[]",
    }
    return api_post(f"{c['ad_account']}/campaigns", body)


def create_adset(c: dict, campaign_id: str) -> dict:
    """Crea adset linkado a la campaign. Maneja audience + destination + budget."""
    aud = c["audience"]
    targeting = {
        "geo_locations": aud["geo_locations"],
        "age_min": aud["age_min"],
        "age_max": aud["age_max"],
        "genders": aud.get("genders", [0]),
        "publisher_platforms": aud.get("publisher_platforms", ["facebook", "instagram"]),
        "targeting_automation": {"advantage_audience": aud.get("advantage_audience", 1)},
    }
    # Intereses si vienen como codes
    if aud.get("interests_codes"):
        targeting["interests"] = [
            {"id": code, "name": aud["interests_labels"][i] if i < len(aud.get("interests_labels", [])) else ""}
            for i, code in enumerate(aud["interests_codes"])
        ]

    body = {
        "name": f"adset-{c['id']}",
        "campaign_id": campaign_id,
        "daily_budget": c["daily_budget_cents"],
        "billing_event": c["billing_event"],
        "optimization_goal": c["optimization_goal"],
        "destination_type": "MESSENGER",
        "promoted_object": json.dumps({"page_id": c["page_id"]}),
        "targeting": json.dumps(targeting),
        "status": "PAUSED",
    }

    # Catalog DPA: agregar product_set y vertical
    if c.get("catalog_id") and c.get("product_set_id"):
        body["promoted_object"] = json.dumps({
            "page_id": c["page_id"],
            "product_set_id": c["product_set_id"],
        })

    return api_post(f"{c['ad_account']}/adsets", body)


def create_ad_creative(c: dict) -> dict:
    """Crea ad creative con copy + page."""
    copy = c["copy"]
    obj_story_spec = {
        "page_id": c["page_id"],
        "link_data": {
            "message": copy["primary_text"],
            "name": copy.get("headline", ""),
            "description": copy.get("description", ""),
            "link": f"https://m.me/{c['page_id']}",
            "call_to_action": {"type": copy.get("cta", "MESSAGE_PAGE")},
        },
    }
    body = {
        "name": f"creative-{c['id']}",
        "object_story_spec": json.dumps(obj_story_spec),
    }
    return api_post(f"{c['ad_account']}/adcreatives", body)


def create_ad(c: dict, adset_id: str, creative_id: str) -> dict:
    """Crea el ad final linkando adset + creative."""
    body = {
        "name": f"ad-{c['id']}",
        "adset_id": adset_id,
        "creative": json.dumps({"creative_id": creative_id}),
        "status": "PAUSED",
    }
    return api_post(f"{c['ad_account']}/ads", body)


def deploy_full_pipeline(c: dict) -> dict:
    """Crea campaign + adset + creative + ad. Retorna dict con IDs o errores."""
    result = {"id": c["id"], "steps": []}

    # 1. Campaign
    r = create_campaign(c)
    if "_error" in r:
        result["error"] = f"campaign: {r['_error']}"
        return result
    campaign_id = r.get("id")
    result["campaign_id"] = campaign_id
    result["steps"].append(f"campaign={campaign_id}")

    # 2. Adset
    r = create_adset(c, campaign_id)
    if "_error" in r:
        result["error"] = f"adset: {r['_error']}"
        return result
    adset_id = r.get("id")
    result["adset_id"] = adset_id
    result["steps"].append(f"adset={adset_id}")

    # 3. Ad Creative
    r = create_ad_creative(c)
    if "_error" in r:
        result["error"] = f"creative: {r['_error']}"
        return result
    creative_id = r.get("id")
    result["creative_id"] = creative_id
    result["steps"].append(f"creative={creative_id}")

    # 4. Ad
    r = create_ad(c, adset_id, creative_id)
    if "_error" in r:
        result["error"] = f"ad: {r['_error']}"
        return result
    result["ad_id"] = r.get("id")
    result["steps"].append(f"ad={r.get('id')}")
    result["status"] = "PAUSED (review en Ads Manager antes de activar)"

    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--deploy", action="store_true", help="Ejecutar deploy real")
    ap.add_argument("--only", help="Solo desplegar esta campaña (id)")
    args = ap.parse_args()

    pack = json.loads((ROOT / "meta-config" / "campaign-pack.json").read_text(encoding="utf-8"))

    print(f"\n[i] Campaign Pack v{pack['version']} — {len(pack['campanas'])} campanas")
    print(f"[i] Presupuesto diario total: {pack['totales']['presupuesto_diario_total_label']}\n")

    # Precheck
    print("== PRECHECK ==")
    ok, errs = precheck()
    if not ok:
        print("\n[X] Precheck FALLO:")
        for e in errs:
            print(f"  - {e}")
        if not args.deploy:
            print("\n(dry-run, igual continuo mostrando plan)")
        else:
            print("\n[!] Detenido. Corrige los errores y reintenta.")
            sys.exit(1)
    else:
        print("[OK] Precheck pasado\n")

    # Filtrar
    campanas = pack["campanas"]
    if args.only:
        campanas = [c for c in campanas if c["id"] == args.only]
        if not campanas:
            print(f"[X] No existe campana con id={args.only}")
            sys.exit(1)

    # Deploy
    print(f"== {'DEPLOY' if args.deploy else 'DRY-RUN'} ==\n")
    for c in campanas:
        print(f"\n[{c['id']}] {c['negocio']} — {c['daily_budget_label']}")
        print(f"  Tipo: {c.get('tipo','?')}")
        print(f"  Objetivo: {c['objetivo']} / {c['optimization_goal']}")
        print(f"  Destination: {', '.join(c['destination'])}")
        print(f"  Audience: {c['audience']['age_min']}-{c['audience']['age_max']} CR")
        print(f"  Copy primary: {c['copy']['primary_text'][:80]}...")

        if args.deploy:
            if c.get("tipo") == "REACTIVAR":
                # Resume existing
                r = api_post(c["campaign_existente"], {"status": "ACTIVE"})
                if "_error" in r:
                    print(f"  [X] Resume error: {r['_error']}")
                else:
                    print(f"  [OK] Reactivada campaign {c['campaign_existente']}")
            else:
                # Full pipeline: campaign + adset + creative + ad
                result = deploy_full_pipeline(c)
                if result.get("error"):
                    print(f"  [X] {result['error']}")
                    print(f"      Steps completados: {result['steps']}")
                else:
                    print(f"  [OK] Pipeline completo:")
                    print(f"      campaign_id  = {result['campaign_id']}")
                    print(f"      adset_id     = {result['adset_id']}")
                    print(f"      creative_id  = {result['creative_id']}")
                    print(f"      ad_id        = {result['ad_id']}")
                    print(f"      {result['status']}")
        else:
            print(f"  (dry-run, no se crea)")

    print("\n[FIN]")
    if not args.deploy:
        print("\nPara deploy real:  python scripts/deploy-pending-campaigns.py --deploy")
    else:
        print("\nIMPORTANTE: las campanas se crearon en status=PAUSED.")
        print("Revisalas en Ads Manager y activa cuando confirmes creative + audience.")


if __name__ == "__main__":
    main()
