"""
Conversation Store — Persistencia SQLite de conversaciones de los 4 bots.

Reemplaza el dict en memoria con tabla SQLite. Beneficios:
- Sobrevive restarts de bot
- Sobrevive restart del watchdog
- Permite ver historial completo del usuario
- Soporta queries: ultimos N mensajes, by date range, by business

Schema:
    CREATE TABLE conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user','assistant')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        channel TEXT DEFAULT 'web'
    );

    CREATE INDEX idx_business_user ON conversations(business, user_id, timestamp DESC);

Uso:
    from conversation_store import ConversationStore

    store = ConversationStore('esmeraldas_soler')
    store.append(user_id='abc', role='user', content='Hola')
    store.append(user_id='abc', role='assistant', content='Hola!')

    history = store.get_history('abc', limit=20)  # [(role, content), ...]
"""
import os
import sqlite3
import threading
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "conversations.db"

_lock = threading.Lock()


def _init_db() -> None:
    """Crea tabla e indice si no existen."""
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user','assistant')),
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                channel TEXT DEFAULT 'web'
            );

            CREATE INDEX IF NOT EXISTS idx_business_user
                ON conversations(business, user_id, timestamp DESC);

            CREATE INDEX IF NOT EXISTS idx_business_recent
                ON conversations(business, timestamp DESC);
        """)
        conn.commit()
    finally:
        conn.close()


_init_db()


class ConversationStore:
    """Persistencia SQLite scoped a un business."""

    def __init__(self, business: str, max_history: int = 30):
        self.business = business
        self.max_history = max_history

    def append(self, user_id: str, role: str, content: str, channel: str = "web") -> None:
        """Agrega un mensaje al historial."""
        if role not in ("user", "assistant"):
            raise ValueError(f"role debe ser 'user' o 'assistant', got {role}")
        with _lock:
            conn = sqlite3.connect(str(DB_PATH), timeout=10)
            try:
                conn.execute(
                    "INSERT INTO conversations (business, user_id, role, content, channel) VALUES (?, ?, ?, ?, ?)",
                    (self.business, user_id, role, content, channel)
                )
                conn.commit()
            finally:
                conn.close()

    def get_history(self, user_id: str, limit: int = None) -> list:
        """Returns history como lista de dicts [{role, content, timestamp}, ...]."""
        limit = limit or self.max_history
        with _lock:
            conn = sqlite3.connect(str(DB_PATH), timeout=10)
            conn.row_factory = sqlite3.Row
            try:
                rows = conn.execute(
                    """SELECT role, content, timestamp, channel
                       FROM conversations
                       WHERE business = ? AND user_id = ?
                       ORDER BY id DESC
                       LIMIT ?""",
                    (self.business, user_id, limit)
                ).fetchall()
                # Reverse para orden cronologico (oldest first)
                return [dict(r) for r in reversed(rows)]
            finally:
                conn.close()

    def get_history_for_anthropic(self, user_id: str, limit: int = None) -> list:
        """Returns history en formato Anthropic API [{role, content}, ...]."""
        history = self.get_history(user_id, limit)
        return [{"role": h["role"], "content": h["content"]} for h in history]

    def clear_user(self, user_id: str) -> int:
        """Borra historial de un usuario. Returns rows deleted."""
        with _lock:
            conn = sqlite3.connect(str(DB_PATH), timeout=10)
            try:
                cur = conn.execute(
                    "DELETE FROM conversations WHERE business = ? AND user_id = ?",
                    (self.business, user_id)
                )
                conn.commit()
                return cur.rowcount
            finally:
                conn.close()

    def count_messages(self, user_id: str = None) -> int:
        """Count messages para un user o total del business."""
        with _lock:
            conn = sqlite3.connect(str(DB_PATH), timeout=10)
            try:
                if user_id:
                    return conn.execute(
                        "SELECT COUNT(*) FROM conversations WHERE business = ? AND user_id = ?",
                        (self.business, user_id)
                    ).fetchone()[0]
                return conn.execute(
                    "SELECT COUNT(*) FROM conversations WHERE business = ?",
                    (self.business,)
                ).fetchone()[0]
            finally:
                conn.close()

    def list_recent_users(self, limit: int = 50) -> list:
        """Returns lista de user_ids ordenados por ultima actividad."""
        with _lock:
            conn = sqlite3.connect(str(DB_PATH), timeout=10)
            conn.row_factory = sqlite3.Row
            try:
                rows = conn.execute(
                    """SELECT user_id, MAX(timestamp) as last_msg, COUNT(*) as msg_count
                       FROM conversations
                       WHERE business = ?
                       GROUP BY user_id
                       ORDER BY last_msg DESC
                       LIMIT ?""",
                    (self.business, limit)
                ).fetchall()
                return [dict(r) for r in rows]
            finally:
                conn.close()


def find_inactive_hot_leads(hours_inactive: int = 4) -> list:
    """
    Returns hot leads que no han enviado mensaje en X horas.
    Combina conversation_store con lead_scoring.

    Util para auto-followup.
    """
    try:
        import lead_scoring
    except ImportError:
        return []

    with _lock:
        conn = sqlite3.connect(str(DB_PATH), timeout=10)
        conn.row_factory = sqlite3.Row
        try:
            # Get usuarios con ultimo mensaje > hours_inactive horas atras
            rows = conn.execute(
                f"""SELECT business, user_id, MAX(timestamp) as last_msg
                    FROM conversations
                    WHERE role = 'user'
                    GROUP BY business, user_id
                    HAVING datetime(last_msg) <= datetime('now', '-{int(hours_inactive)} hours')"""
            ).fetchall()
        finally:
            conn.close()

    # Filtrar solo hot leads (score >= 70)
    result = []
    for r in rows:
        score_info = lead_scoring.get_score(r["user_id"], r["business"])
        if score_info and score_info.get("score", 0) >= lead_scoring.HOT_LEAD_THRESHOLD:
            result.append({
                "business": r["business"],
                "user_id": r["user_id"],
                "last_message_at": r["last_msg"],
                "score": score_info.get("score"),
                "messages_count": score_info.get("messages_count"),
            })

    return result


if __name__ == "__main__":
    # Self-test
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"=== Self-test conversation_store ===")
    print(f"DB: {DB_PATH}\n")

    store = ConversationStore("test_business")

    # Insert
    store.append("user_demo", "user", "Hola me llamo Maria")
    store.append("user_demo", "assistant", "Hola Maria, soy Elena")
    store.append("user_demo", "user", "Cuanto cuesta el polarizado")
    store.append("user_demo", "assistant", "Para su vehiculo, le recomiendo...")

    # Read
    history = store.get_history("user_demo")
    print(f"Historial ({len(history)} mensajes):")
    for h in history:
        print(f"  [{h['timestamp']}] {h['role']}: {h['content'][:50]}")

    # Anthropic format
    anthropic_history = store.get_history_for_anthropic("user_demo")
    print(f"\nFormato Anthropic: {len(anthropic_history)} mensajes")

    # Stats
    print(f"\nTotal mensajes business: {store.count_messages()}")
    print(f"Mensajes del user: {store.count_messages('user_demo')}")
    print(f"Usuarios recientes: {store.list_recent_users(5)}")
