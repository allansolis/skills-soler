"""
Create Elena Managed Agent via Anthropic SDK (beta).

Usa client.beta.agents.create() para crear Elena en platform.claude.com
con el system prompt master + configuracion para los 4 negocios.
"""
import sys
import json
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
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            ENV_VARS[k.strip()] = v.strip()

API_KEY = ENV_VARS.get("ANTHROPIC_API_KEY", "")
if not API_KEY:
    print("[X] No hay ANTHROPIC_API_KEY")
    sys.exit(1)

# Cargar prompt + KB
PROMPT_PATH = Path("C:/Users/Usuario/Documents/skills-soler/soler-elena-system/managed-agent/elena-master-system-prompt.md")
system_prompt = PROMPT_PATH.read_text(encoding="utf-8")

# Tools (opcional — definidos pero no implementados aun)
tools = [
    {
        "type": "custom",
        "name": "schedule_appointment",
        "description": "Agenda una cita de evaluacion para el cliente",
        "input_schema": {
            "type": "object",
            "properties": {
                "business_id": {"type": "string", "enum": ["glass_soler", "esmeraldas_soler", "autos_soler", "inversiones_soler"]},
                "user_id": {"type": "string"},
                "preferred_date": {"type": "string", "description": "Fecha preferida YYYY-MM-DD"},
                "preferred_time": {"type": "string", "description": "Hora preferida HH:MM"},
                "location": {"type": "string", "enum": ["taller", "domicilio", "videocall"]},
                "notes": {"type": "string"}
            },
            "required": ["business_id", "user_id", "preferred_date"]
        }
    },
    {
        "type": "custom",
        "name": "request_human_handoff",
        "description": "Escala la conversacion a un asesor humano",
        "input_schema": {
            "type": "object",
            "properties": {
                "business_id": {"type": "string"},
                "user_id": {"type": "string"},
                "reason": {"type": "string", "description": "Razon del handoff"},
                "urgency": {"type": "string", "enum": ["low", "medium", "high"]}
            },
            "required": ["business_id", "user_id", "reason"]
        }
    },
    {
        "type": "custom",
        "name": "send_product_catalog",
        "description": "Envia el catalogo de productos al cliente via Meta",
        "input_schema": {
            "type": "object",
            "properties": {
                "business_id": {"type": "string"},
                "user_id": {"type": "string"},
                "category_filter": {"type": "string", "description": "Filtro opcional de categoria"}
            },
            "required": ["business_id", "user_id"]
        }
    }
]

client = anthropic.Anthropic(api_key=API_KEY)

print("=== Crear Elena Managed Agent ===\n")
print(f"SDK version: {anthropic.__version__}")
print(f"System prompt size: {len(system_prompt):,} chars")
print(f"Tools: {len(tools)}\n")

# Listar agentes existentes
print("Agentes existentes:")
try:
    existing = list(client.beta.agents.list())
    if existing:
        for a in existing:
            print(f"  - {getattr(a, 'name', '?')} (id: {getattr(a, 'id', '?')})")
    else:
        print("  (ninguno)")
except Exception as e:
    print(f"  [warn] No pude listar: {e}")

print()

# Crear Elena
try:
    agent = client.beta.agents.create(
        name="Elena - Grupo Soler",
        description="Asesora IA multi-marca para Glass Soler, Esmeraldas, Autos Soler e Inversiones Soler. Identifica marca por contexto y responde con KB especifica de cada negocio en Costa Rica.",
        model="claude-sonnet-4-5-20250929",
        system=system_prompt,
        tools=tools,
        metadata={
            "version": "2.0",
            "maintainer": "Allann Solis",
            "businesses": "glass_soler,esmeraldas_soler,autos_soler,inversiones_soler",
            "created_by": "create_elena_agent.py",
            "deployed_locally_too": "true",
        },
    )

    print(f"\n✅ AGENTE CREADO!")
    print(f"   ID: {agent.id}")
    print(f"   Name: {agent.name}")
    print(f"   Model: {agent.model}")
    if hasattr(agent, 'description'):
        print(f"   Description: {agent.description[:100]}...")
    if hasattr(agent, 'created_at'):
        print(f"   Created: {agent.created_at}")

    # Agregar a .env
    env_addition = f"\n# Elena Managed Agent (creado {agent.id})\nELENA_MANAGED_AGENT_ID={agent.id}\n"
    print(f"\n[i] Agregar a .env:\n{env_addition}")

    # Persistir
    out = ROOT / "data" / "elena_agent_info.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({
        "id": agent.id,
        "name": agent.name,
        "model": agent.model,
        "description": getattr(agent, 'description', None),
        "system_prompt_size": len(system_prompt),
        "tools_count": len(tools),
        "created_at": str(getattr(agent, 'created_at', None)),
    }, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"\n[OK] Info guardada en {out}")

except anthropic.BadRequestError as e:
    print(f"\n[X] Bad request: {e.message if hasattr(e, 'message') else e}")
    if hasattr(e, 'body'):
        print(f"   {e.body}")
except anthropic.AuthenticationError as e:
    print(f"\n[X] Auth error: {e}")
except anthropic.PermissionDeniedError as e:
    print(f"\n[X] Permission denied: {e}")
except Exception as e:
    print(f"\n[X] Error: {type(e).__name__}: {e}")
