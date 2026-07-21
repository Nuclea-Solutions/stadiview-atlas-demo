// StadiView · Atlas — PoC de selección de asientos con datos reales del inventario de Fanki.
const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);
const nm = (s) => (s || '').replace(/\s+/g, ' ').trim();  // nombres con espacios dobles del inventario
let gaSeq = 0;                                             // ids únicos para boletos de admisión general

let DATA = null;
let cart = [];           // {key, zone, section, row, seat, price, score}
let currentSection = null;
let selectedSeat = null;

// ---- View-score model (estimación honesta a partir de datos disponibles) ----
// No tenemos coordenadas 3D reales; estimamos calidad de vista con: nivel de precio
// (proxy de ubicación), cercanía a la cancha (filas frontales) y centrado horizontal.
function priceTierScore(price, minP, maxP) {
  if (maxP === minP) return 0.7;
  return 0.45 + 0.5 * ((price - minP) / (maxP - minP)); // 0.45–0.95
}
function seatViewScore(section, rowIdx, rowCount, colIdx, colCount, priceScore) {
  // Fila: las filas se listan de atrás (arriba) hacia la cancha (abajo, índice alto).
  const proximity = rowCount > 1 ? rowIdx / (rowCount - 1) : 1; // 0 atrás → 1 frente
  // sweet spot: ni la última fila ni pegado al ras; pico ~80% hacia el frente
  const rowQ = 1 - Math.abs(proximity - 0.8) / 0.8; // 0..1
  // Centrado horizontal
  const centering = colCount > 1 ? 1 - Math.abs(colIdx - (colCount - 1) / 2) / ((colCount - 1) / 2) : 1;
  const raw = 0.55 * priceScore + 0.28 * rowQ + 0.17 * centering;
  return Math.round(Math.max(0.45, Math.min(0.99, raw)) * 100);
}
function scoreLabel(s) {
  return s >= 90 ? 'Vista excelente' : s >= 80 ? 'Vista muy buena'
       : s >= 70 ? 'Buena vista' : s >= 58 ? 'Vista regular' : 'Vista limitada';
}

// ---- Próximos partidos (rama PARTIDO) ----
const MATCHES = [
  { id: 'chivas',   opp: 'GUADALAJARA', crest: './assets/chivas-crest.png',   comp: 'LIGA MX · APERTURA 2026 · JORNADA 6',  jornada: 'J6',  date: 'SÁB 22 AGO · 21:05', tag: 'Clásico Tapatío', from: 3395 },
  { id: 'america',  opp: 'AMÉRICA',     crest: './assets/america-crest.png',  comp: 'LIGA MX · APERTURA 2026 · JORNADA 8',  jornada: 'J8',  date: 'SÁB 30 AGO · 19:00', tag: '', from: 3395 },
  { id: 'pumas',    opp: 'PUMAS',       crest: './assets/pumas-crest.png',    comp: 'LIGA MX · APERTURA 2026 · JORNADA 10', jornada: 'J10', date: 'MIÉ 17 SEP · 21:00', tag: '', from: 3395 },
  { id: 'cruzazul', opp: 'CRUZ AZUL',   crest: './assets/cruzazul-crest.png', comp: 'LIGA MX · APERTURA 2026 · JORNADA 12', jornada: 'J12', date: 'SÁB 27 SEP · 19:00', tag: '', from: 3395 },
];
let currentMatch = MATCHES[0];
const awayMarkup = (m, cls, h) => m.crest
  ? `<img class="${cls}" src="${m.crest}" alt="${m.opp}" height="${h}">`
  : `<span class="${cls === 'ms-crest' ? 'ms-badge' : 'mc-badge'}" style="box-shadow:inset 0 0 0 2px ${m.badgeColor || '#C8102E'}">${m.badge}</span>`;

// ---- Boot ----
init();
async function init() {
  const res = await fetch('./data/jalisco-matrix.json');
  DATA = await res.json();
  const minP = Math.min(...allPrices()), maxP = Math.max(...allPrices());
  DATA._minP = minP; DATA._maxP = maxP;
  $('liveCount').textContent = totalAvailable().toLocaleString('es-MX');
  renderBowl();
  renderZoneList();
  wireGlobal();
  const tipo = new URLSearchParams(location.search).get('tipo');
  if (tipo === 'abono') enterAbono();
  else if (tipo === 'partido') showMatchList();
  else showIntro();
}

// ---- Navegación entre pantallas: inicio → (abono | partidos) → compra ----
function showIntro() {
  $('introScreen').classList.remove('hidden');
  $('matchScreen').classList.add('hidden');
  $('eventStrip').classList.add('hidden');
  $('buyStage').classList.add('hidden');
  window.scrollTo(0, 0);
}
function showMatchList() {
  renderMatchList();
  $('matchScreen').classList.remove('hidden');
  $('introScreen').classList.add('hidden');
  $('eventStrip').classList.add('hidden');
  $('buyStage').classList.add('hidden');
  window.scrollTo(0, 0);
}
function enterBuyFlow() {
  $('introScreen').classList.add('hidden');
  $('matchScreen').classList.add('hidden');
  $('eventStrip').classList.remove('hidden');
  $('buyStage').classList.remove('hidden');
  showStadium();
  window.scrollTo(0, 0);
}
function enterAbono() { setMode('abono'); enterBuyFlow(); }
function enterMatch(m) { currentMatch = m; renderMatchStrip(m); setMode('partido'); enterBuyFlow(); }

function renderMatchList() {
  $('matchList').innerHTML = MATCHES.map(m => `
    <button class="match-card" data-id="${m.id}">
      <div class="mc-main">
        <div class="mc-date">${m.date}</div>
        <div class="mc-duel">
          <span class="team"><img class="mc-crest" src="./assets/atlas-crest.svg" alt="Atlas" height="30">Atlas</span>
          <span class="mc-vs">vs</span>
          <span class="team">${awayMarkup(m, 'mc-crest', 30)}${m.opp}</span>
        </div>
        ${m.tag ? `<span class="mc-tag">${m.tag}</span>` : ''}
      </div>
      <div class="mc-right">
        <span class="mc-comp">Liga MX · ${m.jornada}</span>
        <span class="mc-price">${MXN.format(m.from)}<small>desde</small></span>
        <span class="mc-go">Elegir asiento →</span>
      </div>
    </button>`).join('');
  $('matchList').querySelectorAll('.match-card').forEach(b =>
    b.addEventListener('click', () => enterMatch(MATCHES.find(m => m.id === b.dataset.id))));
}
function renderMatchStrip(m) {
  $('msComp').textContent = m.comp;
  $('msKick').textContent = m.date;
  $('msAway').innerHTML = awayMarkup(m, 'ms-crest', 46) + `<span class="ms-name">${m.opp}</span>`;
}

// ---- Dos flujos: abono (temporada) vs partido (duelo individual) ----
function setMode(mode) {
  const isMatch = mode === 'partido';
  $('stripAbono').classList.toggle('hidden', isMatch);
  $('stripMatch').classList.toggle('hidden', !isMatch);
  $('panelMeta').textContent = isMatch ? `Apertura 2026 · ${currentMatch.jornada}` : 'Clausura 26–27';
  // el mapa de asientos es el mismo estadio en ambos flujos; solo cambia el encabezado del evento
}
function allPrices() { return DATA.zones.flatMap(z => z.sections.map(s => s.price)).filter(Boolean); }
function totalAvailable() { return DATA.zones.reduce((a, z) => a + (z.available || 0), 0); }

// ---- Paleta cohesiva con la identidad Atlas (apagada/premium; el rojo Atlas queda para acciones) ----
const ZONE_COLORS = {
  ZONA_DORADA: '#C6A15B',        // San Matías — oro (premium)
  VIP: '#8C93A8',                // VIP — platino/acero (premium)
  ZONA_PREF_ORIENTE: '#A23A2E',  // Lateral Oriente — ladrillo
  PONIENTE_CENTRAL: '#C2662F',   // Poniente Central — siena
  CORNER: '#4F6D8C',             // Corner — azul acero
  ZONA_PREF_PONIENTE: '#6E8A4E', // Lateral Poniente — olivo
  ZONA_A_NORTE: '#8A5A86',       // Cabecera Norte — ciruela
  ZONA_A_SUR: '#3F7D74',         // Sur Familiar — verde azulado
  ZONA_B_PONIENTE: '#566173',    // Alta Gral. Poniente — pizarra
};
const ZONE_SHORT = {
  ZONA_DORADA: 'SAN MATÍAS', VIP: 'VIP', ZONA_PREF_ORIENTE: 'LAT. ORIENTE',
  PONIENTE_CENTRAL: 'PTE. CENTRAL', CORNER: 'CORNER', ZONA_PREF_PONIENTE: 'LAT. PONIENTE',
  ZONA_A_NORTE: 'CAB. NORTE', ZONA_A_SUR: 'SUR FAMILIAR', ZONA_B_PONIENTE: 'ALTA PONIENTE',
};
const COL = (code) => ZONE_COLORS[code] || '#5A5A5A';

// ---- Stadium bowl (elíptico, dos anillos, cancha con marcas, etiquetas con placa) ----
const SQ = 0.76; // factor de achatado vertical → forma ovalada de estadio
function renderBowl() {
  const svg = $('bowl');
  const cx = 360, cy = 292;
  const zmap = Object.fromEntries(DATA.zones.map(z => [z.code, z]));
  // Anillo interior = lower bowl (preferentes/premium); exterior = tribunas amplias.
  const inner = ['ZONA_PREF_PONIENTE','PONIENTE_CENTRAL','ZONA_DORADA','VIP','ZONA_PREF_ORIENTE','CORNER'];
  const outer = ['ZONA_B_PONIENTE','ZONA_A_NORTE','ZONA_A_SUR'];
  const ri = ringSectors(inner.map(c=>zmap[c]).filter(Boolean), cx, cy, 100, 164, -90);
  const ro = ringSectors(outer.map(c=>zmap[c]).filter(Boolean), cx, cy, 174, 250, -90);

  svg.innerHTML =
    `<g transform="translate(${cx} ${cy}) scale(1 ${SQ}) translate(${-cx} ${-cy})">${ri.paths}${ro.paths}</g>`
    + pitchSVG(cx, cy)
    + renderLabels([...ri.labels, ...ro.labels], cx, cy);

  svg.querySelectorAll('.zone-seg').forEach(el => el.addEventListener('click', () => openZone(el.dataset.code)));
}
function ringSectors(zones, cx, cy, r0, r1, startDeg) {
  const total = zones.length, gap = 2.6, span = 360 / total;
  let paths = ''; const labels = [];
  zones.forEach((z, i) => {
    const a0 = startDeg + i*span + gap/2, a1 = startDeg + (i+1)*span - gap/2;
    const mid = (a0 + a1) / 2;
    paths += `<g class="zone-seg" data-code="${z.code}"><path d="${annulusPath(cx,cy,r0,r1,a0,a1)}" fill="${COL(z.code)}"/></g>`;
    const lp = polar(cx, cy, (r0 + r1) / 2, mid);
    labels.push({ code: z.code, name: ZONE_SHORT[z.code] || z.name, price: MXN.format(z.priceFrom), color: COL(z.code), x: lp.x, y: lp.y, big: span >= 100 });
  });
  return { paths, labels };
}
// Etiquetas fuera del grupo achatado (texto sin deformar) + placa de fondo que evita el encimado.
function renderLabels(labels, cx, cy) {
  return labels.map(l => {
    const y = cy + (l.y - cy) * SQ;
    const fs = l.big ? 12.5 : 10.5, pfs = l.big ? 10 : 9;
    const w = Math.max(l.name.length * fs * 0.60, l.price.length * pfs * 0.62) + 16, h = 31;
    return `<g class="zone-lbl">
      <rect x="${(l.x - w/2).toFixed(1)}" y="${(y - h/2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="2" fill="rgba(8,6,6,.66)" stroke="${l.color}" stroke-width="1" stroke-opacity="0.85"/>
      <text class="zone-label" x="${l.x.toFixed(1)}" y="${(y-3).toFixed(1)}" text-anchor="middle" font-size="${fs}">${l.name}</text>
      <text class="zone-price" x="${l.x.toFixed(1)}" y="${(y+11).toFixed(1)}" text-anchor="middle" font-size="${pfs}">${l.price}</text>
    </g>`;
  }).join('');
}
// Cancha con marcas (sin achatar: cabe en el hueco elíptico → se ve nítida).
function pitchSVG(cx, cy) {
  const w = 152, h = 92, x = cx - w/2, y = cy - h/2, s = 'stroke="rgba(255,255,255,.28)" stroke-width="1.5" fill="none"';
  return `<g class="pitch">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#14351b" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/>
    <line x1="${cx}" y1="${y}" x2="${cx}" y2="${y+h}" ${s}/>
    <circle cx="${cx}" cy="${cy}" r="17" ${s}/>
    <rect x="${x}" y="${cy-26}" width="18" height="52" ${s}/>
    <rect x="${x+w-18}" y="${cy-26}" width="18" height="52" ${s}/>
    <text class="pitch-txt" x="${cx}" y="${cy+3}" text-anchor="middle" font-size="9">CANCHA</text>
  </g>`;
}
function polar(cx, cy, r, deg) { const a = deg * Math.PI/180; return { x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) }; }
function annulusPath(cx, cy, r0, r1, a0, a1) {
  const large = (a1 - a0) > 180 ? 1 : 0;
  const p0 = polar(cx, cy, r1, a0), p1 = polar(cx, cy, r1, a1);
  const p2 = polar(cx, cy, r0, a1), p3 = polar(cx, cy, r0, a0);
  return `M ${p0.x} ${p0.y} A ${r1} ${r1} 0 ${large} 1 ${p1.x} ${p1.y}
          L ${p2.x} ${p2.y} A ${r0} ${r0} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

// ---- Right panel: zone list ----
function renderZoneList() {
  const el = $('zoneList');
  el.innerHTML = DATA.zones.map(z => {
    const soldout = (z.available || 0) === 0;
    return `<button class="zone-item ${soldout?'soldout':''}" data-code="${z.code}" ${soldout?'disabled':''}>
      <span class="zone-dot" style="background:${COL(z.code)}"></span>
      <span class="zone-info">
        <span class="zn">${z.name}</span>
        <span class="za">${(z.available||0).toLocaleString('es-MX')} disponibles</span>
      </span>
      <span class="zone-price-tag">${MXN.format(z.priceFrom)}<small>desde</small></span>
    </button>`;
  }).join('');
  el.querySelectorAll('.zone-item').forEach(b => b.addEventListener('click', () => openZone(b.dataset.code)));
}

// ---- Zone → choose section (reuse bowl area to show section chips) ----
function openZone(code) {
  const zone = DATA.zones.find(z => z.code === code);
  if (!zone || (zone.available||0) === 0) return;
  exit3dIfNeeded();
  // dim other segments
  document.querySelectorAll('.zone-seg').forEach(s => s.classList.toggle('dim', s.dataset.code !== code));
  // show section chooser in the panel
  const panel = $('zonePanel');
  panel.classList.remove('hidden'); $('seatPanel').classList.add('hidden');
  panel.querySelector('h2').textContent = zone.name;
  panel.querySelector('.panel-note').textContent = `${MXN.format(zone.priceFrom)} · ${(zone.available||0).toLocaleString('es-MX')} disponibles · elige sección`;
  const list = $('zoneList');
  const secs = zone.sections.slice().sort((a,b)=> (b.available||0)-(a.available||0));
  list.innerHTML = secs.map(s => {
    const so = (s.available||0)===0;
    return `<button class="zone-item ${so?'soldout':''}" data-sec="${s.code}" ${so?'disabled':''}>
      <span class="zone-dot" style="background:${COL(zone.code)}"></span>
      <span class="zone-info"><span class="zn">${s.name}</span>
        <span class="za">${(s.available||0).toLocaleString('es-MX')} disponibles${s.numbered?'':' · general'}</span></span>
      <span class="zone-price-tag">${MXN.format(s.price)}</span>
    </button>`;
  }).join('');
  list.querySelectorAll('.zone-item').forEach(b => b.addEventListener('click', () => openSection(zone, b.dataset.sec)));
  setCrumbs([{label:'Estadio', nav:'stadium'}, {label:zone.name}]);
}

// ---- Section → seat grid ----
function openSection(zone, secCode) {
  const sec = zone.sections.find(s => s.code === secCode);
  if (!sec) return;
  exit3dIfNeeded();
  currentSection = { zone, sec };
  $('stadiumView').classList.add('hidden');
  $('sectionView').classList.remove('hidden');
  $('secName').textContent = `${zone.name} · ${nm(sec.name)}`;
  $('secSub').textContent = `${MXN.format(sec.price)} · ${(sec.available||0).toLocaleString('es-MX')} disponibles`;
  setCrumbs([{label:'Estadio', nav:'stadium'}, {label:zone.name, nav:'zone', code:zone.code}, {label:nm(sec.name)}]);

  const numbered = sec.numbered && sec.grid;
  $('suggestBtn').style.display = numbered ? '' : 'none';  // sin asientos → sin sugerido
  document.querySelector('.pitch-ref').style.display = numbered ? '' : 'none';
  document.querySelector('.legend').style.display = numbered ? '' : 'none';
  if (!numbered) {
    // Admisión general: sin asiento, pero se puede comprar el boleto
    $('seatPanel').classList.add('hidden');
    $('zonePanel').classList.remove('hidden');
    $('seatGrid').innerHTML = `<div class="ga-box">
      <div class="ga-t">Zona de admisión general</div>
      <div class="ga-d">Lugar libre dentro de la zona — sin asiento numerado.</div>
      <div class="ga-price">${MXN.format(sec.price)}<span>/ boleto</span></div>
      <button class="add-btn" id="gaAdd">Agregar boleto general</button>
    </div>`;
    $('gaAdd').addEventListener('click', () => addGeneral(zone, sec));
    return;
  }
  renderSeatGrid(zone, sec);
}
function addGeneral(zone, sec) {
  if (cart.length >= (DATA.maxByFan || 4)) { toast(`Máximo ${DATA.maxByFan||4} por persona`); return; }
  cart.push({ key: `${sec.code}|GA|${++gaSeq}`, zone: zone.name, section: nm(sec.name), row: 'General', seat: '—', price: sec.price, score: null });
  updateCartUI();
  toast('Boleto general agregado');
}

function renderSeatGrid(zone, sec) {
  const grid = sec.grid;
  const rowCount = grid.length;
  const pScore = priceTierScore(sec.price, DATA._minP, DATA._maxP);
  const wrap = $('seatGrid');
  let best = null;
  const frag = [];
  grid.forEach((row, ri) => {
    const cells = row.s;
    const cols = cells.length;
    let html = `<div class="seat-row"><span class="row-lbl">${row.r||''}</span>`;
    cells.forEach((cell, ci) => {
      if (cell === 0) { html += `<span class="seat gap"></span>`; return; }
      const [num, st] = cell;
      const score = seatViewScore(sec, ri, rowCount, ci, cols, pScore);
      if (st === 'A') {
        const key = `${sec.code}|${row.r}|${num}`;
        html += `<button class="seat avail" style="--seatc:${COL(zone.code)}" data-key="${key}" data-row="${row.r}" data-seat="${num}" data-score="${score}" data-price="${sec.price}" title="Fila ${row.r} · Asiento ${num} · Vista ${score}"></button>`;
        if (!best || score > best.score) best = { key, row: row.r, seat: num, score };
      } else {
        html += `<span class="seat ${st==='S'?'sold':'resv'}"></span>`;
      }
    });
    html += `</div>`;
    frag.push(html);
  });
  wrap.innerHTML = frag.join('');
  currentSection.best = best;

  wrap.querySelectorAll('.seat.avail').forEach(b => b.addEventListener('click', () => selectSeat(b)));
  // reflect cart selections
  cart.forEach(it => { const b = wrap.querySelector(`[data-key="${CSS.escape(it.key)}"]`); if (b) b.classList.add('sel'); });
}

function markSuggested() {
  const best = currentSection?.best;
  document.querySelectorAll('.seat.sug').forEach(s => s.classList.remove('sug'));
  if (best) { const b = $('seatGrid').querySelector(`[data-key="${CSS.escape(best.key)}"]`); if (b) b.classList.add('sug'); }
}

function selectSeat(btn) {
  document.querySelectorAll('.seat.sel').forEach(s => { if (!cart.find(c=>c.key===s.dataset.key)) s.classList.remove('sel'); });
  btn.classList.add('sel');
  const { zone, sec } = currentSection;
  const score = +btn.dataset.score;
  selectedSeat = { key: btn.dataset.key, zone: zone.name, section: nm(sec.name), row: btn.dataset.row, seat: btn.dataset.seat, price: +btn.dataset.price, score };
  showSeatPanel();
}

function showSeatPanel() {
  const s = selectedSeat;
  $('zonePanel').classList.add('hidden');
  $('seatPanel').classList.remove('hidden');
  $('seatBadge').textContent = s.section;
  $('seatLoc').textContent = `Fila ${s.row} · Asiento ${s.seat}`;
  $('viewScore').innerHTML = `<div class="vs-ring" style="--p:${s.score}"><b>${s.score}</b></div>
    <div class="vs-txt"><div class="vl">${scoreLabel(s.score)}</div><div class="vm">Vista estimada 0–100</div></div>`;
  $('seatPrice').textContent = MXN.format(s.price);
  const inCart = cart.some(c => c.key === s.key);
  const btn = $('addBtn');
  btn.textContent = inCart ? 'Ya está en tu carrito' : 'Agregar al carrito';
  btn.disabled = inCart;
}

// ---- Vista 3D (estadio 3D del repo base, incrustado por iframe) ----
// Mapea el precio de la zona al tier del modelo 3D: premium→0 (cerca), medio→1, general→2 (alto).
function zoneTier(price) { return price >= 15000 ? 0 : price >= 5500 ? 1 : 2; }
function open3D() {
  const s = selectedSeat; if (!s) return;
  $('v3dTitle').textContent = 'Vista 3D — ' + s.section;
  $('v3dSub').textContent = `${s.zone} · Fila ${s.row} · Asiento ${s.seat} · Vista ${s.score}`;
  $('v3dLoad').style.display = 'grid';
  const f = $('v3dFrame');
  f.onload = () => { $('v3dLoad').style.display = 'none'; try { f.contentWindow.focus(); } catch (e) {} };
  f.src = `../index.html?embed=1&enter=seat&tier=${zoneTier(s.price)}`;
  $('v3dModal').classList.remove('hidden');
  $('v3dScrim').classList.remove('hidden');
}
function close3D() {
  $('v3dModal').classList.add('hidden');
  $('v3dScrim').classList.add('hidden');
  $('v3dFrame').src = 'about:blank'; // detiene el render del 3D al cerrar
}

// ---- Cart ----
function addToCart() {
  if (!selectedSeat || cart.some(c => c.key === selectedSeat.key)) return;
  if (cart.length >= (DATA.maxByFan || 4)) { toast(`Máximo ${DATA.maxByFan||4} por persona`); return; }
  cart.push({ ...selectedSeat });
  const b = $('seatGrid').querySelector(`[data-key="${CSS.escape(selectedSeat.key)}"]`);
  if (b) b.classList.add('sel');
  updateCartUI(); showSeatPanel(); toast('Asiento agregado');
}
function removeFromCart(key) {
  cart = cart.filter(c => c.key !== key);
  const b = $('seatGrid')?.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if (b && (!selectedSeat || selectedSeat.key !== key)) b.classList.remove('sel');
  updateCartUI(); if (selectedSeat) showSeatPanel();
}
function cartTotal() { return cart.reduce((a, c) => a + c.price, 0); }
function updateCartUI() {
  $('cartCount').textContent = cart.length;
  $('cartTotal').textContent = MXN.format(cartTotal());
  $('drawerTotal').textContent = MXN.format(cartTotal());
  const items = $('drawerItems');
  if (!cart.length) { items.innerHTML = `<div class="cart-empty">Tu carrito está vacío.<br>Elige un asiento en el mapa.</div>`; return; }
  items.innerHTML = cart.map(c => `<div class="cart-item">
    <div><div class="ci-loc">${c.score === null ? `${c.section} · General` : `${c.section} · Fila ${c.row} · Asiento ${c.seat}`}</div>
      <div class="ci-sub">${c.zone}${c.score !== null ? ` · Vista ${c.score}` : ' · Admisión general'}</div></div>
    <div class="ci-price">${MXN.format(c.price)}</div>
    <button class="ci-remove" data-key="${c.key}" aria-label="Quitar">✕</button>
  </div>`).join('');
  items.querySelectorAll('.ci-remove').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.key)));
}

// ---- Navigation / crumbs ----
function setCrumbs(items) {
  const el = $('crumbs');
  el.innerHTML = items.map((it, i) => {
    const last = i === items.length - 1;
    const cls = last ? 'crumb active' : 'crumb link';
    const attr = it.nav ? `data-nav="${it.nav}" ${it.code?`data-code="${it.code}"`:''}` : '';
    return `<button class="${cls}" ${attr}>${it.label}</button>${last?'':'<span class="sep">/</span>'}`;
  }).join('');
  el.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.nav === 'stadium') showStadium();
    else if (b.dataset.nav === 'zone') { showStadium(); openZone(b.dataset.code); }
  }));
}
function showStadium() {
  if (stadiumMode === '3d') { stadiumMode = '2d'; $('stadium3dView').classList.add('hidden'); updateStadiumToggle(); }
  $('sectionView').classList.add('hidden');
  $('stadiumView').classList.remove('hidden');
  $('seatPanel').classList.add('hidden');
  $('zonePanel').classList.remove('hidden');
  $('zonePanel').querySelector('h2').textContent = 'Zonas';
  $('zonePanel').querySelector('.panel-note').textContent = 'Disponibilidad y precio reales por zona.';
  document.querySelectorAll('.zone-seg').forEach(s => s.classList.remove('dim'));
  renderZoneList();
  setCrumbs([{label:'Estadio', nav:'stadium'}]);
}

// ---- Modo de visualización del estadio: Mapa 2D vs Estadio 3D ----
let stadiumMode = '2d', last2dView = 'stadiumView';
function updateStadiumToggle() {
  document.querySelectorAll('#stadiumToggle button').forEach(b => b.classList.toggle('active', b.dataset.view === stadiumMode));
}
function setStadiumMode(v) {
  if (v === stadiumMode) return;
  if (v === '3d') {
    stadiumMode = '3d';
    last2dView = $('sectionView').classList.contains('hidden') ? 'stadiumView' : 'sectionView';
    $('stadiumView').classList.add('hidden');
    $('sectionView').classList.add('hidden');
    $('stadium3dView').classList.remove('hidden');
    const f = $('s3dFrame');
    if (!f.getAttribute('src')) {
      $('s3dLoad').style.display = 'grid';
      f.onload = () => { $('s3dLoad').style.display = 'none'; try { f.contentWindow.focus(); } catch (e) {} };
      f.src = '../index.html?embed=1';               // vista general, sin saltar a un asiento
    } else { try { f.contentWindow.focus(); } catch (e) {} }
  } else {
    stadiumMode = '2d';
    $('stadium3dView').classList.add('hidden');
    $(last2dView).classList.remove('hidden');
  }
  updateStadiumToggle();
}
const exit3dIfNeeded = () => setStadiumMode('2d');   // cualquier navegación 2D vuelve al mapa

// ---- Global wiring ----
function wireGlobal() {
  $('addBtn').addEventListener('click', addToCart);
  $('suggestBtn').addEventListener('click', () => {
    markSuggested();
    const best = currentSection?.best;
    if (best) { const b = $('seatGrid').querySelector(`[data-key="${CSS.escape(best.key)}"]`); if (b) { selectSeat(b); b.scrollIntoView({block:'center', inline:'center', behavior:'smooth'}); } }
    else toast('Sin asientos disponibles en esta sección');
  });
  const openDrawer = () => { $('drawer').classList.remove('hidden'); $('scrim').classList.remove('hidden'); };
  const closeDrawer = () => { $('drawer').classList.add('hidden'); $('scrim').classList.add('hidden'); };
  $('cartBtn').addEventListener('click', openDrawer);
  $('closeCart').addEventListener('click', closeDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  $('payBtn').addEventListener('click', () => toast(cart.length ? 'PoC: aquí seguiría el pago tokenizado' : 'Tu carrito está vacío'));
  $('pickAbono').addEventListener('click', enterAbono);
  $('pickPartido').addEventListener('click', showMatchList);
  $('matchBack').addEventListener('click', showIntro);
  $('changeEventBtn').addEventListener('click', showIntro);
  $('stadiumToggle').querySelectorAll('button').forEach(b => b.addEventListener('click', () => setStadiumMode(b.dataset.view)));
  $('v3dBtn').addEventListener('click', open3D);
  $('v3dClose').addEventListener('click', close3D);
  $('v3dScrim').addEventListener('click', close3D);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('v3dModal').classList.contains('hidden')) close3D(); });
  updateCartUI();
}

// ---- toast ----
let toastT;
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
