"""
Conecta el catálogo Glass Soler a:
1. Page Glass Soler (como tienda visible / external event source)
2. WhatsApp Business (para que aparezca en chat de Elena)

Ejecutar tras regenerar token Meta.

Uso:
    python connect-catalog.py
"""
import truststore
truststore.inject_into_ssl()

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ENV_PATH = Path(__file__).parent / ".env"
TOKEN = ""
with open(ENV_PATH, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("META_ADS_TOKEN="):
            TOKEN = line.split("=", 1)[1].strip()
            break

if not TOKEN:
    print("META_ADS_TOKEN missing in .env")
    sys.exit(1)

API = "v25.0"
CATALOG = "1670886954032475"
PAGE = "860529027138846"  # Glass Soler
WABA = "786597210574223"


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
        return {"ERROR": err.get("error_user_msg") or err.get("message", "?")[:300]}


def get(path: str) -> dict:
    sep = "&" if "?" in path else "?"
    url = f"https://graph.facebook.com/{API}/{path}{sep}access_token={TOKEN}"
    try:
        return json.loads(urllib.request.urlopen(url, timeout=20).read())
    except urllib.error.HTTPError as e:
        return {"ERROR": json.loads(e.read())}


def main():
    print(f"Token (last 8 chars): ...{TOKEN[-8:]}")
    print(f"Catalog: {CATALOG}")

    # Validate token
    me = get("me?fields=id,name")
    if "ERROR" in me:
        print(f"Token expired: {me['ERROR']['error']['message'][:100]}")
        sys.exit(1)
    print(f"Token OK: user={me.get('name')}")

    # 1. Connect to Page (external event source)
    print("\n=== 1. Page Glass Soler ===")
    r1 = post(
        f"{CATALOG}/external_event_sources",
        {"external_event_sources": json.dumps([PAGE])},
    )
    print(f"  {r1}")

    # 2. Connect to WhatsApp Business
    print("\n=== 2. WhatsApp Business ===")
    r2 = post(f"{WABA}/product_catalogs", {"catalog_id": CATALOG})
    print(f"  {r2}")

    # 3. Verify
    print("\n=== 3. Verification ===")
    v = get(f"{CATALOG}?fields=name,product_count,vertical")
    print(f"  {v}")
    prods = get(f"{CATALOG}/products?fields=retailer_id,name,price,review_status,availability&limit=10")
    print("\n  Products:")
    for p in prods.get("data", []):
        rev = p.get("review_status", "?")
        ava = p.get("availability", "?")
        print(f"    - {p.get('retailer_id'):<15} review={rev:<10} avail={ava}")


if __name__ == "__main__":
    main()
