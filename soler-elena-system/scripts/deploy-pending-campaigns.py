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
                # Create new
                r = create_campaign(c)
                if "_error" in r:
                    print(f"  [X] Create error: {r['_error']}")
                else:
                    print(f"  [OK] Created campaign {r.get('id')} (status PAUSED — review before launch)")
                    print(f"      Next: crear adset + ad manualmente o via API extra")
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
