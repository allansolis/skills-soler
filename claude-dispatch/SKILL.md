---
name: claude-dispatch
description: Use when the user asks how to assign tasks to Claude from their phone, execute desktop tasks remotely, use Cowork Dispatch, or mentions "claude-dispatch". This skill is a FEATURE of Claude Desktop (not a file-based skill) — it lets you start a task on mobile that runs on your computer.
---

# Claude Dispatch (Cowork)

Claude Dispatch es una función nativa de Claude Desktop que te permite asignar tareas desde tu teléfono y ejecutarlas en tu computadora manteniendo una conversación persistente entre dispositivos.

## Qué hace

- Ejecuta tareas en tu computadora desde tu teléfono (archivos, emails, organizar carpetas)
- Mantiene contexto continuo entre mobile y desktop
- Acceso a archivos locales, servicios conectados (Slack, email, Drive), plugins instalados
- Claude realiza acciones reales, no solo responde con texto

## Requisitos

- Suscripción **Claude Pro o Max**
- Conexión a internet
- App desktop corriendo + computadora despierta
- App móvil (iOS o Android)

## Cómo activar (paso a paso)

### 1. Instalar apps
- **Desktop:** https://claude.ai/download (macOS / Windows x64)
- **iOS:** App Store → buscar "Claude"
- **Android:** Google Play → buscar "Claude"

### 2. Configurar Dispatch en la app móvil
1. Abrir app Claude en el teléfono
2. Ir a sección **Cowork**
3. Panel izquierdo → **Dispatch**
4. Tap en **"Get started"**
5. Habilitar permisos:
   - Acceso a archivos
   - Mantener computadora despierta
6. Tap **"Finish setup"** para verificar conexión

### 3. Usar
- Desde el teléfono, escribe la tarea (ej: "organiza las fotos de abril en Desktop")
- La ejecución ocurre en la computadora
- Recibes notificaciones de progreso en móvil

## Ejemplos de uso

- "Busca en mi email el PDF del contrato con ACME y mándamelo por WhatsApp"
- "Revisa el log del bot_glass.py y reinicia si está caído"
- "Organiza mis descargas por tipo de archivo"
- "Resume la reunión de ayer en Gong y mándamela a Slack"

## Referencia oficial

https://support.claude.com/en/articles/13947068-assign-tasks-to-claude-from-anywhere-in-cowork

## Nota

Esta skill es **documentativa** — la funcionalidad vive en el software de Claude Desktop, no en un SKILL.md ejecutable. Cuando el usuario pregunte cómo usar Dispatch o Cowork, usa los pasos de arriba.
