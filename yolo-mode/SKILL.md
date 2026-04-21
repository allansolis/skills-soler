---
name: yolo-mode
description: Documentacion del modo YOLO de Claude Code que deshabilita todas las confirmaciones de permisos. Permite que Claude trabaje sin interrupciones en lectura de archivos, ejecucion de comandos, creacion de carpetas y edicion de codigo. CRITICO usar con hooks de proteccion configurados.
---

# YOLO Mode (Claude en Piloto Automatico)

Modo de operacion de Claude Code sin confirmaciones interactivas.

## Activacion
```bash
claude --dangerously-skip-permissions
```

## Que hace
- Deshabilita todas las confirmaciones de permisos
- Claude trabaja sin pedir autorizacion para:
  - Lectura de archivos
  - Ejecucion de comandos shell
  - Creacion y modificacion de carpetas
  - Edicion de codigo

## ADVERTENCIA CRITICA
Activar YOLO Mode sin hooks de proteccion es peligroso. Antes de usar:

1. Configurar hooks en `~/.claude/settings.json` con reglas PreToolUse que bloqueen acciones peligrosas (exit code 2 = bloqueo)
2. Ejecutar en entornos controlados (contenedores, VMs, worktrees)
3. Nunca usar en directorios con datos criticos sin snapshot previo
4. Revisar las skills `protege-tu-app` y `update-config` antes de activar

## Hooks de proteccion minimos recomendados
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "sh -c 'grep -qE \"rm -rf|git reset --hard|git push --force\" && exit 2 || exit 0'",
        "description": "Bloquear comandos destructivos"
      }
    ]
  }
}
```

## Cuando NO usar esta skill
- Proyectos con secrets en disco sin backup
- Directorios home del usuario
- Sistemas de produccion
- Sin hooks configurados

## Cuando SI usar
- Worktrees aislados
- Contenedores Docker
- Proyectos nuevos desde cero
- Tareas de larga duracion previamente planificadas
