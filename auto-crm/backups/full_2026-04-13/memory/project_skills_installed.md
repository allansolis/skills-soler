---
name: Skills instaladas desde Desktop
description: 501 skills de "Claude Skills - 15 Minute AI" instaladas en Claude, más skill revisar-skills creada para mejora continua
type: project
---

Se instalaron 501 skills desde `C:\Users\Usuario\Desktop\Claude Skills - 15 Minute AI\` al directorio de skills de Claude.

**Ruta de skills:**
`C:\Users\Usuario\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\c81acd12-ad0c-4a22-84b8-59f2bd3c98b2\26a68468-c41b-4335-bdf8-c8861692e63f\skills\`

**Manifest:**
`...\26a68468-c41b-4335-bdf8-c8861692e63f\manifest.json`

**Total skills en manifest:** 508 (6 Anthropic + 501 usuario + 1 revisar-skills)

**Skill creada:** `revisar-skills` — revisa y mejora SKILL.md de skills existentes.

**Por qué:** Las skills deben copiarse con PowerShell (no bash), ya que bash en este entorno no escribe al filesystem real de Windows.

**How to apply:** Para agregar/modificar skills, usar `powershell.exe -ExecutionPolicy Bypass -File script.ps1` en lugar de comandos bash.
