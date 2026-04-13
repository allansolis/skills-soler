---
name: Usar API directamente
description: Siempre usar Meta Graph API con el token para acceder a Meta Business, no pedir login en navegador
type: feedback
---

Siempre usar la Meta Graph API con el token para acceder a Meta Business, Commerce Manager, Events Manager, etc. No pedir al usuario que inicie sesion en el navegador.

**Why:** El usuario tiene un token de acceso con permisos suficientes para la mayoria de operaciones. Pedirle login es innecesario y lento.

**How to apply:** Para cualquier tarea de Meta (campanas, pixel, catalogo, audiencias, reportes), ir directo por API. Solo usar el navegador (Chrome MCP) para cosas que la API no puede hacer, como configuraciones visuales especificas.
