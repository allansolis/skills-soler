---
name: archon
description: Motor de workflows en YAML que hace procesos repetibles siguiendo playbooks definidos. Elimina la improvisacion en tareas recurrentes mediante workflows declarativos. 19k+ estrellas en GitHub por Cole Medin.
---

# Archon

Motor de workflows YAML por Cole Medin (coleam00).

## Origen
- GitHub: https://github.com/coleam00/Archon
- Instalacion macOS/Linux: `curl -fsSL https://archon.diy/install | bash`

## Cuando usar esta skill
- Usuario quiere convertir procesos en workflows repetibles
- Necesita definir playbooks YAML para automatizacion
- Busca alternativa declarativa para flujos agenticos

## Formato basico
```yaml
name: mi-workflow
steps:
  - name: paso-1
    action: ...
  - name: paso-2
    action: ...
```

## Uso
Definir workflows YAML en el directorio de Archon y ejecutarlos por nombre. Cada workflow produce resultados reproducibles.
