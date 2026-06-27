'use strict';

const state = {
  lat: null, lon: null, city: 'Tu ubicación',
  temp: null, feels: null, uv: null,
  humidity: null, wind: null, clouds: null,
  sunrise: null, sunset: null,
  forecast: [], hourly: [],
  unit: 'C', skinType: 2,
  accent: '#FF6B00', accentName: 'Naranja solar',
  theme: 'light', fontSize: 'md',
  accounts: [{name:'Juan Solis', initials:'JS'}],
  alerts: 0, days: 1, lastUpdate: null,
  toggles: {tog1:true,tog2:true,tog3:false,tog4:true}
};

const PALETTES = [
  {color:'#FF6B00',name:'Naranja solar'},
  {color:'#1565C0',name:'Azul océano'},
  {color:'#2E7D32',name:'Verde naturaleza'},
  {color:'#6A1B9A',name:'Violeta'},
  {color:'#00838F',name:'Cian'},
  {color:'#C62828',name:'Rojo alerta'},
  {color:'#4E342E',name:'Café tierra'},
  {color:'#37474F',name:'Gris pizarra'},
];

const SKIN_TYPES = ['Tipo I','Tipo II','Tipo III','Tipo IV','Tipo V','Tipo VI'];
const SKIN_MED   = [67, 100, 200, 300, 400, 500];
const FS_NAMES   = {sm:'Pequeño', md:'Normal', lg:'Grande', xl:'Extra grande'};

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
  applyAccent(state.accent, false);
  getLocation();
  trackDays();
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
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,cloud_cover&hourly=uv_index,temperature_2m&daily=uv_index_max,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`),
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
    state.temp   = Math.round(cur.temperature_2m);
    state.feels  = Math.round(cur.apparent_temperature);
    state.humidity = Math.round(cur.relative_humidity_2m);
    state.wind   = Math.round(cur.wind_speed_10m);
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
    saveState();
  } catch(e) {
    updateAlertBar('⚠️ Error de conexión. Reintentando...');
  }
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
  // color gradient based on temp
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
    `<div class="alert-item"><div class="adot" style="background:${a.c};margin-top:4px"></div>
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
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('selected'));
  const el=document.getElementById('theme-'+t);
  if(el) el.classList.add('selected');
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
  document.querySelectorAll('.fs-btn').forEach(b=>b.classList.remove('selected'));
  const el=document.getElementById('fs-'+fs);
  if(el) el.classList.add('selected');
  const label=document.getElementById('fs-label');
  if(label){label.textContent=FS_NAMES[fs]; label.style.color=state.accent;}
}

/* ── PALETTE ── */
function buildPalette() {
  document.getElementById('palette-row').innerHTML = PALETTES.map(p=>
    `<div class="pal-btn${p.color===state.accent?' selected':''}" style="background:${p.color}" onclick="setPalette('${p.color}','${p.name}')"></div>`
  ).join('');
  const nt=document.getElementById('palette-name-text');
  if(nt){nt.textContent=state.accentName;nt.style.color=state.accent;}
}

function setPalette(color,name) {
  state.accent=color; state.accentName=name;
  applyAccent(color);
  document.querySelectorAll('.pal-btn').forEach(b=>b.classList.remove('selected'));
  event.target.classList.add('selected');
  const nt=document.getElementById('palette-name-text');
  if(nt){nt.textContent=name;nt.style.color=color;}
  saveState();
  showToast('Color: '+name);
}

function applyAccent(color, rebuild=true) {
  document.documentElement.style.setProperty('--accent',color);
  document.querySelectorAll('.toggle.on').forEach(t=>t.style.background=color);
  document.querySelectorAll('.btn-action').forEach(b=>{b.style.borderColor=color;b.style.color=color;});
  const fsLabel=document.getElementById('fs-label');
  if(fsLabel) fsLabel.style.color=color;
  const pnt=document.getElementById('palette-name-text');
  if(pnt) pnt.style.color=color;
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
  state.toggles[id]=el.classList.contains('on');
  el.style.background=el.classList.contains('on')?state.accent:'';
  saveState();
}

/* ── PREFERENCES ── */
function changeSkinType() {
  state.skinType=state.skinType>=6?1:state.skinType+1;
  document.getElementById('skin-type-label').textContent=SKIN_TYPES[state.skinType-1];
  renderSafeTime(); saveState();
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
  const data={fecha:new Date().toLocaleString('es-PE'),ciudad:state.city,temperatura:state.temp+'°C',uvActual:state.uv,humedad:state.humidity+'%',viento:state.wind+' km/h',pronostico:state.forecast};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download=`solaralert-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); showToast('Datos exportados');
}
function showAbout() { alert('SolarAlert v2.0\n\nApp de alerta solar en tiempo real.\nDatos: Open-Meteo (sin API key)\nTemas: Claro / Oscuro / Blanco\nLetra configurable para personas mayores\n\n☀️ Cuida tu piel.'); }
function showUVInfo(uv) { showToast(uv<=2?'UV bajo: sin riesgo':uv<=5?'UV mod: usa FPS 15+':uv<=7?'UV alto: FPS 30+':uv<=10?'UV muy alto: FPS 50+':'UV extremo: quédate en casa'); }
function askAI(q) { showToast('Consulta: '+q.slice(0,30)+'...'); }

/* ── NAV ── */
function goTo(screen) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+screen).classList.add('active');
  document.getElementById('nav-'+screen).classList.add('active');
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

/* ── PERSIST ── */
function saveState() {
  try{localStorage.setItem('sa_state',JSON.stringify({unit:state.unit,skinType:state.skinType,accent:state.accent,accentName:state.accentName,theme:state.theme,fontSize:state.fontSize,accounts:state.accounts,alerts:state.alerts,toggles:state.toggles}));}catch(e){}
}
function loadState() {
  try{
    const s=JSON.parse(localStorage.getItem('sa_state')||'{}');
    if(s.unit) state.unit=s.unit;
    if(s.skinType) state.skinType=s.skinType;
    if(s.accent){state.accent=s.accent;document.documentElement.style.setProperty('--accent',s.accent);}
    if(s.accentName) state.accentName=s.accentName;
    if(s.theme) state.theme=s.theme;
    if(s.fontSize) state.fontSize=s.fontSize;
    if(s.accounts?.length) state.accounts=s.accounts;
    if(s.alerts) state.alerts=s.alerts;
    if(s.toggles) state.toggles=s.toggles;
    if(s.accounts?.[0]){
      const av=document.getElementById('avatar-el');
      const nm=document.getElementById('profile-name-el');
      if(av) av.textContent=s.accounts[0].initials||'JS';
      if(nm) nm.textContent=s.accounts[0].name||'Usuario';
    }
  }catch(e){}
}
