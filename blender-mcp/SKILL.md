---
name: blender-mcp
description: Servidor MCP que conecta Blender con Claude. Permite controlar escenas 3D con lenguaje natural, crear objetos, aplicar materiales, animaciones y renderizar sin programacion. Requiere Blender 3.0+, Python 3.10+, uv, y el addon instalado en Blender.
---

# Blender MCP

Servidor MCP para controlar Blender desde Claude por @ahujasid.

## Origen
- GitHub: https://github.com/ahujasid/blender-mcp
- Licencia: MIT

## Requisitos
- Blender 3.0+
- Python 3.10+
- uv (gestor de paquetes Python)
- Claude Desktop

## Instalacion del Addon en Blender
1. Descargar `addon.py` del repositorio GitHub
2. Abrir Blender -> Edit -> Preferences -> Add-ons -> Install
3. Activar "Interface: Blender MCP"
4. Presionar N en viewport y seleccionar pestana "BlenderMCP"

## Configuracion MCP (Claude Desktop)
Agregar a `%APPDATA%\Claude\claude_desktop_config.json` (Windows) o `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["blender-mcp"]
    }
  }
}
```

## Cuando usar esta skill
- Usuario quiere crear/modificar escenas 3D con Claude
- Necesita generar objetos, materiales, luces, animaciones via lenguaje natural
- Quiere workflow 3D sin escribir codigo Blender Python manualmente

## Nota de instalacion
Esta es una configuracion de MCP, no una skill Markdown convencional. El servidor MCP se ejecuta via `uvx blender-mcp` y Claude Desktop lo invoca segun la configuracion JSON.
