#!/usr/bin/env bash
# Paso 2: curl -I (HEAD) de cada URL de la muestra, 1 por segundo. Guarda headers crudos y un CSV resumen.
set -euo pipefail
cd "${DATOS:-$(dirname "$0")/../datos}"
mkdir -p headers
UA='NucleaAuditBot/1.0 (+auditoria de solo lectura)'
echo 'url,status,server,cache_control,age,cf_cache_status,x_cache,via,content_type,hsts,csp,x_frame_options,x_content_type_options,referrer_policy,permissions_policy,ttfb_s' > headers-resumen.csv
i=0
while read -r url; do
  [ -z "$url" ] && continue
  i=$((i+1)); f="headers/$(printf %03d $i).txt"
  ttfb=$(curl -sS -I -A "$UA" -m 30 -D "$f" -o /dev/null -w '%{time_starttransfer}' "$url" || echo "")
  h() { grep -i "^$1:" "$f" | tail -1 | cut -d: -f2- | tr -d '\r,' | sed 's/^ //' ; }
  status=$(head -1 "$f" | awk '{print $2}')
  echo "$url,$status,$(h server),$(h cache-control),$(h age),$(h cf-cache-status),$(h x-cache),$(h via),$(h content-type),$( [ -n "$(h strict-transport-security)" ] && echo si || echo no),$( [ -n "$(h content-security-policy)" ] && echo si || echo no),$(h x-frame-options),$(h x-content-type-options),$(h referrer-policy),$( [ -n "$(h permissions-policy)" ] && echo si || echo no),$ttfb" >> headers-resumen.csv
  sleep 1
done < muestra-urls.txt
# Redirecciones de dominio (www, http) para el plan de cutover
for u in http://atlasfc.com.mx http://www.atlasfc.com.mx https://www.atlasfc.com.mx; do
  echo "== $u"; curl -sS -I -A "$UA" -m 20 "$u" | grep -iE '^(HTTP|location|server)'; sleep 1
done > redirecciones-dominio.txt
# DNS / TLS
{ dig +short atlasfc.com.mx A; dig +short www.atlasfc.com.mx CNAME; dig +short atlasfc.com.mx NS; } > dns.txt 2>/dev/null || true
echo "listo: $(($(wc -l < headers-resumen.csv)-1)) URLs"
