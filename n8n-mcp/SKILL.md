---
name: n8n-mcp
description: Servidor MCP que conecta Claude con n8n (plataforma de automatizacion workflow). Permite crear, editar, ejecutar y monitorear workflows de n8n directamente desde Claude. Expone nodos, ejecuciones, credenciales y validacion de workflows.
---

# n8n-MCP

Servidor MCP (Model Context Protocol) para la plataforma de automatizacion n8n.

## Origen
- GitHub: https://github.com/czlonkowski/n8n-mcp
- Instalacion oficial: `npx n8n-mcp@latest`

## Configuracion
Agregar al archivo de MCP servers de Claude (settings.json o claude_desktop_config.json):

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["-y", "n8n-mcp"],
      "env": {
        "N8N_API_URL": "https://your-n8n-instance/api",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Cuando usar esta skill
- Usuario quiere crear/editar workflows n8n desde Claude
- Necesita monitorear ejecuciones n8n
- Quiere validar configuracion de nodos antes de desplegar

## Skills n8n-mcp relacionadas ya instaladas
- n8n-mcp-skills:n8n-workflow-patterns
- n8n-mcp-skills:n8n-validation-expert
- n8n-mcp-skills:n8n-node-configuration
- n8n-mcp-skills:n8n-expression-syntax
- n8n-mcp-skills:n8n-code-javascript
- n8n-mcp-skills:n8n-code-python
- n8n-mcp-skills:n8n-mcp-tools-expert
