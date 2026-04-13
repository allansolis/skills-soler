---
name: revisar-skills
description: "Revisa y mejora automáticamente el SKILL.md de cualquier skill instalada en Claude. Úsala cuando el usuario quiera mejorar una skill existente, verificar que una skill tenga buenas instrucciones, triggers precisos, ejemplos claros, o workflow definido. También usa esta skill cuando el usuario diga 'revisa esta skill', 'mejora el SKILL.md', 'optimiza los triggers', 'la skill no funciona bien', o 'quiero mejorar cómo funciona X skill'."
---

# Revisor y Mejorador de Skills

## Propósito

Analiza el contenido de un SKILL.md y lo mejora para que Claude la active correctamente y la ejecute con mayor calidad. Una buena skill tiene descripción precisa para triggering, instrucciones claras, ejemplos concretos, y manejo de casos edge.

## Workflow

### Paso 1: Identificar la skill a revisar

Si el usuario no especificó cuál skill revisar, pregunta:
- ¿Cuál skill quieres revisar/mejorar?
- ¿Hay algún problema específico que hayas notado?

El directorio de skills está en: `C:\Users\Usuario\.claude\skills\`

### Paso 2: Leer y analizar el SKILL.md actual

Evalúa cada componente:

**Frontmatter (crítico para triggering):**
- [ ] `name`: identificador claro en kebab-case
- [ ] `description`: incluye CUÁNDO activar la skill Y QUÉ hace. Debe ser "empujona" para que Claude no subactive la skill
- [ ] La descripción NO debe ser genérica

**Cuerpo del SKILL.md:**
- [ ] Workflow o pasos claros
- [ ] Ejemplos concretos (al menos 1-2)
- [ ] Manejo de casos edge
- [ ] Formato de output especificado
- [ ] Instrucciones explican el *por qué* además del *qué*
- [ ] Longitud idealmente menos de 500 líneas

### Paso 3: Diagnosticar problemas

**CRÍTICO**: Descripción vaga, sin workflow, instrucciones contradictorias
**IMPORTANTE**: Sin ejemplos, sin manejo de edge cases, formato no especificado
**MENOR**: Redacción mejorable, podría ser más concisa

### Paso 4: Proponer y aplicar mejoras

Muestra antes vs después. Principios:
- Descripción del frontmatter debe incluir frases literales del usuario
- Reemplaza MUSTs rígidos por explicaciones del razonamiento
- Agrega ejemplos realistas y concretos
- El "por qué" es más poderoso que la instrucción sola

### Paso 5: Actualizar el archivo

Con aprobación del usuario, escribe el SKILL.md mejorado.

## Recovery

- **Skill no encontrada**: Lista skills disponibles
- **SKILL.md vacío**: Construir desde cero con entrevista
- **Revisar todas**: Procesar de a 5-10, priorizando las más débiles
