#!/usr/bin/env python3
"""
Linter de workflows n8n para BAC Loyalty CRM.

Valida que cada workflow .json en n8n-workflows/ y n8n-templates/ cumple las
convenciones del proyecto (ver bac-loyalty-crm/CONTEXTO.md):

- Cada POST HTTP debe incluir header Idempotency-Key.
- Cada HTTP node debe tener retry configurado.
- Cada HTTP node debe tener timeout > 0.
- Cada llamada a Claude debe tener un Code node de validación inmediato después.
- Modelo Claude debe ser claude-opus-4-7 o claude-sonnet-4-6.
- Cada workflow debe tener un Trigger.
- typeVersion de HTTP nodes debe ser >= 4.2.

Salida:
- exit 0 si todo OK.
- exit 1 si hay violaciones (lista las violaciones).

Uso:
    python3 scripts/lint-workflows.py
    python3 scripts/lint-workflows.py --strict   (también revisa scaffolds)
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATHS = [ROOT / "n8n-workflows", ROOT / "n8n-templates"]
SCAFFOLDS = ROOT / "n8n-workflows" / "scaffolds"

MODELOS_VALIDOS = {"claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"}

class Lint:
    def __init__(self, path: Path, data: dict):
        self.path = path
        self.data = data
        self.violations: list[str] = []

    def check(self):
        nodes = self.data.get("nodes", [])
        self._check_trigger(nodes)
        for n in nodes:
            t = n.get("type", "")
            name = n.get("name", "(sin nombre)")
            if t == "n8n-nodes-base.httpRequest":
                self._check_http(n, name)
            elif t.endswith("Anthropic"):
                self._check_anthropic(n, name, nodes)

    def _check_trigger(self, nodes):
        triggers = [n for n in nodes if "Trigger" in n.get("type", "")]
        if not triggers:
            self.violations.append("Sin nodo Trigger")

    def _check_http(self, n, name):
        p = n.get("parameters", {})
        opts = p.get("options", {}) or {}
        method = p.get("method", "GET")

        if not opts.get("timeout"):
            self.violations.append(f"HTTP '{name}': falta options.timeout")
        if not opts.get("retry") or not opts["retry"].get("limit"):
            self.violations.append(f"HTTP '{name}': falta options.retry.limit")

        tv = n.get("typeVersion", 0)
        if tv < 4.2:
            self.violations.append(f"HTTP '{name}': typeVersion {tv} < 4.2")

        if method.upper() in ("POST", "PUT", "PATCH"):
            url = (p.get("url") or "").lower()
            requiere_idempotency = (
                "zolutium" in url
                or "{{$env.zolutium" in url
                or "{{ $env.zolutium" in url
            )
            if requiere_idempotency:
                headers = p.get("headerParameters", {}).get("parameters", [])
                if isinstance(headers, list):
                    header_names = [h.get("name", "").lower() for h in headers if isinstance(h, dict)]
                else:
                    header_names = []
                if "idempotency-key" not in header_names:
                    self.violations.append(f"HTTP '{name}' ({method} Zolutium): falta header Idempotency-Key")

    def _check_anthropic(self, n, name, nodes):
        p = n.get("parameters", {})
        model = p.get("modelId") or p.get("model") or ""
        if model and model not in MODELOS_VALIDOS:
            self.violations.append(
                f"Anthropic '{name}': modelo '{model}' no esta en la lista permitida {sorted(MODELOS_VALIDOS)}"
            )

        idx = nodes.index(n)
        cons = self.data.get("connections", {}).get(name, {}).get("main", [[]])
        if not cons or not cons[0]:
            self.violations.append(f"Anthropic '{name}': sin sucesor (deberia conectar a un Code validador)")
            return
        siguiente_name = cons[0][0].get("node")
        siguiente = next((x for x in nodes if x.get("name") == siguiente_name), None)
        if not siguiente or siguiente.get("type") != "n8n-nodes-base.code":
            self.violations.append(
                f"Anthropic '{name}': el sucesor '{siguiente_name}' no es Code (deberia validar la salida JSON)"
            )


def discover(strict: bool):
    files: list[Path] = []
    for p in PATHS:
        if not p.exists():
            continue
        for f in p.glob("*.json"):
            if "deprecated" in f.parts:
                continue
            files.append(f)
    if strict and SCAFFOLDS.exists():
        files.extend(SCAFFOLDS.glob("*.scaffold.json"))
    return sorted(files)


def main():
    strict = "--strict" in sys.argv
    files = discover(strict)
    if not files:
        print("No se encontraron archivos a validar")
        return 0

    total_violations = 0
    print(f"Linter de workflows n8n — {len(files)} archivos\n")
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  FAIL {f.relative_to(ROOT)} — JSON invalido: {e}")
            total_violations += 1
            continue
        lint = Lint(f, data)
        lint.check()
        if lint.violations:
            print(f"  WARN {f.relative_to(ROOT)} ({len(lint.violations)} avisos)")
            for v in lint.violations:
                print(f"       - {v}")
            total_violations += len(lint.violations)
        else:
            print(f"  OK   {f.relative_to(ROOT)}")

    print(f"\nTotal avisos: {total_violations}")
    if total_violations > 0 and "--no-fail" not in sys.argv:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
