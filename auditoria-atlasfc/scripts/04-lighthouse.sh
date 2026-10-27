#!/usr/bin/env bash
# Paso 4: Lighthouse móvil y escritorio sobre URLs representativas (una a la vez, con pausa).
# Uso: ./04-lighthouse.sh [archivo-con-urls]   (por defecto: las primeras 8 de la muestra)
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules/lighthouse ] || npm i --silent
export CHROME_PATH=/opt/pw-browsers/chromium
OUT=${DATOS:-../datos}/lighthouse; mkdir -p "$OUT"
LISTA=$(mktemp)
if [ $# -gt 0 ]; then cp "$1" "$LISTA"; else head -8 "${DATOS:-../datos}/muestra-urls.txt" > "$LISTA"; fi
echo 'url,perfil,performance,accessibility,best_practices,seo,lcp_ms,cls,tbt_ms,fcp_ms,si_ms,ttfb_ms,bytes_total' > "$OUT/resumen.csv"
i=0
while read -r url; do
  [ -z "$url" ] && continue; i=$((i+1))
  for perfil in mobile desktop; do
    f="$OUT/$(printf %02d $i)-$perfil.json"
    extra=(); [ "$perfil" = desktop ] && extra=(--preset=desktop)
    npx lighthouse "$url" "${extra[@]}" --output=json --output-path="$f" --quiet \
      --chrome-flags="--headless=new --no-sandbox" --max-wait-for-load=60000 || { echo "falló $url $perfil"; continue; }
    node -e '
      const r=require(process.argv[1]); const a=r.audits, c=r.categories, s=(k)=>Math.round(a[k]?.numericValue??NaN);
      console.log([r.finalDisplayedUrl,process.argv[2],...["performance","accessibility","best-practices","seo"].map(k=>Math.round((c[k]?.score??NaN)*100)),
        s("largest-contentful-paint"),(a["cumulative-layout-shift"]?.numericValue??NaN).toFixed(3),s("total-blocking-time"),s("first-contentful-paint"),s("speed-index"),s("server-response-time"),s("total-byte-weight")].join(","))' \
      "$(realpath "$f")" "$perfil" >> "$OUT/resumen.csv"
    sleep 5
  done
done < "$LISTA"
cat "$OUT/resumen.csv"
