"""
Extract Zolutium (GoHighLevel) — descarga toda la config de la cuenta SOLER
Uso: python extract-zolutium.py
Pre-requisito: ZOLUTIUM_API_KEY actualizado en .env
"""
import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

# Norton AV TLS bypass (Windows)
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

# Cargar .env desde raíz soler-elena-system
ROOT = Path(__file__).parent.parent
ENV = ROOT / ".env"
if ENV.exists():
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

TOKEN = os.environ.get("ZOLUTIUM_API_KEY", "")
LOC = os.environ.get("ZOLUTIUM_LOCATION_ID", "CzqwqD6eS1JrCHQxdvy2")
BASE = os.environ.get("ZOLUTIUM_BASE_URL", "https://services.leadconnectorhq.com")
VERSION = os.environ.get("ZOLUTIUM_API_VERSION", "2021-07-28")

if not TOKEN or TOKEN.startswith("pit-XXX"):
    print("❌ ZOLUTIUM_API_KEY no configurado en .env")
    print("   Regenerar en Zolutium → Settings → Private Integrations")
    sys.exit(1)

OUT = ROOT / "zolutium-export"
OUT.mkdir(exist_ok=True)


def get(path: str) -> dict:
    """GET request a Zolutium API con auth."""
    url = f"{BASE}/{path}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Version", VERSION)
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", "soler-elena-extractor/1.0")
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"_error": f"HTTP {e.code}", "_body": body}
    except Exception as e:
        return {"_error": str(e)}


def save(name: str, data: dict) -> int:
    """Guarda JSON a archivo y retorna count de items principales."""
    path = OUT / f"zolutium-{name}.json"
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    # Count items en primer array que encuentre
    for key, val in data.items():
        if isinstance(val, list):
            return len(val)
    return 0


print(f"📥 Extrayendo de location {LOC}\n")

endpoints = [
    ("custom-fields", f"locations/{LOC}/customFields"),
    ("tags", f"locations/{LOC}/tags"),
    ("pipelines", f"opportunities/pipelines?locationId={LOC}"),
    ("calendars", f"calendars/?locationId={LOC}"),
    ("workflows", f"workflows/?locationId={LOC}"),
    ("snippets", f"locations/{LOC}/templates"),
    ("contacts-sample", f"contacts/?locationId={LOC}&limit=100"),
    ("conversations-sample", f"conversations/search?locationId={LOC}&limit=50"),
]

results = []
for name, path in endpoints:
    print(f"  → {name:25s} ", end="", flush=True)
    data = get(path)
    if "_error" in data:
        print(f"❌ {data['_error']}")
        results.append((name, "ERROR"))
    else:
        count = save(name, data)
        print(f"✅ {count} items")
        results.append((name, count))

print(f"\n📊 Resumen guardado en {OUT}\n")
for name, count in results:
    print(f"  {name:25s} {count}")

print("\n✅ Extracción completa. Próximo paso: enriquecer KBs con datos históricos.")
