# claude-seo

Skill de Claude Code con 13 comandos que convierte a Claude en un especialista SEO completo — auditorías técnicas, reportes de contenido y un agente que arregla todo automáticamente.

## Instalación

```bash
npx skills.sh install claude-seo
```

O clonar manualmente:

```bash
git clone https://github.com/skills-sh/claude-seo .claude/skills/claude-seo
```

## Comandos disponibles

### Auditoría técnica
| Comando | Descripción |
|---------|-------------|
| `/seo-audit` | Auditoría completa: meta tags, headings, imágenes, sitemap, canonicals |
| `/seo-speed` | Performance: Core Web Vitals, imágenes, scripts bloqueantes |
| `/seo-structure` | Arquitectura: internal linking, profundidad de clicks, páginas huérfanas |
| `/seo-crawl` | Crawlability: robots.txt, noindex, redirect chains, canonicals |
| `/seo-schema` | Structured data: JSON-LD, rich snippets, errores de validación |

### Contenido y keywords
| Comando | Descripción |
|---------|-------------|
| `/seo-keywords` | Densidad, distribución y canibalización de keywords |
| `/seo-meta` | Genera title tags y meta descriptions optimizados |
| `/seo-headings` | Jerarquía H1-H6, keywords en headings, estructura |
| `/seo-content` | Thin content, duplicados, legibilidad, expansión temática |
| `/seo-images` | Alt text, formatos modernos, lazy loading, nombres de archivo |

### Reportes y automatización
| Comando | Descripción |
|---------|-------------|
| `/seo-report` | Reporte completo con puntuación y plan de acción |
| `/seo-compare` | Compara dos páginas o tu sitio vs. un competidor |
| `/seo-fix` | Agente automático que audita y corrige los problemas |

## Uso

```
/seo-audit
/seo-fix
/seo-report
/seo-meta
/seo-compare https://competidor.com/pagina
```
