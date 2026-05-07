# 🔄 Syncthing — instalado y configurado en Máquina 1

## Esta máquina (PC principal — DESKTOP-R4SVB1M)
- ✅ Syncthing v2.0.16 instalado
- ✅ Servicio corriendo (puerto 8384 GUI, 22000 sync)
- ✅ Carpeta compartida: `C:\Users\Usuario\.claude` (ID: `claude-main`)
- ✅ Panel web: http://127.0.0.1:8384

## Datos para hacer pairing con las otras 2 máquinas

**Device ID de esta PC (copiar EXACTO):**
```
YBIOV6H-PL6UYSM-Z5CHIPV-KFGQRVU-BX34C7V-Y2OEJ7K-LUNJ6ZS-U52U2QW
```

**API Key (solo si necesitas acceder remoto al panel):**
```
LPaGgm7voGzecaWyC2jJtvAx7WXqVvWn
```

**Folder ID a compartir:** `claude-main`

---

## 📲 Pasos para Máquinas 2 y 3

### Paso 1 — Instalar Syncthing

**Windows (recomendado con winget):**
```powershell
winget install Syncthing.Syncthing
```

**macOS:**
```bash
brew install syncthing && brew services start syncthing
```

**Linux:**
```bash
sudo apt install syncthing && systemctl --user enable --now syncthing.service
```

### Paso 2 — Abrir panel web
En la máquina 2 (o 3), abrir navegador: http://127.0.0.1:8384

### Paso 3 — Agregar dispositivo remoto (PC 1)
1. En el panel → botón **"Add Remote Device"**
2. Pegar el Device ID de arriba (`YBIOV6H-...-U52U2QW`)
3. Nombre: "PC Principal" (o lo que quieras)
4. Click Save

### Paso 4 — Aceptar en PC 1 (esta máquina)
Cuando la PC 2 envíe la solicitud de conexión, aparecerá un prompt en http://127.0.0.1:8384 en ESTA máquina. Click "Add Device" → "Save".

### Paso 5 — Aceptar carpeta compartida
PC 1 ofrecerá automáticamente la carpeta `claude-main` a PC 2. En PC 2 aparece un prompt "Share Folder":
- **Path en PC 2:** `C:\Users\TuUsuario\.claude` (Windows) o `~/.claude` (Mac/Linux)
- Click **"Share"**

### Paso 6 — Verificar
En ambas máquinas panel web → la carpeta debe mostrar **"Up to Date"** (verde). Si alguna dice "Out of Sync", espera — la primera vez indexa ~30s a 2 min.

### Paso 7 — Repetir para Máquina 3
Mismo proceso. Puedes elegir que PC 3 sincronice con PC 1, con PC 2, o con ambas (todos-con-todos es el patrón ideal para reseliencia).

---

## ⚠️ Consideraciones de seguridad

La carpeta `~/.claude` contiene:
- Tokens API (Anthropic, Meta Ads, etc.)
- Credenciales de MCP servers
- Historial de sesiones

**Por eso:**
- Solo comparte con **tus propias máquinas confiables**
- Nunca compartas el Device ID o API Key de Syncthing
- Si pierdes una máquina → revoca el device en panel web (Actions → Remove)
- Tokens Meta Ads expiran en 1-2h (auto-limpieza natural)

## 🔁 Comportamiento esperado

- **Cambio en PC 1** → propagado a PC 2 y PC 3 en <1 min
- **Edit simultáneo en mismas líneas** → Syncthing guarda ambas versiones con `.sync-conflict-*.md` (revisar manualmente)
- **Offline** → resume auto al reconectar
- **Sin servidor intermediario** → puro P2P encriptado

## 🧪 Test rápido
1. En PC 1 crear `~/.claude/test-sync.txt` con contenido "hola"
2. Esperar ~30s
3. En PC 2 verificar que existe `~/.claude/test-sync.txt` con mismo contenido
4. Borrar archivo de prueba en cualquier máquina

## 🛑 Para detener Syncthing
```powershell
taskkill /F /IM syncthing.exe
```
O cerrar el icono en la bandeja del sistema.

---

**Panel web de esta PC:** http://127.0.0.1:8384
