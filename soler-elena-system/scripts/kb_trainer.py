"""
kb_trainer.py - Analiza conversaciones exitosas y sugiere mejoras a las KBs.

Lee:
  - bots/data/conversations.db (SQLite con tabla conversations)
  - bots/data/leads_scores.json (scores por user x business)
  - knowledge-bases/kb_<negocio>.json (4 KBs)

Detecta:
  1) FAQs perdidas (preguntas del usuario sin match en kb.faq)
  2) Objeciones recurrentes (mensajes negativos/dudas no cubiertos)
  3) Productos/servicios mencionados sin match en kb.paquetes/productos/etc.
  4) Senales nuevas para scoring (frases que correlacionan con high score)
  5) Patrones de conversacion exitosa vs abandono

Output: docs/KB-TRAINING-REPORT-<date>.md

Stdlib-only: sqlite3, json, re, difflib, collections.
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path


# === Paths ===
ROOT = Path(__file__).resolve().parent.parent  # soler-elena-system/
DB_PATH = ROOT / "bots" / "data" / "conversations.db"
SCORES_PATH = ROOT / "bots" / "data" / "leads_scores.json"
KB_DIR = ROOT / "knowledge-bases"
DOCS_DIR = ROOT / "docs"

# Map business id (en SQLite/leads) -> KB filename
BUSINESS_KB = {
    "glass_soler": "kb_glass_soler.json",
    "autos_soler": "kb_autos.json",
    "esmeraldas_soler": "kb_esmeraldas.json",
    "inversiones_soler": "kb_inversiones.json",
}

# === Tunables ===
HOT_LEAD_THRESHOLD = 70
FAQ_SIMILARITY_THRESHOLD = 0.55  # difflib ratio; below this = unmatched
PRODUCT_SIMILARITY_THRESHOLD = 0.70
MIN_FREQUENCY_FAQ = 1            # frecuencia minima para listar
MIN_FREQUENCY_OBJECTION = 1
TOP_N = 15

# Palabras vacias / saludos / muy genericos -- excluir como "FAQ perdida"
STOPWORD_MESSAGES = {
    "hola", "buenas", "buenos dias", "buenas tardes", "buenas noches",
    "gracias", "ok", "okay", "si", "no", "bien", "vale", "perfecto",
    "listo", "claro", "dale", "excelente", "muchas gracias", "de nada",
    "adios", "chao", "bye", "buen dia", "saludos",
}

# Objection cue terms (es-CR)
OBJECTION_CUES = [
    r"\b(?:caro|carisimo|costoso|muy caro)\b",
    r"\blo (?:voy a )?pens(?:ar|are|are|aria|aria)",
    r"\bpens(?:andolo|ar)\b",
    r"\bdespues\b",
    r"\b(?:no tengo|sin) (?:plata|dinero|presupuesto)\b",
    r"\bmas barato\b",
    r"\bdescuento\b",
    r"\boferta\b",
    r"\bcompetencia\b",
    r"\botro (?:lugar|taller|sitio)\b",
    r"\b(?:tal vez|quiza|quizas)\b",
    r"\bdesconfia\b",
    r"\bdesconfianza\b",
    r"\b(?:no me sirve|no me convence|no funciona)\b",
    r"\b(?:no estoy seguro|inseguro|dudo)\b",
    r"\b(?:no creo|no me interesa)\b",
    r"\b(?:problema|reclamo|queja|enojado|molesto)\b",
]
OBJECTION_RE = [re.compile(p, re.IGNORECASE) for p in OBJECTION_CUES]

# Senales de alta intencion candidatas para scoring rules
HIGH_INTENT_CUES = [
    r"\b(?:cuando podemos|cuando puedo|hoy mismo|ya|urgente|pronto)\b",
    r"\b(?:proceder|procedamos|firmar|firmemos|cerrar|cerremos|reservar)\b",
    r"\b(?:transferencia|sinpe|deposito|pagar|pago)\b",
    r"\b(?:apartar|reservar|separar)\b",
    r"\b(?:ahora mismo|en este momento|hoy)\b",
    r"\b(?:donde estan|direccion|ubicacion|llegar)\b",
    r"\b(?:codigo postal|provincia|barrio)\b",
]
HIGH_INTENT_RE = [(re.compile(p, re.IGNORECASE), p) for p in HIGH_INTENT_CUES]

PUNCT_RE = re.compile(r"[^\w\s\-]", re.UNICODE)
WHITESPACE_RE = re.compile(r"\s+")

# Detecta posibles nombres propios de productos/servicios (Capitalizadas o "entre comillas")
QUOTED_RE = re.compile(r"[\"']([^\"']{3,40})[\"']")
CAPITALIZED_RE = re.compile(r"\b([A-ZA-ZA-Z][a-zA-Zaeiouunaeiouun]{2,}(?:\s+[A-ZA-ZA-Z][a-zA-Zaeiouun]{2,}){0,3})\b")


# === Helpers ===
def normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    if not text:
        return ""
    t = text.lower()
    t = PUNCT_RE.sub(" ", t)
    t = WHITESPACE_RE.sub(" ", t).strip()
    return t


def ngrams(tokens: list[str], n: int) -> list[str]:
    return [" ".join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)] if len(tokens) >= n else []


def is_question(text: str) -> bool:
    t = text.strip().lower()
    if not t:
        return False
    if "?" in t or t.endswith("?"):
        return True
    q_starts = ("que ", "como ", "cuanto", "cuando", "donde", "cual ", "cuales",
                "quien", "por que", "porque", "tienen", "hay ", "puedo ", "puede ",
                "es legal", "es seguro", "sirve", "funciona")
    return any(t.startswith(q) for q in q_starts)


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def load_json(path: Path) -> dict | list | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[WARN] Could not parse {path}: {e}", file=sys.stderr)
        return None


def load_kbs() -> dict[str, dict]:
    kbs: dict[str, dict] = {}
    for biz, fname in BUSINESS_KB.items():
        kb = load_json(KB_DIR / fname)
        if kb:
            kbs[biz] = kb
    return kbs


def kb_faq_questions(kb: dict) -> list[str]:
    out = []
    for q in kb.get("faq", []) or []:
        if isinstance(q, dict) and "pregunta" in q:
            out.append(q["pregunta"])
        elif isinstance(q, str):
            out.append(q)
    return out


def kb_objection_texts(kb: dict) -> list[str]:
    out = []
    for o in kb.get("objeciones", []) or []:
        if isinstance(o, dict) and "objecion" in o:
            out.append(o["objecion"])
    return out


def kb_product_names(kb: dict) -> list[str]:
    """Extracts the candidate product/service names from a KB."""
    names: list[str] = []
    candidate_keys = ("paquetes", "productos", "servicios", "tipos_inversion",
                      "tipos_servicio", "catalogo", "tipos_vehiculos")
    for key in candidate_keys:
        v = kb.get(key)
        if isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    for nk in ("nombre", "nombre_corto", "titulo"):
                        if nk in item and isinstance(item[nk], str):
                            names.append(item[nk])
                elif isinstance(item, str):
                    names.append(item)
        elif isinstance(v, dict):
            for sk, sv in v.items():
                names.append(sk)
                if isinstance(sv, str):
                    # short strings could be names
                    if len(sv) <= 60:
                        names.append(sv)
    # Tambien diferenciadores y ganchos suelen mencionar productos clave
    return [n for n in names if n and len(n) >= 3]


def load_conversations() -> list[dict]:
    """Returns list of dicts {id, business, user_id, role, content, timestamp}."""
    if not DB_PATH.exists():
        return []
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """SELECT id, business, user_id, role, content, timestamp
               FROM conversations
               ORDER BY business, user_id, id ASC"""
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def load_leads_scores() -> dict:
    data = load_json(SCORES_PATH)
    return data if isinstance(data, dict) else {}


def group_conversations(rows: list[dict]) -> dict[tuple[str, str], list[dict]]:
    """Group by (business, user_id)."""
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in rows:
        groups[(r["business"], r["user_id"])].append(r)
    return groups


def classify_conversations(groups: dict, scores: dict) -> dict[str, list]:
    """Buckets conversations into hot/handoff/cold based on lead scores."""
    buckets = {"hot": [], "handoff": [], "cold": [], "all": []}
    for (business, user_id), msgs in groups.items():
        key = f"{business}:{user_id}"
        info = scores.get(key, {})
        score = int(info.get("score", 0) or 0)
        handoff = bool(info.get("handoff_triggered"))
        entry = {
            "business": business,
            "user_id": user_id,
            "score": score,
            "handoff": handoff,
            "messages": msgs,
        }
        buckets["all"].append(entry)
        if score >= HOT_LEAD_THRESHOLD:
            buckets["hot"].append(entry)
        if handoff:
            buckets["handoff"].append(entry)
        if score < 20 and not handoff:
            buckets["cold"].append(entry)
    return buckets


# === Analisis ===

def find_missing_faqs(conversations: list[dict], kb_questions: list[str]) -> list[tuple[str, int, float]]:
    """Returns [(user_question_sample, frequency, best_similarity)] ordenado por freq desc."""
    user_questions: Counter = Counter()
    samples: dict[str, str] = {}  # normalized -> original sample (first seen)

    for entry in conversations:
        for m in entry["messages"]:
            if m["role"] != "user":
                continue
            text = (m["content"] or "").strip()
            if not text or len(text) < 6:
                continue
            if normalize(text) in STOPWORD_MESSAGES:
                continue
            if not is_question(text):
                continue
            norm = normalize(text)
            # collapse near-duplicates: use first 10 tokens
            key = " ".join(norm.split()[:10])
            user_questions[key] += 1
            samples.setdefault(key, text)

    results = []
    for key, freq in user_questions.most_common():
        if freq < MIN_FREQUENCY_FAQ:
            continue
        sample = samples[key]
        best_sim = max((similarity(sample, q) for q in kb_questions), default=0.0)
        if best_sim < FAQ_SIMILARITY_THRESHOLD:
            results.append((sample, freq, round(best_sim, 2)))
        if len(results) >= TOP_N:
            break
    return results


def find_recurring_objections(conversations: list[dict], kb_obj_texts: list[str]) -> list[tuple[str, int, list[str]]]:
    """Returns [(sample, frequency, cues_detected)]."""
    bucket: Counter = Counter()
    samples: dict[str, tuple[str, list[str]]] = {}

    for entry in conversations:
        for m in entry["messages"]:
            if m["role"] != "user":
                continue
            text = (m["content"] or "").strip()
            if not text or len(text) < 4:
                continue
            cues = []
            for r in OBJECTION_RE:
                m_ = r.search(text)
                if m_:
                    cues.append(m_.group(0).lower())
            if not cues:
                continue
            norm = normalize(text)
            key = " ".join(norm.split()[:12])
            bucket[key] += 1
            samples.setdefault(key, (text, cues))

    results: list[tuple[str, int, list[str]]] = []
    for key, freq in bucket.most_common():
        if freq < MIN_FREQUENCY_OBJECTION:
            continue
        sample, cues = samples[key]
        # Filtrar las ya cubiertas en KB
        best_sim = max((similarity(sample, o) for o in kb_obj_texts), default=0.0)
        if best_sim >= 0.55:
            continue
        results.append((sample, freq, cues))
        if len(results) >= TOP_N:
            break
    return results


def find_unmatched_products(conversations: list[dict], kb_names: list[str]) -> list[tuple[str, int]]:
    """Detecta ngrams capitalizados y entre comillas no presentes en la KB."""
    counter: Counter = Counter()

    for entry in conversations:
        for m in entry["messages"]:
            if m["role"] != "user":
                continue
            text = m["content"] or ""
            for quoted in QUOTED_RE.findall(text):
                counter[quoted.strip().lower()] += 1
            for cap in CAPITALIZED_RE.findall(text):
                # Skip si parece pronombre o palabra suelta corta
                if len(cap) < 4:
                    continue
                low = cap.lower()
                # Saltar nombres propios obvios de personas (1 palabra) excepto si es repetida
                counter[low] += 1

    # Filter contra KB names (similarity)
    kb_norm = [normalize(n) for n in kb_names]
    results: list[tuple[str, int]] = []
    for term, freq in counter.most_common():
        if freq < 2:  # require >=2 menciones para ruido bajo
            continue
        best = max((SequenceMatcher(None, normalize(term), n).ratio() for n in kb_norm), default=0.0)
        if best < PRODUCT_SIMILARITY_THRESHOLD:
            results.append((term, freq))
        if len(results) >= TOP_N:
            break
    return results


def discover_intent_signals(buckets: dict) -> list[tuple[str, int, int]]:
    """
    Correlaciona frases con altos scores. Returns [(cue_label, hits_in_hot, hits_in_cold)].
    """
    hot_msgs = [m["content"] for e in buckets["hot"] for m in e["messages"] if m["role"] == "user"]
    cold_msgs = [m["content"] for e in buckets["cold"] for m in e["messages"] if m["role"] == "user"]

    rows = []
    for regex, label in HIGH_INTENT_RE:
        hot_hits = sum(1 for t in hot_msgs if regex.search(t or ""))
        cold_hits = sum(1 for t in cold_msgs if regex.search(t or ""))
        if hot_hits > cold_hits and hot_hits > 0:
            rows.append((label, hot_hits, cold_hits))

    rows.sort(key=lambda r: (-r[1], r[2]))
    return rows[:TOP_N]


def conversation_excerpt(entry: dict, max_turns: int = 6) -> str:
    """Excerpt anonimizado para el reporte."""
    biz = entry["business"]
    anon_user = "user_" + (entry["user_id"][:6] if entry["user_id"] else "anon")
    lines = [f"`[{biz} | {anon_user} | score={entry['score']}]`"]
    for m in entry["messages"][:max_turns]:
        role = m["role"]
        content = (m["content"] or "").strip().replace("\n", " ")
        if len(content) > 180:
            content = content[:177] + "..."
        marker = "U" if role == "user" else "A"
        lines.append(f"- **{marker}:** {content}")
    if len(entry["messages"]) > max_turns:
        lines.append(f"- _(...+{len(entry['messages']) - max_turns} mensajes mas)_")
    return "\n".join(lines)


def best_practice_examples(buckets: dict, key: str, n: int = 3) -> list[str]:
    pool = buckets[key]
    # Ordenar por longitud de conversacion (mas turnos = mas info)
    pool_sorted = sorted(pool, key=lambda e: len(e["messages"]), reverse=True)
    return [conversation_excerpt(e) for e in pool_sorted[:n]]


# === Generador de reporte ===

def render_report(
    stats: dict,
    per_biz_missing_faqs: dict,
    per_biz_objections: dict,
    per_biz_unmatched: dict,
    intent_signals: list,
    buckets: dict,
    elapsed: float,
    today: str,
) -> str:
    md: list[str] = []
    md.append(f"# KB Training Report - {today}\n")
    md.append(f"_Generado automaticamente por `scripts/kb_trainer.py`_\n")

    # 1. Summary
    md.append("## 1. Summary\n")
    md.append(f"- Conversaciones analizadas (total): **{stats['total_conversations']}**")
    for biz, n in stats["per_business"].items():
        md.append(f"  - `{biz}`: {n} conversaciones")
    md.append(f"- Mensajes totales: **{stats['total_messages']}**")
    md.append(f"- Hot leads (score >= {HOT_LEAD_THRESHOLD}): **{stats['hot_leads']}**")
    md.append(f"- Handoffs disparados: **{stats['handoffs']}**")
    md.append(f"- Conversaciones cold (score < 20): **{stats['cold_count']}**")
    md.append(f"- Tiempo total analisis: **{elapsed:.2f}s**\n")

    if stats["total_conversations"] == 0:
        md.append("> **Aviso:** No hay conversaciones en `bots/data/conversations.db`. "
                  "El reporte se genera vacio pero el pipeline corrio sin errores. "
                  "Re-ejecuta cuando los bots hayan acumulado dialogos reales.\n")

    # 2. FAQs perdidas
    md.append("## 2. Top FAQs perdidas (por negocio)\n")
    md.append("Preguntas frecuentes del usuario que NO encuentran match (>= "
              f"{FAQ_SIMILARITY_THRESHOLD}) en `kb.faq`.\n")
    any_faq = False
    for biz, items in per_biz_missing_faqs.items():
        if not items:
            continue
        any_faq = True
        md.append(f"### `{biz}`\n")
        md.append("| # | Pregunta del usuario | Frecuencia | Mejor sim. KB |")
        md.append("|---|----------------------|------------|---------------|")
        for i, (sample, freq, sim) in enumerate(items, 1):
            safe = sample.replace("|", "\\|").replace("\n", " ")
            md.append(f"| {i} | {safe} | {freq} | {sim} |")
        md.append("\n**Sugerencia:** agregar a `kb.faq` cada pregunta con su respuesta canonica.\n")
    if not any_faq:
        md.append("_Sin preguntas no cubiertas detectadas (o sin datos suficientes)._\n")

    # 3. Objeciones recurrentes
    md.append("## 3. Objeciones recurrentes\n")
    md.append("Mensajes con cues negativos (caro / lo pensare / mas barato / etc.) "
              "que NO matchean objeciones existentes en `kb.objeciones`.\n")
    any_obj = False
    for biz, items in per_biz_objections.items():
        if not items:
            continue
        any_obj = True
        md.append(f"### `{biz}`\n")
        md.append("| # | Mensaje | Freq | Cues detectados |")
        md.append("|---|---------|------|-----------------|")
        for i, (sample, freq, cues) in enumerate(items, 1):
            safe = sample.replace("|", "\\|").replace("\n", " ")
            cues_str = ", ".join(cues[:4])
            md.append(f"| {i} | {safe} | {freq} | {cues_str} |")
        md.append("\n**Sugerencia:** agregar entry a `kb.objeciones` con respuesta tentativa.\n")
    if not any_obj:
        md.append("_Sin objeciones nuevas detectadas._\n")

    # 4. Productos sin match
    md.append("## 4. Productos/servicios mencionados sin match en KB\n")
    any_prod = False
    for biz, items in per_biz_unmatched.items():
        if not items:
            continue
        any_prod = True
        md.append(f"### `{biz}`\n")
        md.append("| Termino | Menciones |")
        md.append("|---------|-----------|")
        for term, freq in items:
            safe = term.replace("|", "\\|")
            md.append(f"| `{safe}` | {freq} |")
        md.append("")
    if not any_prod:
        md.append("_Sin terminos huerfanos detectados (umbral: >=2 menciones, sim. < "
                  f"{PRODUCT_SIMILARITY_THRESHOLD})._\n")

    # 5. Senales para scoring
    md.append("## 5. Nuevas senales propuestas para scoring\n")
    md.append("Patrones regex que aparecen mas en conversaciones hot que en cold. "
              "Considerar agregar a `lead_scoring.SCORING_RULES`.\n")
    if intent_signals:
        md.append("| Pattern | Hits en hot | Hits en cold |")
        md.append("|---------|-------------|--------------|")
        for label, hot, cold in intent_signals:
            md.append(f"| `{label}` | {hot} | {cold} |")
        md.append("")
    else:
        md.append("_Senales insuficientes; se requieren mas conversaciones hot vs cold._\n")

    # 6. Best practices
    md.append("## 6. Best practices conversacionales\n")
    md.append("### Patron en conversaciones exitosas (hot leads)\n")
    hot_ex = best_practice_examples(buckets, "hot", n=3)
    if hot_ex:
        for ex in hot_ex:
            md.append(ex + "\n")
    else:
        md.append("_Sin ejemplos: no hay hot leads aun._\n")
    md.append("### Patron en abandono (cold leads)\n")
    cold_ex = best_practice_examples(buckets, "cold", n=3)
    if cold_ex:
        for ex in cold_ex:
            md.append(ex + "\n")
    else:
        md.append("_Sin ejemplos: no hay conversaciones cold aun._\n")

    # 7. Acciones recomendadas
    md.append("## 7. Acciones recomendadas (PRIORIZADAS)\n")
    actions = []
    # KBs
    for biz, items in per_biz_missing_faqs.items():
        for sample, freq, _ in items[:2]:
            actions.append(
                f"[KB:{biz}] Agregar FAQ: \"{sample[:90]}\" (frecuencia {freq})"
            )
    for biz, items in per_biz_objections.items():
        for sample, freq, _ in items[:1]:
            actions.append(
                f"[KB:{biz}] Agregar objecion: \"{sample[:90]}\" (frecuencia {freq})"
            )

    # Scoring
    scoring_actions = []
    for label, hot, cold in intent_signals[:3]:
        scoring_actions.append(
            f"[scoring] Agregar regla `{label}` con +10 a +15 pts (hot={hot} vs cold={cold})"
        )

    # Sistema
    system_actions = []
    if stats["total_conversations"] == 0:
        system_actions.append(
            "[sistema] Activar logging de conversaciones (DB vacia). "
            "Confirmar que los bots llaman `ConversationStore.append`."
        )
    if stats["handoffs"] == 0 and stats["total_conversations"] > 0:
        system_actions.append(
            "[sistema] Revisar HANDOFF_THRESHOLD (50) - 0 handoffs detectados."
        )
    if stats["hot_leads"] == 0 and stats["total_conversations"] > 5:
        system_actions.append(
            "[sistema] Calibrar SCORING_RULES - ningun lead alcanza el umbral hot (70)."
        )
    if not any_prod and stats["total_conversations"] > 5:
        system_actions.append(
            "[sistema] Verificar deteccion de productos huerfanos - posible que regex CAPITALIZED_RE necesite ajuste."
        )

    md.append("### Top 5 cambios a hacer en KBs\n")
    if actions:
        for i, a in enumerate(actions[:5], 1):
            md.append(f"{i}. {a}")
    else:
        md.append("_(Sin sugerencias con datos actuales.)_")
    md.append("")

    md.append("### Top 3 reglas de scoring a agregar\n")
    if scoring_actions:
        for i, a in enumerate(scoring_actions, 1):
            md.append(f"{i}. {a}")
    else:
        md.append("_(Sin sugerencias con datos actuales.)_")
    md.append("")

    md.append("### Top 3 mejoras al sistema\n")
    if system_actions:
        for i, a in enumerate(system_actions[:3], 1):
            md.append(f"{i}. {a}")
    else:
        md.append("_(Sin mejoras sistemicas detectadas.)_")
    md.append("")

    md.append("---\n")
    md.append(f"_Reporte generado por `kb_trainer.py` en {elapsed:.2f}s._")
    return "\n".join(md)


# === Main ===

def main(report_date: str | None = None) -> Path:
    t0 = time.time()
    today = report_date or datetime.now().strftime("%Y-%m-%d")
    out_path = DOCS_DIR / f"KB-TRAINING-REPORT-{today}.md"

    # 1. Load todo
    kbs = load_kbs()
    rows = load_conversations()
    scores = load_leads_scores()

    groups = group_conversations(rows)
    buckets = classify_conversations(groups, scores)

    # 2. Stats
    per_business = Counter(r["business"] for r in rows)
    per_business_convos: Counter = Counter()
    for (biz, _uid) in groups.keys():
        per_business_convos[biz] += 1

    stats = {
        "total_conversations": len(groups),
        "per_business": dict(per_business_convos),
        "total_messages": len(rows),
        "hot_leads": len(buckets["hot"]),
        "handoffs": len(buckets["handoff"]),
        "cold_count": len(buckets["cold"]),
    }

    # 3. Per-business analysis (analyze conversations from hot + handoff)
    candidates = buckets["hot"] + [e for e in buckets["handoff"] if e not in buckets["hot"]]
    # Fallback: if no hot/handoff, use all conversations (for sample reports)
    if not candidates:
        candidates = buckets["all"]

    per_biz_missing_faqs: dict[str, list] = {}
    per_biz_objections: dict[str, list] = {}
    per_biz_unmatched: dict[str, list] = {}

    for biz, kb in kbs.items():
        biz_convs = [e for e in candidates if e["business"] == biz]
        kb_q = kb_faq_questions(kb)
        kb_obj = kb_objection_texts(kb)
        kb_names = kb_product_names(kb)

        per_biz_missing_faqs[biz] = find_missing_faqs(biz_convs, kb_q)
        per_biz_objections[biz] = find_recurring_objections(biz_convs, kb_obj)
        per_biz_unmatched[biz] = find_unmatched_products(biz_convs, kb_names)

    intent_signals = discover_intent_signals(buckets)

    elapsed = time.time() - t0

    md = render_report(
        stats=stats,
        per_biz_missing_faqs=per_biz_missing_faqs,
        per_biz_objections=per_biz_objections,
        per_biz_unmatched=per_biz_unmatched,
        intent_signals=intent_signals,
        buckets=buckets,
        elapsed=elapsed,
        today=today,
    )

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(md, encoding="utf-8")

    print(f"[kb_trainer] Reporte: {out_path}")
    print(f"[kb_trainer] Conversaciones={stats['total_conversations']} "
          f"hot={stats['hot_leads']} handoff={stats['handoffs']} "
          f"elapsed={elapsed:.2f}s")
    return out_path


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    # Permite override de fecha: python kb_trainer.py 2026-05-18
    report_date = sys.argv[1] if len(sys.argv) > 1 else None
    main(report_date)
