'use strict';

const state = {
  lat: null, lon: null, city: 'Tu ubicación',
  temp: null, feels: null, uv: null,
  humidity: null, wind: null, clouds: null,
  sunrise: null, sunset: null,
  forecast: [], hourly: [],
  unit: 'C', skinType: 2,
  accent: '#FF6B00', accentGrad: 'linear-gradient(135deg,#FF6B00,#FFB347)', accentName: 'Naranja solar',
  theme: 'light', fontSize: 'md',
  accounts: [{name:'Juan Solis', initials:'JS'}],
  alerts: 0, days: 1, lastUpdate: null,
  toggles: {tog1:true,tog2:true,tog3:false,tog4:true},
  history: [], alertLog: [],
  notifPermission: 'default',
  lastNotified: {uv:0, heat:false, daily:null, clouds:null},
  windGust: null, windDir: null,
  air: null,
  community: [],
  reminders: [],
  lastReminderMinute: null,
  compareCities: [],
  emergencyPhone: '',
  kidsMode: false
};

const WIND_TAG = ['N','NE','E','SE','S','SO','O','NO'];
const BEAUFORT = [
  {max:1,  name:'Calma',        desc:'El humo sube casi vertical'},
  {max:5,  name:'Ventolina',    desc:'Apenas se mueven las hojas'},
  {max:11, name:'Brisa muy débil', desc:'Se sienten las hojas moverse'},
  {max:19, name:'Brisa débil',  desc:'Hojas y ramitas en movimiento'},
  {max:28, name:'Brisa moderada', desc:'Se levanta polvo y papeles'},
  {max:38, name:'Brisa fresca', desc:'Árboles pequeños se balancean'},
  {max:49, name:'Brisa fuerte', desc:'Ramas grandes en movimiento'},
  {max:61, name:'Viento fuerte', desc:'Dificulta caminar contra el viento'},
  {max:74, name:'Temporal',     desc:'Daños leves en estructuras'},
  {max:88, name:'Temporal fuerte', desc:'Daños moderados, árboles caídos'},
  {max:102,name:'Temporal duro',desc:'Daños considerables'},
  {max:117,name:'Tempestad',    desc:'Daños extensos, muy peligroso'},
  {max:999,name:'Huracán',      desc:'Devastación total'},
];
const ACTIVITY_TAGS = [
  {icon:'🏖️', name:'Playa / piscina', calc:(uv,t,w)=> uv>=9 ? 'evitar' : uv>=6 ? 'ok' : t<18 ? 'evitar' : 'ideal'},
  {icon:'🏃', name:'Correr / trotar', calc:(uv,t,w)=> t>=32||uv>=9 ? 'evitar' : (t>=27||uv>=7) ? 'ok' : 'ideal'},
  {icon:'🚴', name:'Ciclismo',        calc:(uv,t,w)=> w>=35 ? 'evitar' : (t>=32||uv>=9) ? 'evitar' : (t>=27||uv>=7) ? 'ok' : 'ideal'},
  {icon:'🧺', name:'Picnic / parque', calc:(uv,t,w)=> uv>=9 ? 'evitar' : uv>=6 ? 'ok' : 'ideal'},
  {icon:'🎣', name:'Pesca',           calc:(uv,t,w)=> uv>=10 ? 'evitar' : 'ideal'},
  {icon:'🌱', name:'Jardinería',      calc:(uv,t,w)=> (t>=33||uv>=9) ? 'evitar' : (t>=28||uv>=6) ? 'ok' : 'ideal'},
  {icon:'🥾', name:'Senderismo',      calc:(uv,t,w)=> (t>=32||uv>=9) ? 'evitar' : (t>=26||uv>=6) ? 'ok' : 'ideal'},
  {icon:'📸', name:'Fotografía exterior', calc:(uv,t,w)=> uv>=10 ? 'ok' : 'ideal'},
];
const ACT_LABELS = {ideal:{txt:'✅ Ideal',bg:'#E8F5E9',c:'#1B5E20'}, ok:{txt:'⚡ Aceptable',bg:'#FFFDE7',c:'#F57F17'}, evitar:{txt:'⛔ Evitar',bg:'#FFEBEE',c:'#B71C1C'}};
const COMMUNITY_TAGS = ['☀️ Sol fuerte','🌤️ Templado','☁️ Nublado','🌧️ Lluvia','🥵 Mucho calor','💨 Viento fuerte'];

const PALETTES = [
  {solid:'#FF6B00', grad:'linear-gradient(135deg,#FF6B00,#FFB347)', name:'Naranja solar'},
  {solid:'#1565C0', grad:'linear-gradient(135deg,#1565C0,#42A5F5)', name:'Azul océano'},
  {solid:'#2E7D32', grad:'linear-gradient(135deg,#2E7D32,#66BB6A)', name:'Verde naturaleza'},
  {solid:'#6A1B9A', grad:'linear-gradient(135deg,#6A1B9A,#AB47BC)', name:'Violeta'},
  {solid:'#00838F', grad:'linear-gradient(135deg,#00838F,#4DD0E1)', name:'Cian'},
  {solid:'#C62828', grad:'linear-gradient(135deg,#C62828,#EF5350)', name:'Rojo alerta'},
  {solid:'#4E342E', grad:'linear-gradient(135deg,#4E342E,#8D6E63)', name:'Café tierra'},
  {solid:'#37474F', grad:'linear-gradient(135deg,#37474F,#78909C)', name:'Gris pizarra'},
];

const SKIN_TYPES = ['Tipo I','Tipo II','Tipo III','Tipo IV','Tipo V','Tipo VI'];
const SKIN_MED   = [67, 100, 200, 300, 400, 500];
const FS_NAMES   = {sm:'Pequeño', md:'Normal', lg:'Grande', xl:'Extra grande'};

let uvMap = null, mapLayerGroup = null;

/* ── BOOT ── */
window.addEventListener('load', () => {
  loadState();
  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    initApp();
  }, 2500);
});

function initApp() {
  updateClock();
  setInterval(updateClock, 1000);
  buildPalette();
  renderAccounts();
  applyTheme(state.theme, false);
  applyFontSize(state.fontSize, false);
  applyAccent(state.accent, state.accentGrad, false);
  const ephone = document.getElementById('emergency-phone');
  if (ephone && state.emergencyPhone) ephone.value = state.emergencyPhone;
  updateNotifStatus();
  setupKeyboardActivation();
  getLocation();
  trackDays();
  renderHistorial();
  renderConsejos();
  buildCommunityTags();
  renderCommunity();
  renderReminders();
  // revisa recordatorio diario y recordatorios personalizados cada minuto
  setInterval(checkDailySummary, 60000);
  setInterval(checkReminders, 60000);
  checkReminders();
  renderCompareList();
  applyKidsMode(state.kidsMode, false);
  handleShortcutParam();
}

/* ── Accesos directos (manifest shortcuts) ── */
function handleShortcutParam() {
  const params = new URLSearchParams(window.location.search);
  const target = params.get('screen');
  if (target) setTimeout(() => goTo(target), 300);
}

/* ── ACCESIBILIDAD: activar role="button"/radio/switch con teclado ── */
function setupKeyboardActivation() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target;
    if (el && el.matches && el.matches('[role="button"],[role="radio"],[role="switch"]')) {
      e.preventDefault();
      el.click();
    }
  });
}

/* ── CLOCK ── */
function updateClock() {
  document.getElementById('topbar-time').textContent =
    new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}

/* ── LOCATION ── */
function getLocation() {
  if (!navigator.geolocation) { useFallback(); return; }
  navigator.geolocation.getCurrentPosition(
    pos => { state.lat = pos.coords.latitude.toFixed(4); state.lon = pos.coords.longitude.toFixed(4); fetchWeather(); },
    () => useFallback()
  );
}
function useFallback() {
  state.lat = -8.1116; state.lon = -79.0287; state.city = 'Trujillo, PE';
  fetchWeather();
}

/* ── FETCH WEATHER (Open-Meteo, sin API key) ── */
async function fetchWeather() {
  updateAlertBar('🔄 Obteniendo datos del clima...');
  try {
    const [wRes, gRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover&hourly=uv_index,temperature_2m&daily=uv_index_max,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`),
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${state.lat}&lon=${state.lon}&format=json`)
    ]);
    const w = await wRes.json();
    const g = await gRes.json();

    if (g.address) {
      const c = g.address.city || g.address.town || g.address.village || g.address.county || 'Tu ciudad';
      const cc = g.address.country_code ? g.address.country_code.toUpperCase() : '';
      state.city = c + (cc ? ', ' + cc : '');
    }

    const cur = w.current;
    const prevClouds = state.clouds;
    state.temp   = Math.round(cur.temperature_2m);
    state.feels  = Math.round(cur.apparent_temperature);
    state.humidity = Math.round(cur.relative_humidity_2m);
    state.wind   = Math.round(cur.wind_speed_10m);
    state.windGust = Math.round(cur.wind_gusts_10m ?? cur.wind_speed_10m);
    state.windDir = Math.round(cur.wind_direction_10m ?? 0);
    state.clouds = Math.round(cur.cloud_cover);

    const now = new Date();
    const hIdx = w.hourly.time.findIndex(t => new Date(t) >= now);
    state.uv = Math.round(w.hourly.uv_index[Math.max(0, hIdx)] || 0);

    state.sunrise = w.daily.sunrise?.[0] ? fmtTime(w.daily.sunrise[0]) : '--';
    state.sunset  = w.daily.sunset?.[0]  ? fmtTime(w.daily.sunset[0])  : '--';

    state.hourly = [];
    for (let i = 0; i < 12; i++) {
      const idx = hIdx + i;
      if (idx < w.hourly.uv_index.length) {
        const h = (now.getHours() + i) % 24;
        state.hourly.push({label: fmtHour(h), uv: Math.round(w.hourly.uv_index[idx] || 0)});
      }
    }

    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    state.forecast = [];
    for (let i = 0; i < Math.min(7, w.daily.uv_index_max.length); i++) {
      const d = new Date(w.daily.time[i]);
      state.forecast.push({
        day: i === 0 ? 'Hoy' : days[d.getDay()],
        uv: Math.round(w.daily.uv_index_max[i] || 0),
        maxT: Math.round(w.daily.temperature_2m_max[i]),
        minT: Math.round(w.daily.temperature_2m_min[i])
      });
    }

    state.lastUpdate = now;
    state.alerts++;
    renderAll();
    logReading();
    checkAndNotify(prevClouds);
    saveState();
    fetchAirQuality();
  } catch(e) {
    updateAlertBar('⚠️ Error de conexión. Reintentando...');
  }
}

/* ── CALIDAD DEL AIRE (Open-Meteo Air Quality, sin API key) ── */
async function fetchAirQuality() {
  if (!state.lat) return;
  try {
    const r = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${state.lat}&longitude=${state.lon}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide&timezone=auto`);
    const d = await r.json();
    const c = d.current || {};
    state.air = {
      aqi: Math.round(c.us_aqi ?? 0),
      pm25: Math.round(c.pm2_5 ?? 0),
      pm10: Math.round(c.pm10 ?? 0),
      o3: Math.round(c.ozone ?? 0),
      no2: Math.round(c.nitrogen_dioxide ?? 0),
      co: Math.round(c.carbon_monoxide ?? 0),
    };
    renderAirQuality();
  } catch(e) { /* silencioso: el aire es un extra, no bloquea el resto de la app */ }
}

function refreshData() { fetchWeather(); showToast('Actualizando...'); }

function fmtTime(iso) { return new Date(iso).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}); }
function fmtHour(h) { return h === 0 ? '12am' : h < 12 ? h+'am' : h === 12 ? '12pm' : (h-12)+'pm'; }

/* ── RENDER ALL ── */
function renderAll() {
  document.getElementById('topbar-loc').textContent = state.city;
  document.getElementById('profile-city').textContent = state.city;
  renderAlertBar();
  renderThermometer();
  renderTempDisplay();
  renderUV();
  renderHoraChart();
  renderAlerts();
  renderLocalConditions();
  renderForecast();
  renderSafeTime();
  renderRecommendations();
  renderProfileHeader();
  renderConsejos();
  renderWind();
  renderSky();
  renderActivities();
  renderStats();
  checkEmergencyCard();
  renderKidsBanner();
  document.body.classList.toggle('night-mode', isNightNow());
}

function renderAlertBar() {
  const uv = state.uv;
  let msg = 'Cargando...';
  if (uv !== null) {
    if (uv <= 2)  msg = `✅ UV bajo (${uv}) — Disfruta el sol con precaución`;
    else if(uv<=5) msg = `⚡ UV moderado (${uv}) — Usa protector solar`;
    else if(uv<=7) msg = `⚠️ UV alto (${uv}) — Protección obligatoria`;
    else if(uv<=10)msg = `🚨 UV muy alto (${uv}) — Evita exposición 10am–3pm`;
    else           msg = `🔴 UV EXTREMO (${uv}) — Quédate bajo techo`;
  }
  document.getElementById('alertbar-text').textContent = msg;
}

function updateAlertBar(msg) { document.getElementById('alertbar-text').textContent = msg; }

function renderThermometer() {
  if (state.temp === null) return;
  const fillH = Math.min(150, Math.max(0, Math.round((state.temp - 20) / 36 * 150)));
  const fillY = 160 - fillH;
  const m = document.getElementById('mercury');
  m.setAttribute('y', Math.max(10, fillY));
  m.setAttribute('height', fillH);
  const col = state.temp >= 44 ? '#B71C1C' : state.temp >= 36 ? '#E65100' : state.temp >= 28 ? '#FF6B00' : '#2196F3';
  m.setAttribute('fill', col);
}

function renderTempDisplay() {
  if (state.temp === null) return;
  const u = state.unit === 'C' ? '°C' : '°F';
  const t = state.unit === 'C' ? state.temp : Math.round(state.temp*9/5+32);
  const f = state.unit === 'C' ? state.feels: Math.round(state.feels*9/5+32);
  document.getElementById('temp-display').textContent = `${t}${u}`;
  document.getElementById('feels-like').textContent = `Sensación: ${f}${u}`;
  document.getElementById('last-update').textContent = state.lastUpdate
    ? `Última act.: ${fmtTime(state.lastUpdate)}` : '';
}

function renderUV() {
  if (state.uv === null) return;
  const uv = state.uv;
  document.getElementById('uv-number').textContent = uv;
  let badge='', style='';
  if(uv<=2){badge='✅ Bajo';style='background:#E8F5E9;color:#1B5E20';}
  else if(uv<=5){badge='⚡ Moderado';style='background:#FFFDE7;color:#F57F17';}
  else if(uv<=7){badge='⚠️ Alto';style='background:#FFF3E0;color:#E65100';}
  else if(uv<=10){badge='🚨 Muy alto';style='background:#FBE9E7;color:#BF360C';}
  else{badge='🔴 Extremo';style='background:#FCE4EC;color:#880E4F';}
  const el=document.getElementById('uv-badge');
  el.textContent=badge; el.style.cssText=style;
}

const uvCol = v => v<=2?'#4CAF50':v<=5?'#FFEB3B':v<=7?'#FF9800':v<=10?'#F44336':'#9C27B0';

/* Escala continua de color por temperatura, tipo mapa de calor */
function tempColor(t) {
  const stops = [
    {t:10, c:[33,150,243]},   // azul frío
    {t:20, c:[76,175,80]},    // verde templado
    {t:28, c:[255,193,7]},    // amarillo cálido
    {t:36, c:[255,87,34]},    // naranja caliente
    {t:44, c:[183,28,28]},    // rojo extremo
  ];
  if (t <= stops[0].t) return rgb(stops[0].c);
  if (t >= stops[stops.length-1].t) return rgb(stops[stops.length-1].c);
  for (let i=0;i<stops.length-1;i++){
    const a=stops[i], b=stops[i+1];
    if (t>=a.t && t<=b.t){
      const p=(t-a.t)/(b.t-a.t);
      const c=a.c.map((v,idx)=>Math.round(v+(b.c[idx]-v)*p));
      return rgb(c);
    }
  }
  return rgb(stops[2].c);
}
function rgb(c){return `rgb(${c[0]},${c[1]},${c[2]})`;}

function renderHoraChart() {
  document.getElementById('hora-chart').innerHTML = state.hourly.map(h=>{
    const p=Math.round((h.uv/11)*100);
    return `<div class="bar-row">
      <div class="bar-lbl">${h.label}</div>
      <div class="bar-bg"><div class="bar-fill" style="width:${p}%;background:${uvCol(h.uv)}"></div></div>
      <div class="bar-val">UV ${h.uv}</div></div>`;
  }).join('') || '<p style="font-size:11px;color:var(--text3)">Sin datos</p>';
}

function renderAlerts() {
  const uv=state.uv, t=state.temp;
  const list=[];
  if(uv!==null){
    if(uv>=8) list.push({c:'#E53935',txt:`UV ${uv} — Protección máxima requerida`,tm:'Ahora · Prioridad alta'});
    if(t>=33)  list.push({c:'#FF9800',txt:`${t}°C — Riesgo de golpe de calor`,tm:'Ahora · Bebe agua'});
    list.push({c:'#2196F3',txt:'Mejor hora al exterior: 6–8am',tm:'Condiciones favorables'});
  }
  if(!list.length) list.push({c:'#4CAF50',txt:'Sin alertas críticas',tm:'Todo tranquilo'});
  document.getElementById('alerts-list').innerHTML = list.map(a=>
    `<div class="alert-item"><div class="adot" style="background:${a.c}" aria-hidden="true"></div>
    <div><div class="atext">${a.txt}</div><div class="atime">${a.tm}</div></div></div>`
  ).join('');
}

function renderLocalConditions() {
  document.getElementById('local-conditions').innerHTML = `
    <div class="mrow"><span class="mlabel">💧 Humedad</span><span class="mval">${state.humidity??'--'}%</span></div>
    <div class="mrow"><span class="mlabel">💨 Viento</span><span class="mval">${state.wind??'--'} km/h</span></div>
    <div class="mrow"><span class="mlabel">☁️ Nubosidad</span><span class="mval">${state.clouds??'--'}%</span></div>
    <div class="mrow"><span class="mlabel">🌅 Amanecer</span><span class="mval">${state.sunrise||'--'}</span></div>
    <div class="mrow"><span class="mlabel">🌇 Puesta</span><span class="mval">${state.sunset||'--'}</span></div>`;
}

function renderForecast() {
  document.getElementById('forecast-list').innerHTML = state.forecast.map((d,i)=>{
    const p=Math.round((d.uv/11)*100), c=uvCol(d.uv);
    return `<div class="frow" style="${i===0?'font-weight:700':''}">
      <div class="fday">${d.day}</div>
      <div class="fbar-bg"><div class="fbar-fill" style="width:${p}%;background:${c}"></div></div>
      <div class="fval" style="color:${c}">${d.uv} UV</div></div>`;
  }).join('') || '<p style="font-size:11px;color:var(--text3)">Sin datos</p>';
}

function renderSafeTime() {
  const uv=state.uv, med=SKIN_MED[state.skinType-1]||100;
  const mins=uv>0?Math.round(med/(uv*3.5)):999;
  const txt=mins>=60?Math.round(mins/60)+' h':mins+' min';
  document.getElementById('safe-time').textContent=txt;
  document.getElementById('skin-label-home').textContent=SKIN_TYPES[state.skinType-1];
  document.getElementById('fps-list').innerHTML=[15,30,50].map(f=>{
    const t=mins*f; const s=t>=120?Math.round(t/60)+' h':t+' min';
    return `<div class="fps-row"><span style="color:var(--text2)">Con FPS ${f}</span><span style="font-weight:700;color:#2E7D32">${s}</span></div>`;
  }).join('');
}

function renderRecommendations() {
  const uv=state.uv;
  let rec='Obteniendo recomendaciones...';
  if(uv!==null){
    if(uv<=2) rec='☀️ UV bajo. Puedes salir sin protección especial. Hidrátate bien.';
    else if(uv<=5) rec='🧴 Aplica FPS 15–30. Usa gafas de sol. Disfruta con moderación.';
    else if(uv<=7) rec='🧴 FPS 30+ obligatorio. Sombrero de ala ancha. Busca sombra al mediodía.';
    else if(uv<=10) rec='🚨 FPS 50+ cada 2 horas. Manga larga. Evita sol 10am–3pm. Hidrátate constantemente.';
    else rec='⛔ UV extremo. Quédate bajo techo si puedes. Si sales: FPS 50+, ropa protectora total, sombrero y gafas UV400.';
  }
  document.getElementById('rec-box').textContent=rec;
}

function renderProfileHeader() {
  document.getElementById('stat-days').textContent=state.days;
  document.getElementById('stat-accounts').textContent=state.accounts.length;
  document.getElementById('stat-alerts').textContent=state.alerts;
}

/* ══════════════ CALIDAD DEL AIRE (render) ══════════════ */
function renderAirQuality() {
  const el = document.getElementById('aq-gauge');
  if (!el || !state.air) return;
  const aqi = state.air.aqi;
  let color, label, desc;
  if (aqi<=50){color='#4CAF50';label='✅ Buena';desc='La calidad del aire es satisfactoria. Puedes disfrutar actividades al aire libre con normalidad.';}
  else if(aqi<=100){color='#FFEB3B';label='⚡ Moderada';desc='Aceptable para la mayoría, pero personas sensibles podrían notar molestias leves.';}
  else if(aqi<=150){color='#FF9800';label='⚠️ Dañina p/sensibles';desc='Niños, adultos mayores y personas con asma deberían reducir el esfuerzo prolongado al aire libre.';}
  else if(aqi<=200){color='#F44336';label='🚨 Dañina';desc='Todos podrían notar efectos. Evita esfuerzo prolongado al aire libre.';}
  else if(aqi<=300){color='#9C27B0';label='🔴 Muy dañina';desc='Riesgo de salud elevado. Limita el tiempo al aire libre.';}
  else {color='#7B1F1F';label='☠️ Peligrosa';desc='Alerta sanitaria. Evita salir; usa mascarilla si es indispensable.';}

  el.textContent = aqi || '--';
  el.style.background = `conic-gradient(${color} 0 100%)`;
  const badge = document.getElementById('aq-badge');
  badge.textContent = label; badge.style.background = color+'22'; badge.style.color = color;
  document.getElementById('aq-desc').textContent = desc;

  document.getElementById('aq-pollutants').innerHTML = [
    ['PM2.5', state.air.pm25, 'µg/m³'], ['PM10', state.air.pm10, 'µg/m³'],
    ['Ozono (O₃)', state.air.o3, 'µg/m³'], ['NO₂', state.air.no2, 'µg/m³'], ['CO', state.air.co, 'µg/m³']
  ].map(([n,v,u])=>`<div class="pollutant-row"><span class="pollutant-name">${n}</span><span class="pollutant-val">${v} ${u}</span></div>`).join('');

  document.getElementById('aq-rec').textContent = aqi<=100
    ? 'Buen momento para ventilar tu casa y hacer ejercicio al aire libre.'
    : 'Considera mantener ventanas cerradas en horas pico y usar mascarilla si eres sensible.';
}

/* ══════════════ VIENTO (render) ══════════════ */
function renderWind() {
  const el = document.getElementById('wind-speed');
  if (!el) return;
  document.getElementById('wind-speed').textContent = (state.wind ?? '--') + ' km/h';
  const dirTxt = state.windDir !== null ? WIND_TAG[Math.round(state.windDir/45)%8] : '--';
  document.getElementById('wind-dir').textContent = `Dirección: ${dirTxt} (${state.windDir ?? '--'}°)`;
  document.getElementById('wind-gust').textContent = `Ráfagas: ${state.windGust ?? '--'} km/h`;
  const arrow = document.getElementById('wind-arrow');
  if (arrow && state.windDir !== null) arrow.style.transform = `rotate(${state.windDir}deg)`;

  const w = state.wind ?? 0;
  document.getElementById('wind-beaufort').innerHTML = BEAUFORT.map((b,i)=>{
    const isCurrent = w <= b.max && (i===0 || w > BEAUFORT[i-1].max);
    return `<div class="beaufort-row${isCurrent?' current':''}"><span class="beaufort-n">${i}</span><span style="flex:1">${b.name} — ${b.desc}</span></div>`;
  }).join('');
}

/* ══════════════ RADAR / CIELO ANIMADO (render) ══════════════ */
function renderSky() {
  const el = document.getElementById('sky-clouds');
  if (!el) return;
  const clouds = state.clouds ?? 0;
  document.getElementById('sky-clouds').textContent = clouds + '%';
  const isNight = isNightNow();
  document.getElementById('sky-body').textContent = isNight ? '🌙' : '☀️';
  document.getElementById('sky-view').classList.toggle('is-night', isNight);
  document.querySelectorAll('.sky-cloud').forEach((c,i)=>{
    c.style.opacity = clouds < 15 ? '0.15' : clouds < 50 ? '0.55' : '0.95';
  });
  document.getElementById('sky-hint').textContent = clouds < 15
    ? 'Cielo despejado — ideal para actividades al aire libre.'
    : clouds < 60 ? 'Parcialmente nublado.' : 'Cielo muy nublado en tu zona.';
}
function isNightNow() {
  if (!state.sunrise || !state.sunset) return false;
  const now = new Date().toLocaleTimeString('es-PE',{hour12:false});
  return now < state.sunrise || now > state.sunset;
}

/* ══════════════ ACTIVIDADES (render) ══════════════ */
function renderActivities() {
  const el = document.getElementById('activities-list');
  if (!el) return;
  const uv = state.uv ?? 0, t = state.temp ?? 25, w = state.wind ?? 0;
  el.innerHTML = ACTIVITY_TAGS.map(a=>{
    const res = a.calc(uv,t,w);
    const l = ACT_LABELS[res];
    return `<div class="activity-row">
      <div class="activity-icon" aria-hidden="true">${a.icon}</div>
      <div><div class="activity-name">${a.name}</div><div class="activity-sub">UV ${uv} · ${t}°C · viento ${w} km/h</div></div>
      <div class="activity-badge" style="background:${l.bg};color:${l.c}">${l.txt}</div>
    </div>`;
  }).join('');
}

/* ══════════════ COMUNIDAD (reportes locales) ══════════════ */
let selectedCommunityTag = '';
function buildCommunityTags() {
  const el = document.getElementById('community-tags');
  if (!el) return;
  el.innerHTML = COMMUNITY_TAGS.map(t=>`<div class="community-tag" onclick="selectCommunityTag(this,'${t}')">${t}</div>`).join('');
}
function selectCommunityTag(el, tag) {
  document.querySelectorAll('.community-tag').forEach(t=>t.classList.remove('selected'));
  if (selectedCommunityTag === tag) { selectedCommunityTag=''; return; }
  el.classList.add('selected'); selectedCommunityTag = tag;
}
function postCommunityReport() {
  const input = document.getElementById('community-input');
  const text = (input.value || '').trim();
  if (!text && !selectedCommunityTag) { showToast('Escribe algo o elige una etiqueta'); return; }
  const name = state.accounts[0]?.name || 'Usuario';
  state.community.unshift({
    t: Date.now(), name, initials: state.accounts[0]?.initials || 'U',
    tag: selectedCommunityTag, text, city: state.city
  });
  if (state.community.length > 30) state.community = state.community.slice(0,30);
  input.value = ''; selectedCommunityTag = '';
  document.querySelectorAll('.community-tag').forEach(t=>t.classList.remove('selected'));
  renderCommunity(); saveState();
  showToast('Reporte publicado');
}
function renderCommunity() {
  const el = document.getElementById('community-list');
  if (!el) return;
  el.innerHTML = state.community.length ? state.community.map(c=>`
    <div class="community-item">
      <div class="community-avatar">${c.initials}</div>
      <div><div class="community-text"><b>${c.name}</b> ${c.tag?('· '+c.tag+' '):''}${c.text?('— '+c.text):''}</div>
      <div class="community-time">${c.city} · ${new Date(c.t).toLocaleString('es-PE')}</div></div>
    </div>`).join('') : '<div class="hist-empty">Aún no hay reportes. ¡Sé el primero en publicar!</div>';
}

/* ══════════════ RECORDATORIOS ══════════════ */
function addReminder() {
  const titleEl = document.getElementById('reminder-title');
  const timeEl = document.getElementById('reminder-time');
  const title = (titleEl.value || '').trim();
  const time = timeEl.value;
  if (!title || !time) { showToast('Escribe un título y elige una hora'); return; }
  state.reminders.push({ id: Date.now(), title, time });
  state.reminders.sort((a,b)=>a.time.localeCompare(b.time));
  titleEl.value=''; timeEl.value='';
  renderReminders(); saveState();
  showToast('Recordatorio agregado');
}
function deleteReminder(id) {
  state.reminders = state.reminders.filter(r=>r.id!==id);
  renderReminders(); saveState();
}
function renderReminders() {
  const el = document.getElementById('reminders-list');
  if (!el) return;
  el.innerHTML = state.reminders.length ? state.reminders.map(r=>`
    <div class="reminder-item">
      <div class="reminder-time-badge">${r.time}</div>
      <div class="reminder-title">${r.title}</div>
      <button class="reminder-del" onclick="deleteReminder(${r.id})" aria-label="Eliminar recordatorio">🗑</button>
    </div>`).join('') : '<div class="hist-empty">No tienes recordatorios. Agrega uno arriba.</div>';
}
function checkReminders() {
  if (!state.reminders.length) return;
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  if (state.lastReminderMinute === hhmm) return;
  state.lastReminderMinute = hhmm;
  state.reminders.filter(r=>r.time===hhmm).forEach(r=>{
    sendNotification('⏰ '+r.title, 'Recordatorio de SolarAlert');
    showToast('⏰ '+r.title);
  });
}

/* ══════════════ ESTADÍSTICAS ══════════════ */
function renderStats() {
  const uvEl = document.getElementById('stats-uv-chart');
  if (!uvEl) return;
  uvEl.innerHTML = state.forecast.map(d=>{
    const p = Math.round((d.uv/11)*100);
    return `<div class="bar-row"><div class="bar-lbl">${d.day}</div><div class="bar-bg"><div class="bar-fill" style="width:${p}%;background:${uvCol(d.uv)}"></div></div><div class="bar-val">UV ${d.uv}</div></div>`;
  }).join('') || '<p style="font-size:11px;color:var(--text3)">Sin datos aún</p>';

  const tEl = document.getElementById('stats-temp-chart');
  const maxT = Math.max(...state.forecast.map(f=>f.maxT), 1);
  tEl.innerHTML = state.forecast.map(d=>{
    const p = Math.round((d.maxT/maxT)*100);
    return `<div class="bar-row"><div class="bar-lbl">${d.day}</div><div class="bar-bg"><div class="bar-fill" style="width:${p}%;background:${tempColor(d.maxT)}"></div></div><div class="bar-val">${d.minT}–${d.maxT}°</div></div>`;
  }).join('') || '<p style="font-size:11px;color:var(--text3)">Sin datos aún</p>';

  const h = state.history;
  const avgUV = h.length ? Math.round(h.reduce((s,r)=>s+r.uv,0)/h.length) : 0;
  const maxUV = h.length ? Math.max(...h.map(r=>r.uv)) : 0;
  document.getElementById('stats-summary').innerHTML = `
    <div class="stat-summary-row"><span>Mediciones registradas</span><span class="stat-summary-val">${h.length}</span></div>
    <div class="stat-summary-row"><span>UV promedio registrado</span><span class="stat-summary-val">${avgUV}</span></div>
    <div class="stat-summary-row"><span>UV máximo registrado</span><span class="stat-summary-val">${maxUV}</span></div>
    <div class="stat-summary-row"><span>Alertas totales</span><span class="stat-summary-val">${state.alerts}</span></div>
    <div class="stat-summary-row"><span>Días activo en la app</span><span class="stat-summary-val">${state.days}</span></div>`;
}

/* ══════════════ PREMIUM (simulación para la presentación) ══════════════ */
let selectedPlan = 'yearly';
function selectPlan(plan) {
  selectedPlan = plan;
  document.getElementById('plan-monthly').classList.toggle('selected', plan==='monthly');
  document.getElementById('plan-yearly').classList.toggle('selected', plan==='yearly');
}
function activatePremium() {
  const label = selectedPlan === 'monthly' ? 'Mensual (S/ 4.90/mes)' : 'Anual (S/ 39.90/año)';
  showToast('✨ Simulación: Premium ' + label + ' activado');
}

/* ══════════════ COMPARAR CIUDADES ══════════════ */
async function searchCompareCity() {
  const input = document.getElementById('compare-input');
  const q = input.value.trim();
  if (!q) return;
  const box = document.getElementById('compare-suggestions');
  box.innerHTML = '<p style="font-size:12px;color:var(--text3)">Buscando...</p>';
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=es&format=json`);
    const d = await r.json();
    const results = d.results || [];
    if (!results.length) { box.innerHTML = '<p style="font-size:12px;color:var(--text3)">No se encontraron ciudades.</p>'; return; }
    box.innerHTML = results.map((c,i)=>`
      <div class="prow" onclick="addCompareCity(${c.latitude},${c.longitude},'${(c.name+(c.admin1?', '+c.admin1:'')+', '+c.country).replace(/'/g,"\\'")}')">
        <div class="prow-icon" style="background:#E0F2F1">📍</div>
        <div class="prow-label">${c.name}${c.admin1?', '+c.admin1:''}, ${c.country}</div>
        <div class="prow-right">+</div>
      </div>`).join('');
  } catch(e) {
    box.innerHTML = '<p style="font-size:12px;color:var(--text3)">⚠️ Error al buscar. Intenta de nuevo.</p>';
  }
}
function addCompareCity(lat, lon, name) {
  if (state.compareCities.some(c=>c.name===name)) { showToast('Esa ciudad ya está en tu lista'); return; }
  if (state.compareCities.length >= 6) { showToast('Máximo 6 ciudades. Elimina una para agregar otra.'); return; }
  state.compareCities.push({lat, lon, name});
  document.getElementById('compare-input').value='';
  document.getElementById('compare-suggestions').innerHTML='';
  saveState();
  renderCompareList();
}
function removeCompareCity(name) {
  state.compareCities = state.compareCities.filter(c=>c.name!==name);
  saveState(); renderCompareList();
}
async function renderCompareList() {
  const el = document.getElementById('compare-list');
  if (!el) return;
  const mine = { name: `📍 ${state.city} (tú)`, uv: state.uv ?? 0, temp: state.temp ?? '--', mine:true };
  if (!state.compareCities.length) {
    el.innerHTML = renderCompareRow(mine) + '<div class="hist-empty">Busca y agrega ciudades arriba para compararlas.</div>';
    return;
  }
  el.innerHTML = renderCompareRow(mine) + '<p style="font-size:11px;color:var(--text3);padding:8px 0 0;">Cargando otras ciudades...</p>';
  try {
    const results = await Promise.all(state.compareCities.map(c =>
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m&hourly=uv_index&forecast_days=1&timezone=auto`)
        .then(r=>r.json())
        .then(d=>({ name:c.name, uv: Math.round((d.hourly?.uv_index||[])[new Date().getHours()] ?? 0), temp: Math.round(d.current?.temperature_2m ?? 0) }))
        .catch(()=>({ name:c.name, uv: 0, temp: '--' }))
    ));
    const all = [mine, ...results].sort((a,b)=>b.uv-a.uv);
    el.innerHTML = all.map(renderCompareRow).join('');
  } catch(e) {
    el.innerHTML = renderCompareRow(mine) + '<div class="hist-empty">⚠️ No se pudieron cargar las demás ciudades.</div>';
  }
}
function renderCompareRow(c) {
  const color = uvCol(c.uv);
  return `<div class="compare-row">
    <div class="compare-city">${c.name}</div>
    <div class="compare-uv" style="background:${color}22;color:${color}">UV ${c.uv}</div>
    <div class="compare-temp">${c.temp}°</div>
    ${c.mine ? '' : `<button class="reminder-del" onclick="removeCompareCity('${c.name.replace(/'/g,"\\'")}')" aria-label="Quitar">🗑</button>`}
  </div>`;
}

/* ══════════════ ALERTA WHATSAPP A FAMILIAR ══════════════ */
function saveEmergencyContact() {
  state.emergencyPhone = document.getElementById('emergency-phone').value.replace(/\D/g,'');
  saveState();
  showToast('Contacto de emergencia guardado');
}
function checkEmergencyCard() {
  const card = document.getElementById('emergency-card');
  if (!card) return;
  card.style.display = (state.uv >= 11) ? 'block' : 'none';
}
function sendWhatsAppAlert() {
  if (!state.emergencyPhone) { showToast('Primero agrega un contacto en Ajustes'); goTo('ajustes'); return; }
  const msg = `🚨 Alerta SolarAlert: el índice UV en ${state.city} está EXTREMO (UV ${state.uv}). Por favor toma precauciones si vas a salir.`;
  window.open(`https://wa.me/${state.emergencyPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ══════════════ COMPARTIR REPORTE ══════════════ */
async function shareReport() {
  const text = `☀️ SolarAlert — ${state.city}\nÍndice UV: ${state.uv ?? '--'}\nTemperatura: ${state.temp ?? '--'}°C\n¡Cuida tu piel del sol!`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Mi reporte SolarAlert', text }); }
    catch(e) { /* usuario canceló */ }
  } else {
    try { await navigator.clipboard.writeText(text); showToast('📋 Copiado — pégalo donde quieras compartirlo'); }
    catch(e) { showToast(text); }
  }
}

/* ══════════════ MODO NIÑOS ══════════════ */
function toggleKidsMode() {
  state.kidsMode = !state.kidsMode;
  applyKidsMode(state.kidsMode, true);
  saveState();
}
function applyKidsMode(on, animate) {
  document.body.classList.toggle('kids-mode', !!on);
  const tog = document.getElementById('tog-kids');
  if (tog) { tog.classList.toggle('on', !!on); tog.setAttribute('aria-checked', !!on); }
  renderKidsBanner();
}
function renderKidsBanner() {
  const el = document.getElementById('kids-banner');
  if (!el) return;
  if (!state.kidsMode) { el.style.display='none'; return; }
  el.style.display='block';
  const uv = state.uv ?? 0;
  const msg = uv>=11 ? '¡Cuidado! El sol está MUY fuerte hoy 🥵🔥 No salgas sin gorra, lentes y bloqueador.' :
              uv>=8 ? 'El sol está fuerte 😎 ¡Ponte bloqueador y gorra antes de salir!' :
              uv>=6 ? 'Hay bastante sol ☀️ Usa bloqueador si vas a jugar afuera.' :
              uv>=3 ? 'El sol está tranquilo hoy 🙂 Igual usa gorra si vas a estar mucho tiempo afuera.' :
              '¡Puedes jugar afuera tranquilo! 🌤️ Casi no hay sol fuerte.';
  el.innerHTML = `<div class="kids-mascot">${uv>=8?'🥵':uv>=4?'😎':'🙂'}</div><div class="kids-msg">${msg}</div>`;
}

/* ══════════════ FARMACIAS CERCANAS (datos reales, OpenStreetMap) ══════════════ */
function haversineKm(lat1,lon1,lat2,lon2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
async function loadPharmacies() {
  const el = document.getElementById('pharmacies-list');
  if (!state.lat) { showToast('Primero permite el acceso a tu ubicación'); return; }
  el.innerHTML = '<div class="hist-empty">Buscando farmacias cerca de ti...</div>';
  try {
    const query = `[out:json][timeout:15];node(around:3000,${state.lat},${state.lon})[amenity=pharmacy];out body 20;`;
    const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const d = await r.json();
    const items = (d.elements || []).map(p => {
      const tags = p.tags || {};
      const dist = haversineKm(state.lat, state.lon, p.lat, p.lon);
      const addr = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
      return { name: tags.name || 'Farmacia (sin nombre registrado)', addr, dist, lat:p.lat, lon:p.lon };
    }).sort((a,b)=>a.dist-b.dist).slice(0,15);

    if (!items.length) {
      el.innerHTML = '<div class="hist-empty">No se encontraron farmacias registradas cerca de ti en OpenStreetMap.</div>';
      return;
    }
    el.innerHTML = items.map(p => `
      <div class="pharmacy-row">
        <div class="pharmacy-icon">💊</div>
        <div class="pharmacy-info">
          <div class="pharmacy-name">${p.name}</div>
          <div class="pharmacy-sub">${p.addr ? p.addr+' · ' : ''}${p.dist.toFixed(1)} km</div>
        </div>
        <a class="pharmacy-go" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}" target="_blank" rel="noopener">Ir ↗</a>
      </div>`).join('') + '<div class="map-hint" style="text-align:left;margin-top:8px;">Datos de OpenStreetMap, un mapa colaborativo abierto. Puede que falte algún local o algún dato esté desactualizado.</div>';
  } catch(e) {
    el.innerHTML = '<div class="hist-empty">⚠️ No se pudieron cargar las farmacias. Intenta de nuevo.</div>';
  }
}

/* ── THEME ── */
function setTheme(t) {
  state.theme=t;
  applyTheme(t);
  saveState();
  showToast('Tema: '+(t==='light'?'Claro':t==='dark'?'Oscuro':'Blanco'));
}
function applyTheme(t, toast=true) {
  document.body.classList.remove('theme-light','theme-dark','theme-white');
  document.body.classList.add('theme-'+t);
  document.querySelectorAll('.theme-btn').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-checked','false');});
  const el=document.getElementById('theme-'+t);
  if(el){el.classList.add('selected');el.setAttribute('aria-checked','true');}
}

/* ── FONT SIZE ── */
function setFontSize(fs) {
  state.fontSize=fs;
  applyFontSize(fs);
  saveState();
  showToast('Letra: '+FS_NAMES[fs]);
}
function applyFontSize(fs, toast=true) {
  document.body.classList.remove('fs-sm','fs-md','fs-lg','fs-xl');
  document.body.classList.add('fs-'+fs);
  document.querySelectorAll('.fs-btn').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-checked','false');});
  const el=document.getElementById('fs-'+fs);
  if(el){el.classList.add('selected');el.setAttribute('aria-checked','true');}
  const label=document.getElementById('fs-label');
  if(label){label.textContent=FS_NAMES[fs]; label.style.color=state.accent;}
}

/* ── PALETTE (degradados) ── */
function buildPalette() {
  document.getElementById('palette-row').innerHTML = PALETTES.map(p=>
    `<div class="pal-btn${p.solid===state.accent?' selected':''}" style="background:${p.grad}" role="radio" aria-checked="${p.solid===state.accent}" tabindex="0" aria-label="${p.name}" onclick="setPalette('${p.solid}','${p.grad}','${p.name}')"></div>`
  ).join('');
  const nt=document.getElementById('palette-name-text');
  if(nt){nt.textContent=state.accentName;nt.style.color=state.accent;}
}

function setPalette(solid,grad,name) {
  state.accent=solid; state.accentGrad=grad; state.accentName=name;
  applyAccent(solid,grad);
  document.querySelectorAll('.pal-btn').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-checked','false');});
  if(window.event && window.event.target){window.event.target.classList.add('selected');window.event.target.setAttribute('aria-checked','true');}
  const nt=document.getElementById('palette-name-text');
  if(nt){nt.textContent=name;nt.style.color=solid;}
  saveState();
  showToast('Color: '+name);
}

function applyAccent(solid, grad, rebuild=true) {
  document.documentElement.style.setProperty('--accent',solid);
  document.documentElement.style.setProperty('--accent-grad',grad);
  document.querySelectorAll('.toggle.on').forEach(t=>t.style.background=grad);
  document.querySelectorAll('.btn-action').forEach(b=>{b.style.borderColor=solid;b.style.color=solid;});
  const fsLabel=document.getElementById('fs-label');
  if(fsLabel) fsLabel.style.color=solid;
  const pnt=document.getElementById('palette-name-text');
  if(pnt) pnt.style.color=solid;
  document.querySelector('#nav-home .nav-bump').style.background=grad;
}

/* ── ACCOUNTS ── */
function renderAccounts() {
  document.getElementById('accounts-list').innerHTML =
    state.accounts.map((a,i)=>
      `<div class="prow"><div class="prow-icon" style="background:#FFF3E0">👤</div>
      <div class="prow-label">${a.name}${i===0?'<span class="acc-badge">Principal</span>':''}</div>
      <div class="prow-right">›</div></div>`
    ).join('') +
    `<div class="prow" onclick="addAccount()"><div class="prow-icon" style="background:var(--bg3)">➕</div>
    <div class="prow-label" style="color:var(--text3)">Añadir cuenta</div>
    <div class="prow-right">›</div></div>`;
}

function addAccount() {
  const name=prompt('Nombre de la nueva cuenta:');
  if(!name?.trim()) return;
  const initials=name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  state.accounts.push({name:name.trim(),initials});
  renderAccounts(); renderProfileHeader(); saveState();
  showToast('Cuenta añadida: '+name.trim());
}

/* ── TOGGLES ── */
function toggleSwitch(id) {
  const el=document.getElementById(id);
  el.classList.toggle('on');
  const on = el.classList.contains('on');
  state.toggles[id]=on;
  el.setAttribute('aria-checked', String(on));
  el.style.background = on ? state.accentGrad : '';
  saveState();
}

/* ── PREFERENCES ── */
function changeSkinType() {
  state.skinType=state.skinType>=6?1:state.skinType+1;
  document.getElementById('skin-type-label').textContent=SKIN_TYPES[state.skinType-1];
  renderSafeTime(); renderConsejos(); saveState();
  showToast('Tipo de piel: '+SKIN_TYPES[state.skinType-1]);
}
function toggleUnit() {
  state.unit=state.unit==='C'?'F':'C';
  document.getElementById('unit-label').textContent='°'+state.unit;
  renderTempDisplay(); saveState();
  showToast('Temperatura en °'+state.unit);
}
function editName() {
  const name=prompt('Tu nombre:',state.accounts[0].name);
  if(!name?.trim()) return;
  state.accounts[0].name=name.trim();
  state.accounts[0].initials=name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('avatar-el').textContent=state.accounts[0].initials;
  document.getElementById('profile-name-el').textContent=state.accounts[0].name;
  renderAccounts(); saveState(); showToast('Nombre actualizado');
}
function exportData() {
  const data={fecha:new Date().toLocaleString('es-PE'),ciudad:state.city,temperatura:state.temp+'°C',uvActual:state.uv,humedad:state.humidity+'%',viento:state.wind+' km/h',pronostico:state.forecast,historial:state.history,alertas:state.alertLog};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download=`solaralert-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); showToast('Datos exportados');
}
function showAbout() { alert('SolarAlert v2.1\n\nApp de alerta solar en tiempo real.\nDatos: Open-Meteo (sin API key)\nMapa: OpenStreetMap + Leaflet\nTemas: Claro / Oscuro / Blanco\nLetra configurable para personas mayores\n\n☀️ Cuida tu piel.'); }
function showUVInfo(uv) { showToast(uv<=2?'UV bajo: sin riesgo':uv<=5?'UV mod: usa FPS 15+':uv<=7?'UV alto: FPS 30+':uv<=10?'UV muy alto: FPS 50+':'UV extremo: quédate en casa'); }

/* ── NAV ── */
function goTo(screen) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
  document.getElementById('screen-'+screen).classList.add('active');
  const btn=document.getElementById('nav-'+screen);
  btn.classList.add('active'); btn.setAttribute('aria-current','page');
  btn.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});

  if (screen === 'mapa') {
    setTimeout(initOrRefreshMap, 50);
  }
}

/* ── TOAST ── */
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

/* ── DAYS ── */
function trackDays() {
  const today=new Date().toDateString(), last=localStorage.getItem('sa_last');
  if(last!==today){state.days=parseInt(localStorage.getItem('sa_days')||'0')+1;localStorage.setItem('sa_last',today);localStorage.setItem('sa_days',state.days);}
  else state.days=parseInt(localStorage.getItem('sa_days')||'1');
}

/* ══════════════ MAPA DE CALOR (Leaflet + Open-Meteo) ══════════════ */
async function initOrRefreshMap() {
  if (!state.lat) return;
  if (!uvMap) {
    uvMap = L.map('uv-map', {zoomControl:true}).setView([+state.lat, +state.lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 15
    }).addTo(uvMap);
    mapLayerGroup = L.layerGroup().addTo(uvMap);
  }
  uvMap.invalidateSize();
  await loadHeatPoints();
}

function refreshMap() { showToast('Actualizando mapa...'); loadHeatPoints(); }

async function loadHeatPoints() {
  const hint = document.getElementById('map-hint');
  hint.textContent = 'Cargando puntos alrededor de tu zona...';
  mapLayerGroup.clearLayers();

  const lat = +state.lat, lon = +state.lon;
  const offset = 0.25; // ~25km
  const points = [
    {dLat:0, dLon:0, label:'Tu ubicación'},
    {dLat:offset, dLon:0, label:'Norte'},
    {dLat:-offset, dLon:0, label:'Sur'},
    {dLat:0, dLon:offset, label:'Este'},
    {dLat:0, dLon:-offset, label:'Oeste'},
  ];

  try {
    const results = await Promise.all(points.map(p => {
      const plat=(lat+p.dLat).toFixed(4), plon=(lon+p.dLon).toFixed(4);
      return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${plat}&longitude=${plon}&current=temperature_2m&hourly=uv_index&forecast_days=1&timezone=auto`)
        .then(r=>r.json())
        .then(d=>({ label:p.label, lat:+plat, lon:+plon, temp: Math.round(d.current?.temperature_2m ?? state.temp ?? 25), uv: Math.round((d.hourly?.uv_index||[])[new Date().getHours()] ?? state.uv ?? 0) }))
        .catch(()=>({ label:p.label, lat:+plat, lon:+plon, temp: state.temp ?? 25, uv: state.uv ?? 0 }));
    }));

    results.forEach(pt => {
      const color = tempColor(pt.temp);
      L.circle([pt.lat, pt.lon], {
        radius: 14000,
        color: color,
        fillColor: color,
        fillOpacity: 0.35,
        weight: 2
      }).bindPopup(`<b>${pt.label}</b><br>🌡 ${pt.temp}°C · UV ${pt.uv}`).addTo(mapLayerGroup);
    });

    hint.textContent = `Puntos alrededor de ${state.city} — toca un círculo para ver detalles`;
  } catch (e) {
    hint.textContent = '⚠️ No se pudieron cargar los puntos del mapa.';
  }
}

/* ══════════════ HISTORIAL ══════════════ */
function logReading() {
  state.history.unshift({
    t: Date.now(), city: state.city, temp: state.temp, uv: state.uv
  });
  if (state.history.length > 50) state.history = state.history.slice(0,50);
  renderHistorial();
}

function logAlert(txt, color) {
  state.alertLog.unshift({ t: Date.now(), txt, color });
  if (state.alertLog.length > 50) state.alertLog = state.alertLog.slice(0,50);
  renderHistorial();
}

function renderHistorial() {
  const rEl = document.getElementById('hist-readings');
  const aEl = document.getElementById('hist-alerts');
  if (!rEl || !aEl) return;

  rEl.innerHTML = state.history.length ? state.history.slice(0,15).map(h=>{
    const c = uvCol(h.uv);
    return `<div class="hist-row">
      <div class="hist-time">${fmtTime(h.t)}</div>
      <div class="hist-badge" style="background:${c}22;color:${c}">UV ${h.uv}</div>
      <div class="hist-city">${h.city}</div>
      <div class="hist-temp">${h.temp}°C</div>
    </div>`;
  }).join('') : '<div class="hist-empty">Aún no hay mediciones. Se irán guardando cada vez que la app actualice el clima.</div>';

  aEl.innerHTML = state.alertLog.length ? state.alertLog.slice(0,15).map(a=>
    `<div class="alertlog-item"><div class="adot" style="background:${a.color};margin-top:4px" aria-hidden="true"></div>
    <div><div class="atext">${a.txt}</div><div class="atime">${new Date(a.t).toLocaleString('es-PE')}</div></div></div>`
  ).join('') : '<div class="hist-empty">Sin alertas registradas todavía.</div>';
}

function clearHistory() {
  if (!confirm('¿Borrar todo el historial de mediciones y alertas?')) return;
  state.history = []; state.alertLog = [];
  renderHistorial(); saveState();
  showToast('Historial borrado');
}

/* ══════════════ CONSEJOS (motor de reglas) ══════════════ */
function renderConsejos() {
  const wrap = document.getElementById('consejos-wrap');
  if (!wrap) return;
  const uv = state.uv ?? 0, temp = state.temp ?? 25, hum = state.humidity ?? 50;
  const med = SKIN_MED[state.skinType-1] || 100;
  const mins = uv>0 ? Math.round(med/(uv*3.5)) : 999;

  const fps = uv<=2?'No es indispensable, pero recomendable FPS 15':
              uv<=5?'FPS 15–30, reaplicar cada 2 horas':
              uv<=7?'FPS 30 o más, reaplicar cada 2 horas':
              uv<=10?'FPS 50+, reaplicar cada 1–2 horas':
              'FPS 50+, reaplicar cada hora, evitar exposición directa';

  const ropa = uv<=5 ? 'Ropa ligera de manga corta está bien; gafas de sol recomendadas.' :
               uv<=7 ? 'Camisa de manga larga liviana y sombrero de ala ancha.' :
               'Ropa que cubra brazos y piernas, sombrero de ala ancha y gafas UV400 obligatorias.';

  const hidra = temp>=33 ? 'Toma agua cada 20–30 min, incluso sin sed. Evita alcohol y cafeína en exceso.' :
                temp>=27 ? 'Mantente hidratado regularmente, sobre todo si estás activo al aire libre.' :
                'Hidratación normal es suficiente.';

  const horario = state.hourly && state.hourly.length
    ? (() => {
        const bajo = state.hourly.filter(h=>h.uv<=3);
        return bajo.length ? `Horas con UV bajo hoy: ${bajo.map(h=>h.label).join(', ')}.` : 'Hoy el UV se mantiene moderado-alto casi todo el día; prioriza sombra entre 10am y 3pm.';
      })()
    : 'Actualiza los datos para ver el mejor horario de hoy.';

  const cards = [
    {icon:'🧴', title:'Protector solar', body:`${fps}. Con tu tipo de piel (${SKIN_TYPES[state.skinType-1]}), tu tiempo seguro sin protección es de aproximadamente ${mins>=60?Math.round(mins/60)+' h':mins+' min'}.`},
    {icon:'👕', title:'Ropa recomendada', body:ropa},
    {icon:'💧', title:'Hidratación', body:`${hidra} Humedad actual: ${hum}%.`},
    {icon:'🕐', title:'Mejor horario', body:horario},
    {icon:'⚠️', title:'Síntomas a vigilar', body:'Enrojecimiento, dolor de cabeza, mareo, piel caliente sin sudor o calambres pueden indicar insolación o golpe de calor. Si aparecen, busca sombra, hidrátate y busca atención médica si no mejora.'},
  ];

  wrap.innerHTML = `<div class="card-title" style="padding:4px 4px 0;">💡 Recomendaciones para hoy en ${state.city}</div>` +
    cards.map((c,i)=>`<div class="consejo-card">
      <div class="consejo-title"><span aria-hidden="true">${c.icon}</span> ${c.title}</div>
      <div class="consejo-body">${c.body}</div>
    </div>` + (i===0 ? `<div class="sponsor-card sponsor-inline">
      <div class="sponsor-label">Espacio patrocinado — ejemplo</div>
      <div class="sponsor-row">
        <div class="sponsor-icon">🧴</div>
        <div><div class="sponsor-name">Recomendado por <b>[Marca de protector solar]</b></div>
        <div class="sponsor-sub">Aquí una marca aliada podría mostrar su producto junto a este consejo.</div></div>
      </div>
    </div>` : '')).join('');
}

/* ══════════════ NOTIFICACIONES REALES ══════════════ */
function updateNotifStatus() {
  const el = document.getElementById('notif-status');
  if (!el) return;
  if (!('Notification' in window)) { el.textContent = 'No disponible en este navegador'; return; }
  state.notifPermission = Notification.permission;
  el.textContent = state.notifPermission === 'granted' ? 'Activadas ✅'
    : state.notifPermission === 'denied' ? 'Bloqueadas — actívalas en ajustes del navegador'
    : 'Toca para activar';
}

async function requestNotifPermission() {
  if (!('Notification' in window)) { showToast('Tu navegador no soporta notificaciones'); return; }
  const perm = await Notification.requestPermission();
  state.notifPermission = perm;
  updateNotifStatus();
  showToast(perm === 'granted' ? 'Notificaciones activadas' : 'Permiso no concedido');
}

async function sendNotification(title, body) {
  if (Notification.permission !== 'granted') return;
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png' });
    } else {
      new Notification(title, { body, icon: 'icon-192.png' });
    }
  } catch (e) {
    try { new Notification(title, { body }); } catch(e2) {}
  }
}

function checkAndNotify(prevClouds) {
  const uv = state.uv, temp = state.temp;
  const todayKey = new Date().toDateString();

  // UV alto (tog1)
  if (state.toggles.tog1 && uv >= 8 && state.lastNotified.uv < 8) {
    sendNotification('☀️ UV muy alto', `Índice UV de ${uv} en ${state.city}. Protección máxima recomendada.`);
    logAlert(`Notificación enviada: UV ${uv} muy alto`, '#E53935');
  }
  state.lastNotified.uv = uv;

  // Golpe de calor (tog4)
  if (state.toggles.tog4 && temp >= 33 && !state.lastNotified.heat) {
    sendNotification('🌡 Riesgo de golpe de calor', `${temp}°C en ${state.city}. Hidrátate y evita el sol directo.`);
    logAlert(`Notificación enviada: ${temp}°C riesgo de golpe de calor`, '#FF9800');
    state.lastNotified.heat = true;
  } else if (temp < 31) {
    state.lastNotified.heat = false;
  }

  // Cambios bruscos de clima (tog3)
  if (state.toggles.tog3 && prevClouds !== null && prevClouds !== undefined) {
    if (Math.abs(state.clouds - prevClouds) >= 40) {
      sendNotification('🌧 Cambio brusco de clima', `La nubosidad cambió de ${prevClouds}% a ${state.clouds}% en ${state.city}.`);
      logAlert(`Notificación enviada: cambio de nubosidad ${prevClouds}%→${state.clouds}%`, '#2196F3');
    }
  }

  // Resumen diario (tog2)
  if (state.toggles.tog2 && state.lastNotified.daily !== todayKey) {
    const hour = new Date().getHours();
    if (hour >= 7 && hour <= 9) {
      sendNotification('☀️ Resumen de hoy', `UV máximo esperado: ${Math.max(...state.forecast.map(f=>f.uv), uv)}. Temp: ${state.forecast[0]?.minT}–${state.forecast[0]?.maxT}°C.`);
      state.lastNotified.daily = todayKey;
      logAlert('Notificación enviada: resumen diario', '#4CAF50');
    }
  }
  saveState();
}

function checkDailySummary() {
  if (!state.toggles.tog2 || !state.forecast.length) return;
  const todayKey = new Date().toDateString();
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9 && state.lastNotified.daily !== todayKey) {
    sendNotification('☀️ Resumen de hoy', `UV máximo esperado hoy en ${state.city}: ${Math.max(...state.forecast.map(f=>f.uv))}.`);
    state.lastNotified.daily = todayKey;
    logAlert('Notificación enviada: resumen diario', '#4CAF50');
    saveState();
  }
}

/* ── PERSIST ── */
function saveState() {
  try{localStorage.setItem('sa_state',JSON.stringify({
    unit:state.unit, skinType:state.skinType, accent:state.accent, accentGrad:state.accentGrad,
    accentName:state.accentName, theme:state.theme, fontSize:state.fontSize, accounts:state.accounts,
    alerts:state.alerts, toggles:state.toggles, history:state.history, alertLog:state.alertLog,
    lastNotified:state.lastNotified, community:state.community, reminders:state.reminders,
    compareCities:state.compareCities, emergencyPhone:state.emergencyPhone, kidsMode:state.kidsMode
  }));}catch(e){}
}
function loadState() {
  try{
    const s=JSON.parse(localStorage.getItem('sa_state')||'{}');
    if(s.unit) state.unit=s.unit;
    if(s.skinType) state.skinType=s.skinType;
    if(s.accent){state.accent=s.accent;document.documentElement.style.setProperty('--accent',s.accent);}
    if(s.accentGrad){state.accentGrad=s.accentGrad;document.documentElement.style.setProperty('--accent-grad',s.accentGrad);}
    if(s.accentName) state.accentName=s.accentName;
    if(s.theme) state.theme=s.theme;
    if(s.fontSize) state.fontSize=s.fontSize;
    if(s.accounts?.length) state.accounts=s.accounts;
    if(s.alerts) state.alerts=s.alerts;
    if(s.toggles) state.toggles=s.toggles;
    if(s.history) state.history=s.history;
    if(s.alertLog) state.alertLog=s.alertLog;
    if(s.lastNotified) state.lastNotified=s.lastNotified;
    if(s.community) state.community=s.community;
    if(s.reminders) state.reminders=s.reminders;
    if(s.compareCities) state.compareCities=s.compareCities;
    if(s.emergencyPhone) state.emergencyPhone=s.emergencyPhone;
    if(typeof s.kidsMode==='boolean') state.kidsMode=s.kidsMode;
    if(s.accounts?.[0]){
      const av=document.getElementById('avatar-el');
      const nm=document.getElementById('profile-name-el');
      if(av) av.textContent=s.accounts[0].initials||'JS';
      if(nm) nm.textContent=s.accounts[0].name||'Usuario';
    }
  }catch(e){}
}
