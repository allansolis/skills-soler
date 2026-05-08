"""
Watch-Tokens — monitor pasivo del .env

Vigila el archivo .env y dispara las acciones correspondientes
cuando detecta cambios en los tokens (META o ZOLUTIUM).

Uso: python scripts/watch-tokens.py
Lo dejás corriendo en una terminal aparte y cuando regeneres tokens
en .env el script automáticamente corre los flujos.
"""
import os
import sys
import time
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent
ENV = ROOT / ".env"

if not ENV.exists():
    print(f"❌ No existe {ENV}")
    sys.exit(1)


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
            return v.startswith("EAA...") or v.startswith("pit-XXX") or v == "" or v.startswith("sk-ant-api03-XXX")
    return True


def run(cmd: list) -> int:
    """Ejecuta comando subproceso, retorna exit code."""
    print(f"\n>>> {' '.join(cmd)}")
    try:
        return subprocess.run(cmd, cwd=ROOT, check=False).returncode
    except Exception as e:
        print(f"   Error: {e}")
        return 1


print(f"👀 Monitoreando {ENV}")
print("   Trigger META_*  → auto-fix-glass.py")
print("   Trigger ZOLUTIUM → extract-zolutium.py")
print("   Ctrl+C para salir\n")

last = token_signature(ENV)
print(f"   Estado inicial: META={last['META_ACCESS_TOKEN'][:6]}.. ADS={last['META_ADS_TOKEN'][:6]}.. ZOL={last['ZOLUTIUM_API_KEY'][:6]}..")

try:
    while True:
        time.sleep(5)
        try:
            current = token_signature(ENV)
        except Exception:
            continue

        # Meta tokens cambiaron
        if (current["META_ACCESS_TOKEN"] != last["META_ACCESS_TOKEN"] or
            current["META_ADS_TOKEN"] != last["META_ADS_TOKEN"]):
            print(f"\n🔄 [{time.strftime('%H:%M:%S')}] Token Meta cambió")
            if not is_placeholder(ENV, "META_ADS_TOKEN"):
                run([sys.executable, "scripts/auto-fix-glass.py"])
            else:
                print("   (Token sigue placeholder, no corro)")

        # Zolutium token cambió
        if current["ZOLUTIUM_API_KEY"] != last["ZOLUTIUM_API_KEY"]:
            print(f"\n🔄 [{time.strftime('%H:%M:%S')}] Token Zolutium cambió")
            if not is_placeholder(ENV, "ZOLUTIUM_API_KEY"):
                run([sys.executable, "scripts/extract-zolutium.py"])
            else:
                print("   (Token sigue placeholder, no corro)")

        last = current
except KeyboardInterrupt:
    print("\n👋 Stop")
