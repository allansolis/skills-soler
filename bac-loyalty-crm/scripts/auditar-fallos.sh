#!/usr/bin/env bash
# Ejecuta el plan de AUDITORIA-FALLOS.md contra la API de n8n cloud.
# Requiere: N8N_BASE_URL, N8N_API_KEY (NO el MCP token).
# Genera: auditoria-fallos-YYYY-MM-DD.csv y reporte-auditoria-YYYY-MM-DD.md
#
# Uso:
#   export N8N_BASE_URL=https://allannsolis94.app.n8n.cloud
#   export N8N_API_KEY=<api key de n8n, no la del MCP>
#   ./auditar-fallos.sh [limite=200]

set -euo pipefail

: "${N8N_BASE_URL:?Define N8N_BASE_URL}"
: "${N8N_API_KEY:?Define N8N_API_KEY (Settings -> API n8n)}"
LIMITE="${1:-200}"
HOY=$(date -u +%Y-%m-%d)
OUT_CSV="auditoria-fallos-${HOY}.csv"
OUT_MD="reporte-auditoria-${HOY}.md"

curl_n8n() {
  curl -fsS -H "X-N8N-API-KEY: ${N8N_API_KEY}" "${N8N_BASE_URL}/api/v1$1"
}

echo "[1/4] Listando workflows del workspace..."
WF_JSON=$(curl_n8n "/workflows?limit=100")
echo "$WF_JSON" | jq -r '.data[] | [.id, .name, .active] | @tsv' > /tmp/wf.tsv
echo "    $(wc -l < /tmp/wf.tsv) workflows encontrados"

echo "[2/4] Listando últimas ${LIMITE} ejecuciones fallidas..."
echo "execution_id,workflow_id,workflow_name,nodo_fallido,codigo_http,mensaje,started_at" > "$OUT_CSV"

CURSOR=""
COUNT=0
while [ "$COUNT" -lt "$LIMITE" ]; do
  Q="/executions?status=error&limit=50"
  [ -n "$CURSOR" ] && Q="${Q}&cursor=${CURSOR}"
  PAGE=$(curl_n8n "$Q")
  echo "$PAGE" | jq -r '.data[]?
    | [
        (.id // ""),
        (.workflowId // ""),
        (.workflowData.name // ""),
        ((.data.resultData.error.node.name // "") | tostring),
        (.data.resultData.error.httpCode // .data.resultData.error.status // "" | tostring),
        ((.data.resultData.error.message // "") | gsub(","; ";") | gsub("\n"; " ") | .[0:200]),
        (.startedAt // "")
      ]
    | @csv' >> "$OUT_CSV"
  CURSOR=$(echo "$PAGE" | jq -r '.nextCursor // empty')
  COUNT=$((COUNT + 50))
  [ -z "$CURSOR" ] && break
done

ROWS=$(($(wc -l < "$OUT_CSV") - 1))
echo "    $ROWS fallos exportados a $OUT_CSV"

echo "[3/4] Agregando por nodo y por mensaje..."
TOP_NODOS=$(tail -n +2 "$OUT_CSV" | awk -F',' '{ print $3 " || " $4 }' | sort | uniq -c | sort -rn | head -10)
TOP_MSGS=$(tail -n +2 "$OUT_CSV" | awk -F',' '{ print $6 }' | sed 's/^"//;s/"$//' | cut -c1-80 | sort | uniq -c | sort -rn | head -10)
TOP_CODES=$(tail -n +2 "$OUT_CSV" | awk -F',' '{ print $5 }' | sed 's/^"//;s/"$//' | sort | uniq -c | sort -rn)

echo "[4/4] Generando reporte $OUT_MD..."
cat > "$OUT_MD" <<EOF
# Reporte auditoría n8n — ${HOY}

## Resumen
- Workspace: ${N8N_BASE_URL}
- Fallos analizados: ${ROWS}
- Detalle por fila: ${OUT_CSV}

## Top 10 nodos que fallan (workflow || nodo)
\`\`\`
${TOP_NODOS}
\`\`\`

## Top 10 mensajes de error (primeros 80 chars)
\`\`\`
${TOP_MSGS}
\`\`\`

## Distribución de códigos HTTP
\`\`\`
${TOP_CODES}
\`\`\`

## Próximos pasos
1. Identifica la fila con mayor frecuencia y abre el execution_id en n8n cloud.
2. Confronta el mensaje con las hipótesis H1-H10 de \`AUDITORIA-FALLOS.md\`.
3. Aplica el fix recomendado y re-ejecuta manualmente para validar.
4. Documenta en \`CONTEXTO.md\` con fecha, causa raíz, fix.
EOF

echo ""
echo "Listo:"
echo "  CSV: $OUT_CSV"
echo "  MD : $OUT_MD"
echo ""
echo "Top nodos que fallan:"
echo "$TOP_NODOS"
