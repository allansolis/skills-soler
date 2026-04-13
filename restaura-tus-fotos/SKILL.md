---
name: restaura-tus-fotos
description: Restaura fotos antiguas usando NanoBanana MCP Server + Google Gemini
trigger_keywords:
  - restaurar foto
  - restaurar imagen
  - foto antigua
  - mejorar foto
  - photo restoration
  - nanobanana
  - enhance image
---

# Restaura tus Fotos con NanoBanana MCP Server

Restaura y mejora fotos antiguas usando IA (Google Gemini) mediante el MCP Server de NanoBanana.

## Instalacion

```bash
# Instalar el servidor MCP
uvx nanobanana-mcp-server@latest
```

### Configurar API Key de Google Gemini

1. Ir a [Google AI Studio](https://aistudio.google.com/apikey)
2. Crear una API key
3. Configurar variable de entorno:

```bash
export GEMINI_API_KEY="tu-api-key-aqui"
```

### Agregar a Claude Desktop (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "nanobanana": {
      "command": "uvx",
      "args": ["nanobanana-mcp-server@latest"],
      "env": {
        "GEMINI_API_KEY": "tu-api-key-aqui"
      }
    }
  }
}
```

## Uso - Prompt de Restauracion

```
Restaura esta foto antigua. Mejora la nitidez, corrige colores desvanecidos,
repara danos visibles y mejora la resolucion general manteniendo el caracter
original de la imagen.
```

## Configuracion de Salida

- **Formato**: PNG (maxima calidad) o JPEG
- **Directorio de salida**: Mismo directorio que la imagen original, con sufijo `_restored`
- **Ejemplo**: `foto_1980.jpg` → `foto_1980_restored.png`

## Repositorio

- GitHub: [zhongweili/nanobanana-mcp-server](https://github.com/zhongweili/nanobanana-mcp-server)
- Tecnologia: Python + Google Gemini API
- Licencia: Open source
