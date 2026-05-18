"""
Test E2E Elena Managed Agent — flujo completo:
1. Crear environment (si no existe)
2. Crear session con Elena
3. Send event (mensaje user)
4. Stream / list events de respuesta
"""
import sys
import json
import time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

import anthropic

ROOT = Path(__file__).parent
ENV_PATH = ROOT / ".env"
ENV_VARS = {}
for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        ENV_VARS[k.strip()] = v.strip()

API_KEY = ENV_VARS["ANTHROPIC_API_KEY"]
AGENT_ID = ENV_VARS["ELENA_MANAGED_AGENT_ID"]

client = anthropic.Anthropic(api_key=API_KEY)

print(f"=== Test Elena E2E ===")
print(f"Agent ID: {AGENT_ID}\n")

# Step 1: Crear o obtener environment
print("Step 1: Environment...")
env_id = None
try:
    envs = list(client.beta.environments.list())
    for e in envs:
        if e.name == "elena-soler-env":
            env_id = e.id
            print(f"  Reutilizando env existente: {env_id}")
            break

    if not env_id:
        env = client.beta.environments.create(
            name="elena-soler-env",
            description="Environment para Elena - Grupo Soler",
            metadata={"businesses": "glass,esmeraldas,autos,inversiones"}
        )
        env_id = env.id
        print(f"  Creado nuevo env: {env_id}")
except Exception as e:
    print(f"  Error: {e}")
    sys.exit(1)

# Step 2: Crear session
print("\nStep 2: Crear sesion con Elena...")
try:
    session = client.beta.sessions.create(
        agent={"type": "agent", "id": AGENT_ID},
        environment_id=env_id,
        title="Test E2E Elena",
        metadata={"test": "true"}
    )
    print(f"  Session ID: {session.id}")
except Exception as e:
    print(f"  Error: {type(e).__name__}: {e}")
    sys.exit(1)

# Step 3: Send message
print("\nStep 3: Enviar mensaje user...")
test_msg = "Hola, busco polarizado de seguridad para mi Honda Civic 2020 en Curridabat porque hay muchos asaltos"
print(f"  USER: {test_msg[:80]}")

try:
    result = client.beta.sessions.events.send(
        session_id=session.id,
        events=[{
            "type": "user.message",
            "content": [{"type": "text", "text": test_msg}]
        }]
    )
    print(f"  [OK] Mensaje enviado!")
    print(f"  Result: {str(result)[:200]}")
except Exception as e:
    print(f"  Error: {type(e).__name__}: {str(e)[:300]}")

# Step 4: Stream / list events
print("\nStep 4: Obtener respuesta del agente (esperando hasta 30s)...")
import time as _time
deadline = _time.time() + 30
last_count = 0
while _time.time() < deadline:
    try:
        events = list(client.beta.sessions.events.list(session_id=session.id))
        if len(events) > last_count:
            last_count = len(events)
            # Print solo el ultimo
            new_ev = events[-1]
            ev_type = getattr(new_ev, 'type', '?')
            print(f"  [{ev_type}] {str(new_ev)[:180]}")
            # Si recibimos un assistant.message, listo
            if 'assistant' in ev_type.lower() and 'message' in ev_type.lower():
                print("\n  ✅ Respuesta de Elena recibida!")
                # Extract text
                if hasattr(new_ev, 'content'):
                    for block in new_ev.content:
                        if hasattr(block, 'text'):
                            print(f"\n  ELENA: {block.text}")
                break
            if 'idled' in ev_type.lower() or 'terminated' in ev_type.lower():
                print("\n  Sesion finalizada")
                break
    except Exception as e:
        print(f"  Error listando: {e}")
        break
    _time.sleep(2)
else:
    print("  Timeout 30s sin respuesta — listar eventos finales")
    try:
        events = list(client.beta.sessions.events.list(session_id=session.id))
        for ev in events[-5:]:
            print(f"    [{getattr(ev,'type','?')}] {str(ev)[:180]}")
    except: pass

print(f"\n=== Done ===\n")
print(f"Session URL: https://platform.claude.com/dashboard/agentes-administrados/sesiones/{session.id}")
