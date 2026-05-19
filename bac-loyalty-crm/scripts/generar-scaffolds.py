#!/usr/bin/env python3
"""
Genera scaffolds JSON para los 14 workflows pendientes a partir de las plantillas
en n8n-templates/. Cada scaffold queda marcado como SCAFFOLD y debe reemplazarse
por el JSON real descargado desde n8n cloud cuando esté disponible.

Uso:
    python3 generar-scaffolds.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TPL_DIR = ROOT / "n8n-templates"
OUT_DIR = ROOT / "n8n-workflows" / "scaffolds"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Mapeo workflow -> plantilla + parámetros
WORKFLOWS = [
    # (slug, nombre, plantilla, sustituciones)
    ("agente-9-sync-bidireccional", "Agente 9 - Sincronización CRM Bidireccional",
     "tpl-agente-sync-bidireccional.json",
     {"___ENDPOINT_ORIGEN___": "contacts", "___ENDPOINT_DESTINO___": "external/crm/contacts"}),
    ("agente-10-informe-ejecutivo", "Agente 10 - Informe Ejecutivo Diario",
     "tpl-agente-informe-diario.json", {}),
    ("automatizador-tuberias-glass", "Automatizador principal de tuberías - Glass Soler",
     "tpl-agente-optimizador.json", {}),
    ("cerebro-marketing-glass", "Cerebro Marketing IA - Glass Soler",
     "tpl-agente-marketing-ia.json", {}),
    ("cerebro-marketing-esmeralda", "Cerebro Marketing IA - Esmeralda",
     "tpl-agente-marketing-ia.json", {}),
    ("informe-inteligencia-marketing-glass", "Informe de Inteligencia de Marketing - Glass Soler",
     "tpl-agente-informe-diario.json", {}),
    ("informe-inteligencia-marketing-esmeralda", "Informe de Inteligencia de Marketing - Esmeralda",
     "tpl-agente-informe-diario.json", {}),
    ("optimizador-campanas-glass", "Optimizador de campañas con IA - Glass Soler",
     "tpl-agente-optimizador.json", {}),
    ("optimizador-campanas-esmeralda", "Optimizador de Campañas AI - Esmeralda",
     "tpl-agente-optimizador.json", {}),
    ("creador-campanas-glass", "Creador y estratega de campañas con IA - Glass Soler",
     "tpl-agente-marketing-ia.json", {}),
    ("creador-campanas-esmeralda", "Creador de Campañas y Estrategias - Esmeralda",
     "tpl-agente-marketing-ia.json", {}),
    ("sync-rendimiento", "Sincronización del rendimiento",
     "tpl-agente-sync-bidireccional.json",
     {"___ENDPOINT_ORIGEN___": "performance/source", "___ENDPOINT_DESTINO___": "performance/target"}),
]

MARCAS = {
    "glass": "glass-soler",
    "esmeralda": "esmeralda",
}

def detectar_marca(slug):
    if "glass" in slug: return "glass-soler"
    if "esmeralda" in slug: return "esmeralda"
    return None

def instanciar(tpl_path: Path, nombre: str, slug: str, subs: dict) -> dict:
    raw = tpl_path.read_text(encoding="utf-8")
    for k, v in subs.items():
        raw = raw.replace(k, v)
    raw = re.sub(r'"\$\{N8N_ENDPOINT_[A-Z_]+\}"', '""', raw)
    data = json.loads(raw)
    data["name"] = nombre
    marca = detectar_marca(slug)
    tags = data.get("tags", [])
    tags.append({"name": "scaffold"})
    if marca:
        tags.append({"name": marca})
    data["tags"] = tags
    if isinstance(data.get("nodes"), list) and data["nodes"]:
        init = data["nodes"][1] if len(data["nodes"]) > 1 else data["nodes"][0]
        if init.get("type") == "n8n-nodes-base.code":
            current = init["parameters"].get("jsCode", "")
            init["parameters"]["jsCode"] = (
                f"// SCAFFOLD generado desde {tpl_path.name}. Reemplazar con JSON real cuando esté disponible.\n"
                + current
            )
    return data


def main():
    if not TPL_DIR.exists():
        raise SystemExit(f"No existe {TPL_DIR}")

    generados = []
    for slug, nombre, tpl_name, subs in WORKFLOWS:
        tpl_path = TPL_DIR / tpl_name
        if not tpl_path.exists():
            print(f"  SKIP {slug}: plantilla {tpl_name} no encontrada")
            continue
        data = instanciar(tpl_path, nombre, slug, subs)
        out_path = OUT_DIR / f"{slug}.scaffold.json"
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  OK   {slug:45s} <- {tpl_name}")
        generados.append((slug, nombre, tpl_name))

    indice = OUT_DIR / "INDEX.md"
    indice.write_text(
        "# Scaffolds generados\n\n"
        "Estos archivos son **plantillas instanciadas** con nombres reales pero contenido genérico.\n"
        "Reemplazar cada uno por el JSON real descargado desde n8n cloud apenas esté disponible.\n\n"
        "| Slug | Nombre real | Plantilla base |\n|---|---|---|\n"
        + "\n".join(f"| `{s}` | {n} | `{t}` |" for s, n, t in generados)
        + "\n",
        encoding="utf-8",
    )
    print(f"\nGenerados {len(generados)} scaffolds en {OUT_DIR}")


if __name__ == "__main__":
    main()
