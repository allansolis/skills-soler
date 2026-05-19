"""
Auto-pausa de ads con bajo performance.
Corre 1x/dia (10am) via Task Scheduler.

Criterios para pausar (cualquiera):
- Active hace >7 dias con CTR < 1%
- Active con spend > USD 50 y 0 mensajes
- Active con cost/msg > 3x el promedio de la cuenta

Reporta al log para auditoria.
"""
from __future__ import annotations
import json, os, sys
from datetime import datetime
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv()
V = "v25.0"
TOKEN = os.environ["META_ACCESS_TOKEN"]

ACCOUNTS = {
    "glass": ("act_1101364862188478", "USD"),
    "esmeraldas": ("act_1868510380157902", "CRC"),
    "autos": ("act_2385776465260628", "CRC"),
}

LOG_FILE = Path(r"C:\Users\Usuario\Documents\skills-soler\auto-crm\logs\auto-pause.log")
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

def log(msg):
    line = f"[{datetime.now().isoformat()}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def fetch_all(path, **params):
    all_data = []
    params["access_token"] = TOKEN
    url = f"https://graph.facebook.com/{V}{path}"
    next_url = None
    for _ in range(3):
        r = requests.get(next_url, timeout=30) if next_url else requests.get(url, params=params, timeout=30)
        d = r.json()
        if "error" in d: return {"error": d["error"]}
        all_data.extend(d.get("data", []))
        next_url = d.get("paging", {}).get("next")
        if not next_url: break
    return {"data": all_data}


def extract_msgs(actions):
    if not isinstance(actions, list): return 0
    return sum(int(a.get("value", 0)) for a in actions if "messaging" in a.get("action_type", ""))


def pause_campaign(camp_id):
    r = requests.post(
        f"https://graph.facebook.com/{V}/{camp_id}",
        data={"status": "PAUSED", "access_token": TOKEN},
        timeout=30,
    )
    return r.json()


def main():
    log("=== AUTO-PAUSE START ===")

    for label, (acct_id, currency) in ACCOUNTS.items():
        log(f"\n--- {label} ({acct_id}) ---")

        res = fetch_all(
            f"/{acct_id}/campaigns",
            fields="id,name,effective_status,created_time,insights.date_preset(last_7d){spend,impressions,clicks,ctr,actions}",
            limit=100,
        )
        if "error" in res:
            log(f"  ERROR: {res['error']}")
            continue

        active = [c for c in res["data"] if c.get("effective_status") == "ACTIVE"]
        log(f"  {len(active)} campanas activas")

        # Calcular promedio cost/msg para esta cuenta
        all_costs = []
        for c in active:
            ins = c.get("insights", {}).get("data", [{}])
            ins = ins[0] if ins else {}
            spend = float(ins.get("spend", 0))
            msgs = extract_msgs(ins.get("actions", []))
            if msgs > 0:
                all_costs.append(spend / msgs)

        avg_cost_per_msg = sum(all_costs) / len(all_costs) if all_costs else 0
        threshold_cost = avg_cost_per_msg * 3 if avg_cost_per_msg > 0 else 999999

        paused_count = 0
        for c in active:
            ins = c.get("insights", {}).get("data", [{}])
            ins = ins[0] if ins else {}
            spend = float(ins.get("spend", 0))
            impr = int(ins.get("impressions", 0))
            clicks = int(ins.get("clicks", 0))
            msgs = extract_msgs(ins.get("actions", []))
            ctr = 100.0 * clicks / impr if impr else 0
            cost_per_msg = spend / msgs if msgs else 0

            # Edad de la campana
            created = datetime.fromisoformat(c["created_time"].replace("Z", "+00:00"))
            age_days = (datetime.now(created.tzinfo) - created).days

            reason = None
            if age_days > 7 and impr > 1000 and ctr < 1.0:
                reason = f"CTR {ctr:.2f}% < 1% (edad {age_days}d, impr {impr})"
            elif spend > 50 and msgs == 0 and age_days > 3:
                threshold = "USD 50" if currency == "USD" else "CRC 30000"
                if (currency == "USD" and spend > 50) or (currency == "CRC" and spend > 30000):
                    reason = f"Sin mensajes con spend significativo ({spend:.0f} {currency})"
            elif msgs >= 3 and cost_per_msg > threshold_cost:
                reason = f"Cost/msg {cost_per_msg:.0f} > 3x avg ({avg_cost_per_msg:.0f})"

            if reason:
                name_clean = c["name"][:50].encode("ascii", "replace").decode("ascii")
                log(f"  PAUSANDO: {name_clean} | {reason}")
                result = pause_campaign(c["id"])
                if result.get("success"):
                    paused_count += 1
                else:
                    log(f"    FAIL: {result}")

        log(f"  Total pausadas: {paused_count}")

    log("=== AUTO-PAUSE END ===\n")


if __name__ == "__main__":
    main()
