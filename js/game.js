/* ========== SETUP: Firebase config & Admin Email ========== */
const firebaseConfig = {
  apiKey: "AIzaSyBYZRaIEIC_HKz7vsbNuTsu_if18pveGXc",
  authDomain: "sahara-city-8bfc3.firebaseapp.com",
  projectId: "sahara-city-8bfc3",
  storageBucket: "sahara-city-8bfc3.firebasestorage.app",
  messagingSenderId: "1075227339347",
  appId: "1:1075227339347:web:efe5e814e1e81a3440f4a6"
};
const ADMIN_EMAIL = "adlane.aby@gmail.com";

const CATALOG = {
  cars:[
    {id:'c1',name:'Bravado Buffalo S (White)',price:25000,color:0xf8fafc,maxSpd:58,accel:34,handle:3.1},
    {id:'c2',name:'Toyota Hilux 4x4',price:15000,color:0x2f5233,maxSpd:44,accel:26,handle:2.5},
    {id:'c3',name:'Sport Coupe GT',price:60000,color:0xd11f17,maxSpd:66,accel:42,handle:3.3}
  ],
  houses:[
    {id:'h1',name:'Vinewood Hills Villa',price:150000},
    {id:'h2',name:'Rockford Hills Mansion',price:320000},
    {id:'h3',name:'Strawberry Car Wash & Loft',price:85000}
  ]
};
const ALL = [...CATALOG.cars.map(x=>({...x,type:'cars'})),...CATALOG.houses.map(x=>({...x,type:'houses'}))];
const $ = id => document.getElementById(id);
let db, auth, me=null, ref=null, loginAt=Date.now(), THREE_started=false, isGuest=false;

function toast(t){
  const el=$('toast');
  el.textContent=t;
  el.style.display='block';
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.style.display='none',3000);
}

try{ firebase.initializeApp(firebaseConfig); auth=firebase.auth(); db=firebase.firestore(); }
catch(e){ $('msg').textContent='Firebase init error: '+e.message; }

const msg = t => $('msg').textContent = t;

function enterGameUI(userData, isAdmin=false){
  me = userData;
  $('auth').style.display='none';
  $('hud').style.display='flex';
  $('bar').style.display='flex';
  $('pad').style.display='grid';
  $('camHint').style.display='block';
  $('minimapHud').style.display='block';
  $('watermark').style.display='block';
  $('money').textContent='$'+me.money.toLocaleString();
  $('who').textContent=me.username;
  $('bAdmin').style.display = isAdmin ? 'inline-block' : 'none';
  renderShop(); renderPhone();
  if(G.syncCar) G.syncCar();
  if(!THREE_started){ THREE_started=true; startGame(); }
}

$('guestBtn').onclick = () => {
  isGuest = true;
  enterGameUI({username:'Burke', email:'guest@local', money:50000, cars:['c1'], houses:[], activeCar:'c1'}, false);
  toast('Welcome to Los Santos! Press E or click Enter Car to drive.');
};

$('signup').onclick = async () => {
  const email=$('em').value.trim(), pw=$('pw').value, name=$('un').value.trim();
  if(name.length<3) return msg('Pick a username with 3+ characters.');
  try{
    const c = await auth.createUserWithEmailAndPassword(email,pw);
    await db.collection('users').doc(c.user.uid).set({username:name,email,money:50000,cars:['c1'],houses:[],activeCar:'c1',banned:false,kickAt:0});
  }catch(e){ msg(e.message); }
};
$('login').onclick = async () => {
  try{ await auth.signInWithEmailAndPassword($('em').value.trim(),$('pw').value); }catch(e){ msg(e.message); }
};

auth && auth.onAuthStateChanged(u => {
  if(!u){
    if(isGuest) return;
    $('auth').style.display='flex';
    ['hud','bar','pad','dmg','speedo','camHint','minimapHud','watermark'].forEach(i=>$(i).style.display='none');
    return;
  }
  isGuest = false;
  loginAt=Date.now();
  ref=db.collection('users').doc(u.uid);
  ref.onSnapshot(s=>{
    if(!s.exists) return;
    const data=s.data(); data.uid=u.uid;
    if(data.banned){ msg('This account is banned.'); auth.signOut(); return; }
    if(data.kickAt && data.kickAt>loginAt){ msg('You were kicked by an admin.'); auth.signOut(); return; }
    enterGameUI(data, (u.email||'').toLowerCase()===ADMIN_EMAIL);
  });
});

/* ---------- panels ---------- */
const show = id => { document.querySelectorAll('.panel').forEach(p=>p.style.display='none'); $(id).style.display='block'; };
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.parentElement.style.display='none');
$('bShop').onclick=()=>show('pShop'); $('bPhone').onclick=()=>togPhone(); $('bAdmin').onclick=()=>show('pAdmin');
$('aItem').innerHTML = ALL.map(i=>`<option value="${i.type}:${i.id}">${i.name}</option>`).join('');

function renderShop(){
  if(!me) return;
  $('shopList').innerHTML = ALL.map(i=>{
    const has=(me[i.type]||[]).includes(i.id);
    const active = i.type==='cars' && (me.activeCar||((me.cars||[])[0]||'c1'))===i.id;
    return `<div class="row"><span><b>${i.name}</b><br><small style="opacity:.75">${i.type==='cars'?'Vehicle':'Property'} · $${i.price.toLocaleString()}</small></span>
      ${has ? (i.type==='cars' ? `<button class="btn ${active?'':'alt'}" onclick="selectCar('${i.id}')">${active?'Driving':'Drive this'}</button>` : `<button class="btn alt" disabled>Owned</button>`)
            : `<button class="btn" onclick="buy('${i.type}','${i.id}')">Buy</button>`}</div>`;
  }).join('');
}
window.selectCar = async (id) => {
  if(isGuest){ me.activeCar=id; renderShop(); if(G.syncCar) G.syncCar(); }
  else await ref.update({activeCar:id});
  toast('Selected '+ALL.find(x=>x.id===id).name);
};
window.buy = async (type,id) => {
  const item = ALL.find(i=>i.type===type&&i.id===id);
  if(me.money<item.price) return toast('Not enough money!');
  if(isGuest){
    me.money -= item.price;
    me[type] = [...(me[type]||[]), id];
    if(type==='cars') me.activeCar = id;
    $('money').textContent='$'+me.money.toLocaleString();
    renderShop(); renderPhone(); if(G.syncCar) G.syncCar();
  } else {
    const upd = {money:firebase.firestore.FieldValue.increment(-item.price),[type]:firebase.firestore.FieldValue.arrayUnion(id)};
    if(type==='cars') upd.activeCar = id;
    await ref.update(upd);
  }
  toast('Purchased '+item.name+'!');
};

/* ---------- admin ---------- */
async function findUser(){
  if(isGuest) return null;
  const n=$('aUser').value.trim();
  const q=await db.collection('users').where('username','==',n).limit(1).get();
  if(q.empty){ $('aMsg').textContent='Player not found.'; return null; }
  return q.docs[0].ref;
}
const done = t => $('aMsg').textContent=t;
$('aMoney').onclick=async()=>{const r=await findUser(); if(r){await r.update({money:firebase.firestore.FieldValue.increment(+$('aAmt').value||0)}); done('Money sent.');}};
$('aKick').onclick=async()=>{const r=await findUser(); if(r){await r.update({kickAt:Date.now()}); done('Player kicked.');}};
$('aBan').onclick=async()=>{const r=await findUser(); if(r){await r.update({banned:true}); done('Player banned.');}};
$('aUnban').onclick=async()=>{const r=await findUser(); if(r){await r.update({banned:false}); done('Player unbanned.');}};
$('aGive').onclick=async()=>{const r=await findUser(); if(!r) return; const [t,id]=$('aItem').value.split(':');
  await r.update({[t]:firebase.firestore.FieldValue.arrayUnion(id)}); done('Item given.');};

/* ---------- shared state, clock, audio ---------- */
const G={hp:100,mode:'walk',reset(){G.hp=100;},syncCar:null,toggleMode:null};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const T0=performance.now(),gameHour()=>(14.5+(performance.now()-T0)/60000)%24;
const fmt=h=>String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor(h%1*60)).padStart(2,'0');
const A={ctx:null,on:true};
function initAudio(){
  if(A.ctx){A.ctx.resume();return;} const c=A.ctx=new(window.AudioContext||window.webkitAudioContext)();
  A.master=c.createGain();A.master.gain.value=S.vol/100;A.master.connect(c.destination);
  const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;A.noise=nb;
  A.e1=c.createOscillator();A.e1.type='sawtooth';A.e2=c.createOscillator();A.e2.type='triangle';
  const ef=c.createBiquadFilter();ef.type='lowpass';ef.frequency.value=420;A.eg=c.createGain();A.eg.gain.value=0;
  A.e1.connect(ef);A.e2.connect(ef);ef.connect(A.eg);A.eg.connect(A.master);A.e1.start();A.e2.start();A.ef=ef;
}
function burst(dur,f,vol,type){if(!A.ctx||!A.on)return;const c=A.ctx,s=c.createBufferSource();s.buffer=A.noise;const fl=c.createBiquadFilter();fl.type=type||'lowpass';fl.frequency.value=f;const g=c.createGain();g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);s.connect(fl);fl.connect(g);g.connect(A.master);s.start();s.stop(c.currentTime+dur);}
function tone(f,dur,vol,type){if(!A.ctx||!A.on)return;const c=A.ctx,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g);g.connect(A.master);o.start();o.stop(c.currentTime+dur);}
const beep=()=>tone(900,.04,.05),horn=()=>{tone(410,.42,.2,'sawtooth');tone(515,.42,.18,'sawtooth');},
  crashSnd=p=>{burst(.7,850,Math.min(.9,p/14)+.2);burst(.25,3200,.25,'highpass');tone(58,.45,.5)};
['pointerdown','keydown'].forEach(e=>addEventListener(e,initAudio));
document.addEventListener('click',e=>{if(e.target.closest('button'))beep();});
{const hb=document.createElement('button'),sb=document.createElement('button');hb.className=sb.className='btn alt';hb.textContent='Horn (H)';sb.textContent='Sound: on';
 hb.onclick=horn;sb.onclick=()=>{A.on=!A.on;if(A.master)A.master.gain.value=A.on?S.vol/100:0;sb.textContent='Sound: '+(A.on?'on':'off');};$('bar').append(hb,sb);}
addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h'&&e.target.tagName!=='INPUT')horn();});

/* ---------- phone ---------- */
let phoneApp=null;
const APPS=[['garage','🚗','Garage','linear-gradient(#ffb340,#ff7a00)'],['homes','🏠','Homes','linear-gradient(#5fe27f,#1fa84a)'],['bank','💳','Bank','linear-gradient(#4aa8ff,#0a5fd8)'],['clock','🕒','Clock','linear-gradient(#444,#111)'],
 ['msg','💬','Messages','linear-gradient(#6cf07f,#22b54a)'],['market','🛒','Market','linear-gradient(#ff5c7a,#d11a45)'],['police','🚓','Police','linear-gradient(#8a85ff,#4339d6)']];
window.openApp=a=>{if(a==='msg'){toast('Lamar: Meet me by the Car Wash!');return;}if(a==='police'){toast('LSPD: Keep the peace!');return;}phoneApp=a;renderPhone();};
window.repairCar=async()=>{
  const c=Math.ceil((100-G.hp)*40);
  if(me.money<c)return toast('Not enough money.');
  if(isGuest){ me.money-=c; $('money').textContent='$'+me.money.toLocaleString(); }
  else await ref.update({money:firebase.firestore.FieldValue.increment(-c)});
  G.reset();toast('Vehicle washed & repaired!');renderPhone();
};
function renderPhone(){
  if(!me||!$('pBody'))return; const b=$('pBody'),ow=t=>ALL.filter(i=>i.type===t&&(me[t]||[]).includes(i.id));
  if(!phoneApp){b.innerHTML=`<div class="wid"><b id="wT">${fmt(gameHour())}</b><small>Strawberry · Los Santos</small></div><div class="grid">${APPS.map(a=>`<div class="ic" onclick="openApp('${a[0]}')"><div class="i" style="background:${a[3]}">${a[1]}</div><span>${a[2]}</span></div>`).join('')}</div>`;return;}
  const cost=Math.ceil((100-G.hp)*40);
  const cells=l=>l.length?l.map(i=>`<div class="cell" style="display:flex;justify-content:space-between;align-items:center"><b>${i.name}</b><button class="btn" style="padding:5px 10px;font-size:12px" onclick="selectCar('${i.id}')">Select</button></div>`).join(''):'<div class="cell">Nothing yet.</div>';
  const pages={
    garage:cells(ow('cars'))+`<div class="cell">Condition<div class="hp"><i style="width:${G.hp}%"></i></div><small>${Math.round(G.hp)}%</small><br><button class="btn" style="margin-top:8px" onclick="repairCar()" ${G.hp>=99?'disabled':''}>Repair $${cost.toLocaleString()}</button></div>`,
    homes:ow('houses').length?ow('houses').map(i=>`<div class="cell"><b>${i.name}</b></div>`).join(''):'<div class="cell">No properties owned.</div>',
    market:ALL.filter(i=>i.type==='houses'&&!(me.houses||[]).includes(i.id)).map(i=>`<div class="cell"><b>${i.name}</b><br><small>$${i.price.toLocaleString()}</small><br><button class="btn" style="margin-top:6px" onclick="buyHouse('${i.id}',${i.price})">Buy Property</button></div>`).join('')||'<div class="cell">Sold out.</div>',
    bank:`<div class="cell"><small>Balance</small><br><b style="font-size:26px;color:#4ade80">$${me.money.toLocaleString()}</b></div>`,
    clock:`<div class="cell"><b style="font-size:34px" id="wT">${fmt(gameHour())}</b></div>`};
  b.innerHTML=`<div class="ttl" onclick="phoneApp=null;renderPhone()">‹ ${APPS.find(a=>a[0]===phoneApp)[2]}</div>${pages[phoneApp]}`;
}
window.buyHouse=async(id,p)=>{
  if(me.money<p)return toast('Not enough cash.');
  if(isGuest){ me.money-=p; me.houses=[...(me.houses||[]),id]; $('money').textContent='$'+me.money.toLocaleString(); }
  else await ref.update({money:firebase.firestore.FieldValue.increment(-p),houses:firebase.firestore.FieldValue.arrayUnion(id)});
  renderPhone();toast('Property acquired!');
};
function togPhone(){const p=$('pPhone'),o=p.style.display==='block';document.querySelectorAll('.panel').forEach(x=>x.style.display='none');if(!o){phoneApp=null;renderPhone();p.style.display='block';}}
$('pHome').onclick=()=>{if(phoneApp){phoneApp=null;renderPhone();}else $('pPhone').style.display='none';};

/* ---------- settings & world layout ---------- */
const S={sound:1,traffic:1,people:1,shadows:1,bloom:1,vol:60},PL={x:-2.2,z:8,h:Math.PI};let WB=[];
// Divided avenue: left boulevard (x = -24), median strip (x = -11), right street by Car Wash (x = 0)
const RD=[
  {v:1,c:0,lo:-900,hi:900},
  {v:1,c:-24,lo:-900,hi:900},
  {v:0,c:-140,lo:-900,hi:900},
  {v:0,c:160,lo:-900,hi:900},
  {v:1,c:240,lo:-900,hi:900},
  {v:1,c:-240,lo:-900,hi:900}
];

function togSet(){const p=$('pSet'),o=p.style.display==='block';document.querySelectorAll('.panel').forEach(x=>x.style.display='none');if(!o){renderSet();p.style.display='block';}}
function renderSet(){
  $('setBody').innerHTML=[['sound','🔊 Sound Effects'],['traffic','🚗 AI Traffic'],['people','🚶 Pedestrians'],['shadows','🌓 Sun Shadows'],['bloom','✨ Post-Processing Bloom']].map(([k,l])=>`<div class="row"><span>${l}</span><button class="btn ${S[k]?'':'alt'}" onclick="tgl('${k}')">${S[k]?'ON':'OFF'}</button></div>`).join('')
  +`<div class="row"><span>Master Volume</span><input type="range" min="0" max="100" value="${S.vol}" oninput="setVol(this.value)" style="width:55%"></div>`;
}
window.tgl=k=>{S[k]=S[k]?0:1;if(k==='sound'){A.on=!!S.sound;if(A.master)A.master.gain.value=A.on?S.vol/100:0;}renderSet();};
window.setVol=v=>{S.vol=+v;if(A.master&&A.on)A.master.gain.value=S.vol/100;};
{const b=document.createElement('button');b.className='btn alt';b.textContent='⚙ Settings';b.onclick=togSet;$('bar').append(b);}
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();if(k==='p')togPhone();if(k==='c')togSet();});

/* ---------- GTA V Style Rectangular Radar Minimap Rendering ---------- */
function drawMinimap(){
  const c=$('minimapC'), g=c.getContext('2d');
  if(c.width!==225||c.height!==140){c.width=225;c.height=140;}
  g.clearRect(0,0,225,140);

  g.save();
  g.translate(112.5, 75);
  g.rotate(PL.h - Math.PI);

  // Dark city block base
  g.fillStyle='#1f242b';
  g.fillRect(-600,-600,1200,1200);

  g.translate(-PL.x, -PL.z);

  // Green grassy medians & parks
  g.fillStyle='#2b3d2c';
  g.fillRect(-15.5, -900, 9, 1800);

  // Asphalt Roads
  g.fillStyle='#454c56';
  RD.forEach(r=>{
    if(r.v) g.fillRect(r.c-7, r.lo, 14, r.hi-r.lo);
    else g.fillRect(r.lo, r.c-7, r.hi-r.lo, 14);
  });

  // Building footprints
  g.fillStyle='#2e353f';
  WB.forEach(b=>g.fillRect(b.x-b.hx, b.z-b.hz, b.hx*2, b.hz*2));

  // Car Wash Icon
  g.fillStyle='#facc15';
  g.fillRect(10, -28, 6, 6);

  g.restore();

  // Player White Radar Arrow in Center
  g.save();
  g.translate(112.5, 75);
  g.fillStyle='#ffffff'; g.strokeStyle='#000000'; g.lineWidth=1.5;
  g.beginPath();
  g.moveTo(0,-7); g.lineTo(5,6); g.lineTo(0,3); g.lineTo(-5,6); g.closePath();
  g.fill(); g.stroke();
  g.restore();
}
