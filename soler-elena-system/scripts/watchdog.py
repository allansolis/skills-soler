"""
Watchdog — vigila los 4 bots Elena y los reinicia si caen.

Funcionalidad:
- Cada 60 seg pinguea GET / a cada bot (5000-5003)
- Si HTTP != 200 o no responde en 5 seg, marca como DOWN
- Si DOWN: dispara notificacion + intenta restart
- Tras 3 restarts fallidos seguidos: notifica alerta critica y para de reintentar ese bot
- Si bot vuelve solo, resetea contador

Uso:
    python watchdog.py

Lo dejas corriendo en una terminal aparte. Cualquier caida = notificacion + auto-restart.
"""
import os
import sys
import time
import json
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = Path(__file__).parent

try:
    import notifications
    HAS_NOTIFY = True
except ImportError:
    HAS_NOTIFY = False
    print("[!] notifications.py no disponible — solo console logging")

BOTS = [
    {"name": "esmeraldas", "port": 5000, "script": "bot.py", "process": None, "failures": 0, "last_check": None, "status": "unknown"},
    {"name": "glass",      "port": 5001, "script": "bot_glass.py", "process": None, "failures": 0, "last_check": None, "status": "unknown"},
    {"name": "autos",      "port": 5002, "script": "bot_autos.py", "process": None, "failures": 0, "last_check": None, "status": "unknown"},
    {"name": "inversiones","port": 5003, "script": "bot_inversiones.py","process":None,"failures":0,"last_check":None,"status":"unknown"},
]

CHECK_INTERVAL = 60  # segundos entre rondas
MAX_FAILURES = 3
HTTP_TIMEOUT = 5


def ping_bot(port: int) -> bool:
    """Returns True si bot responde HTTP 200 a GET /."""
    try:
        r = urllib.request.urlopen(f'http://localhost:{port}/', timeout=HTTP_TIMEOUT)
        return r.status == 200
    except Exception:
        return False


def restart_bot(bot: dict) -> bool:
    """Intenta reiniciar bot. Mata proceso si existe en el puerto y arranca uno nuevo."""
    # Mata proceso en el puerto
    try:
        r = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, timeout=5)
        for line in r.stdout.split('\n'):
            if f":{bot['port']} " in line and 'LISTENING' in line:
                pid = line.split()[-1].strip()
                subprocess.run(['taskkill', '/PID', pid, '/F'], capture_output=True, timeout=5)
                time.sleep(2)
                break
    except Exception as e:
        print(f"  [warn] No pude matar proceso en :{bot['port']}: {e}")

    # Arrancar nuevo
    script_path = ROOT / bot['script']
    if not script_path.exists():
        print(f"  [X] {bot['script']} no existe en {ROOT}")
        return False

    try:
        # Subprocess.Popen sin esperar (detached on Windows via DETACHED_PROCESS)
        if os.name == 'nt':
            proc = subprocess.Popen(
                [sys.executable, str(script_path)],
                cwd=str(ROOT),
                creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        else:
            proc = subprocess.Popen(
                [sys.executable, str(script_path)],
                cwd=str(ROOT),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        bot['process'] = proc
        print(f"  [OK] Lanzado {bot['script']} (PID {proc.pid})")
        return True
    except Exception as e:
        print(f"  [X] Error lanzando {bot['script']}: {e}")
        return False


def notify(level: str, msg: str, meta: dict = None) -> None:
    if HAS_NOTIFY:
        notifications.notify_event(level, msg, meta)
    else:
        print(f"[{level.upper()}] {msg} {meta or ''}")


def check_all() -> None:
    """Ciclo completo: verifica los 4 bots y actua si alguno falla."""
    now = datetime.now(timezone.utc).isoformat()

    for bot in BOTS:
        is_up = ping_bot(bot['port'])
        bot['last_check'] = now

        if is_up:
            if bot['status'] != 'up':
                # Transicion: down -> up (recovery)
                if bot['status'] == 'down':
                    notify("info", f"Bot {bot['name']} recovered", {"bot": bot['name'], "port": bot['port']})
                bot['status'] = 'up'
                bot['failures'] = 0
            continue

        # Bot down
        bot['failures'] += 1
        prev_status = bot['status']
        bot['status'] = 'down'

        if bot['failures'] > MAX_FAILURES:
            # Demasiados fallos, alerta critica y skip
            if prev_status != 'critical':
                notify("error", f"Bot {bot['name']} CRITICO ({bot['failures']} fallos seguidos)",
                       {"bot": bot['name'], "port": bot['port'], "failures": bot['failures']})
                bot['status'] = 'critical'
            continue

        # Intentar restart
        notify("warn", f"Bot {bot['name']} DOWN — intentando restart ({bot['failures']}/{MAX_FAILURES})",
               {"bot": bot['name'], "port": bot['port'], "failures": bot['failures']})

        ok = restart_bot(bot)
        if ok:
            # Esperar un poco y verificar
            time.sleep(8)
            if ping_bot(bot['port']):
                notify("info", f"Bot {bot['name']} restarted OK", {"bot": bot['name'], "port": bot['port']})
                bot['status'] = 'up'
                bot['failures'] = 0
            else:
                notify("error", f"Bot {bot['name']} restart fallo — sigue DOWN", {"bot": bot['name'], "port": bot['port']})


def main() -> None:
    print(f"[Watchdog] Iniciado — vigilando {len(BOTS)} bots cada {CHECK_INTERVAL}s")
    print(f"[Watchdog] Restart automatico hasta {MAX_FAILURES} intentos seguidos")
    print(f"[Watchdog] Notificaciones via: {'notifications.py' if HAS_NOTIFY else 'console only'}")
    print("[Watchdog] Ctrl+C para salir\n")

    notify("info", "Watchdog iniciado", {"bots": len(BOTS), "interval_seconds": CHECK_INTERVAL})

    try:
        while True:
            check_all()
            # Print status summary
            statuses = " | ".join(f"{b['name']}:{b['status']}" for b in BOTS)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {statuses}", flush=True)
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        print("\n[Watchdog] Stop")
        notify("info", "Watchdog detenido manualmente", {})


if __name__ == '__main__':
    main()
