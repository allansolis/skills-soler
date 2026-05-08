"""
Watch-Tokens — monitor pasivo del .env

Vigila el archivo .env y dispara las acciones correspondientes
cuando detecta cambios en los tokens (META o ZOLUTIUM).

Uso: python scripts/watch-tokens.py
Lo dejas corriendo en una terminal aparte y cuando regeneres tokens
en .env el script automaticamente corre los flujos.
"""
import os
import sys
import time
import hashlib
import subprocess
from pathlib import Path

# Forzar UTF-8 en stdout (Windows cp1252 no maneja emojis)
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).parent.parent

# Buscar .env en multiples ubicaciones
ENV_CANDIDATES = [
    ROOT / ".env",
    Path("C:/Users/Usuario/Desktop/Bot glass soler/.env"),
    Path.cwd() / ".env",
]

ENV = None
for p in ENV_CANDIDATES:
    if p.exists():
        ENV = p
        break

if ENV is None:
    print("[!] No encontre .env en:", flush=True)
    for p in ENV_CANDIDATES:
        print(f"    - {p}", flush=True)
    sys.exit(1)

print(f"[OK] Usando {ENV}", flush=True)


def token_signature(env_path: Path) -> dict:
    """Hash de cada token relevante para detectar cambios."""
    sigs = {"META_ACCESS_TOKEN": "", "META_ADS_TOKEN": "", "ZOLUTIUM_API_KEY": ""}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        if k in sigs:
            sigs[k] = hashlib.sha256(v.strip().encode()).hexdigest()[:12]
    return sigs


def is_placeholder(env_path: Path, key: str) -> bool:
    """Detecta tokens placeholder no actualizados."""
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            v = line.split("=", 1)[1].strip()
            return (
                v.startswith("EAA...")
                or v.startswith("pit-XXX")
                or v == ""
                or v.startswith("sk-ant-api03-XXX")
            )
    return True


def run(cmd: list) -> int:
    """Ejecuta comando subproceso, retorna exit code."""
    print(f"\n>>> {' '.join(cmd)}", flush=True)
    try:
        return subprocess.run(cmd, cwd=ROOT, check=False).returncode
    except Exception as e:
        print(f"   Error: {e}", flush=True)
        return 1


print(f"[>>] Monitoreando {ENV}", flush=True)
print("     Trigger META_*  -> auto-fix-glass.py", flush=True)
print("     Trigger ZOLUTIUM -> extract-zolutium.py", flush=True)
print("     Ctrl+C para salir", flush=True)

last = token_signature(ENV)
print(
    f"     Estado inicial: META={last['META_ACCESS_TOKEN'][:6]}.. "
    f"ADS={last['META_ADS_TOKEN'][:6]}.. ZOL={last['ZOLUTIUM_API_KEY'][:6]}..",
    flush=True,
)

try:
    while True:
        time.sleep(5)
        try:
            current = token_signature(ENV)
        except Exception:
            continue

        # Meta tokens cambiaron
        if (
            current["META_ACCESS_TOKEN"] != last["META_ACCESS_TOKEN"]
            or current["META_ADS_TOKEN"] != last["META_ADS_TOKEN"]
        ):
            print(f"\n[!] [{time.strftime('%H:%M:%S')}] Token Meta cambio", flush=True)
            if not is_placeholder(ENV, "META_ADS_TOKEN"):
                run([sys.executable, "scripts/auto-fix-glass.py"])
            else:
                print("    (Token sigue placeholder, no corro)", flush=True)

        # Zolutium token cambio
        if current["ZOLUTIUM_API_KEY"] != last["ZOLUTIUM_API_KEY"]:
            print(
                f"\n[!] [{time.strftime('%H:%M:%S')}] Token Zolutium cambio",
                flush=True,
            )
            if not is_placeholder(ENV, "ZOLUTIUM_API_KEY"):
                run([sys.executable, "scripts/extract-zolutium.py"])
            else:
                print("    (Token sigue placeholder, no corro)", flush=True)

        last = current
except KeyboardInterrupt:
    print("\n[bye] Stop", flush=True)
