/* VEYL — main.js (build 2: Kael third-person +(foundations for) actors).
   Classic scripts. Exposes window.VEYL for actors.js (NPCs, enemies, quests). */
(function(){
"use strict";
var prog = function(t){ window.dispatchEvent(new CustomEvent('dragon:progress',{detail:t})); };
if (!window.THREE) { prog('THREE failed to load'); return; }
if (!window.KAEL) { prog('kael.js missing'); return; }

var canvas = document.getElementById('game');
var renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
} catch(e){ prog('WebGL blocked: '+e.message); return; }
var IS_TOUCH = ('ontouchstart' in window);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.5 : 2));
// auto-quality governor: thermal throttle shows up as trembling. Shed load to hold fps.
var perfQ = { acc: 0, n: 0, low: 0, level: 0 };
function perfTick(dt){
  perfQ.acc += dt; perfQ.n++;
  if (perfQ.acc >= 2) {
    var fps = perfQ.n / perfQ.acc;
    perfQ.acc = 0; perfQ.n = 0;
    perfQ.fps = fps;
    if (fps < 24 && perfQ.level < 2) {
      perfQ.level++;
      if (perfQ.level === 1) { renderer.setPixelRatio(1); scene.fog.density = 0.004; }
      if (perfQ.level === 2) { scene.fog.density = 0.0055; perfQ.noDust = true; }
    }
  }
}
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0405);
scene.fog = new THREE.FogExp2(0x140607, 0.0028);
scene.add(new THREE.HemisphereLight(0x5a2a33, 0x0b0506, 0.8));
var moon = new THREE.DirectionalLight(0x8a97b8, 0.55);
moon.position.set(-120, 200, 80); scene.add(moon);
var ember = new THREE.PointLight(0xff5a14, 1.1, 260, 2);
ember.position.set(0, 40, 40); scene.add(ember);

var camera = new THREE.PerspectiveCamera(62, window.innerWidth/window.innerHeight, 0.5, 2500);
var yaw = 0, pitch = 0.12, CAMD = 9;   // orbit behind Kael (0 = looking north, Kael's facing)
var camPos = new THREE.Vector3(0, 14, 200), camDist = CAMD, camFov = 62;
// dust pool (billboard sprites)
var dustTex = (function(){
  var c = document.createElement('canvas'); c.width = c.height = 64;
  var x = c.getContext('2d');
  var g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(200,120,80,0.55)'); g.addColorStop(1, 'rgba(200,120,80,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
var dusts = [];
function spawnPuff(x, y, z, big){
  if (perfQ.level >= 2 && !big) return;   // thermal shed: skip footstep dust
  var m;
  for (var i = 0; i < dusts.length; i++) if (!dusts[i].on) { m = dusts[i]; break; }
  if (!m) {
    if (dusts.length >= 26) return;
    m = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false })), on: false, life: 0 };
    scene.add(m.sp); dusts.push(m);
  }
  m.on = true; m.life = big ? 0.7 : 0.45;
  m.max = m.life; m.sp.position.set(x, y + 0.3, z);
  m.sp.scale.set(big ? 2.2 : 1.2, big ? 2.2 : 1.2, 1);
  m.sp.material.opacity = 0.6;
}

// ---------- audio: licensed loop + synth SFX ----------
var AudioSys = { ctx: null };
var noiseBuf = null;
function initAudio(){
  var a = document.createElement('audio');
  AudioSys.el = a;
  a.loop = true; a.volume = 0.55; a.preload = 'auto';
  try {
    AudioSys.ctx = new (window.AudioContext || window.webkitAudioContext)();
    // master lowpass for death sweep (ambience routed through it)
    AudioSys.master = AudioSys.ctx.createBiquadFilter();
    AudioSys.master.type = 'lowpass'; AudioSys.master.frequency.value = 18000;
    AudioSys.master.connect(AudioSys.ctx.destination);
    try {
      AudioSys.src = AudioSys.ctx.createMediaElementSource(a);
      AudioSys.src.connect(AudioSys.master);
    } catch(e){}
    // shared noise buffer for footsteps/clash
    noiseBuf = AudioSys.ctx.createBuffer(1, AudioSys.ctx.sampleRate*0.15, AudioSys.ctx.sampleRate);
    var ch = noiseBuf.getChannelData(0);
    for (var i = 0; i < ch.length; i++) ch[i] = Math.random()*2 - 1;
    // drone hum: detuned saws through lowpass, gain driven by proximity
    AudioSys.humOsc = AudioSys.ctx.createOscillator(); AudioSys.humOsc.type = 'sawtooth';
    AudioSys.humOsc.frequency.value = 82;
    AudioSys.humOsc2 = AudioSys.ctx.createOscillator(); AudioSys.humOsc2.type = 'sawtooth';
    AudioSys.humOsc2.frequency.value = 123;
    AudioSys.humFilter = AudioSys.ctx.createBiquadFilter();
    AudioSys.humFilter.type = 'lowpass'; AudioSys.humFilter.frequency.value = 260;
    AudioSys.humGain = AudioSys.ctx.createGain(); AudioSys.humGain.gain.value = 0;
    AudioSys.humOsc.connect(AudioSys.humFilter); AudioSys.humOsc2.connect(AudioSys.humFilter);
    AudioSys.humFilter.connect(AudioSys.humGain); AudioSys.humGain.connect(AudioSys.master);
    AudioSys.humOsc.start(); AudioSys.humOsc2.start();
  } catch(e){}
  function out(node){ try { node.connect(AudioSys.master || AudioSys.ctx.destination); } catch(e2){ try { node.connect(AudioSys.ctx.destination); } catch(e3){} } }
  AudioSys.out = out;
  var s1 = document.createElement('source'); s1.src = 'audio/ambience.mp3?v=2'; s1.type = 'audio/mpeg';
  var s2 = document.createElement('source'); s2.src = 'audio/ambience.ogg?v=2'; s2.type = 'audio/ogg';
  a.appendChild(s1); a.appendChild(s2);
  var p = a.play(); if (p && p.catch) p.catch(function(){});
}
function blip(freq, dur, type, vol){
  if (!AudioSys.ctx) return;
  try {
    var o = AudioSys.ctx.createOscillator(), g = AudioSys.ctx.createGain();
    o.type = type || 'sawtooth'; o.frequency.value = freq || 160;
    g.gain.setValueAtTime(vol || 0.12, AudioSys.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AudioSys.ctx.currentTime + (dur || 0.15));
    o.connect(g); g.connect(AudioSys.ctx.destination);
    o.start(); o.stop(AudioSys.ctx.currentTime + (dur || 0.15));
  } catch(e){}
}
function noiseHit(freq, q, dur, vol){
  if (!AudioSys.ctx || !noiseBuf) return;
  try {
    var s = AudioSys.ctx.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = 0.85 + Math.random()*0.3;          // ±8%+ pitch variation
    var f = AudioSys.ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = freq; f.Q.value = q || 1;
    var g = AudioSys.ctx.createGain();
    g.gain.setValueAtTime(vol, AudioSys.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AudioSys.ctx.currentTime + dur);
    s.connect(f); f.connect(g);
    if (AudioSys.out) AudioSys.out(g); else g.connect(AudioSys.ctx.destination);
    s.start(); s.stop(AudioSys.ctx.currentTime + dur);
  } catch(e){}
}
function surfaceAt(x, z){
  if (Math.abs(x) < 14 && z > -26 && z < 122) return 'stone';  // stairs/avenue/court
  if (Math.abs(x) < 27 && z <= -12 && z >= -71) return 'stone';// hall/sanctuary
  if (x > 96 && z > 20 && z < 100) return 'wood';              // piers
  if (Math.abs(x) > 84 || z < -144 || z > 114) return 'dirt';
  return 'dirt';
}
window.SFX = {
  swing: function(){ blip(320, 0.12, 'sawtooth', 0.08); },
  hit:   function(){ blip(90, 0.25, 'square', 0.16); },
  hurt:  function(){ blip(70, 0.35, 'sawtooth', 0.2); },
  ui:    function(){ blip(660, 0.06, 'sine', 0.07); },
  choice:function(){ blip(440, 0.1, 'sine', 0.09); setTimeout(function(){ blip(550,0.12,'sine',0.09); }, 110); },
  step:  function(x, z){
    var s = surfaceAt(x, z);
    if (s === 'stone') noiseHit(2400, 2.5, 0.09, 0.10);
    else if (s === 'wood') noiseHit(850, 2, 0.12, 0.13);
    else noiseHit(380, 0.8, 0.14, 0.15);
  },
  clash: function(){ blip(1240, 0.07, 'square', 0.1); noiseHit(3200, 3, 0.08, 0.09); },
  hum:   function(level){
    if (!AudioSys.humGain) return;
    try {
      var g = AudioSys.humGain.gain;
      g.setTargetAtTime(Math.min(0.2, level), AudioSys.ctx.currentTime, 0.3);
    } catch(e){}
  },
  sweep: function(down){
    if (!AudioSys.master) return;
    try {
      AudioSys.master.frequency.setTargetAtTime(down ? 280 : 18000, AudioSys.ctx.currentTime, down ? 0.8 : 0.4);
    } catch(e){}
  }
};

// ---------- HUD ----------
var objText = document.getElementById('obj-text');
var actBanner = document.getElementById('act-banner');
var hpFill = document.getElementById('hp-fill');
var toastEl = document.getElementById('toast'), toastT = null;
function setObjective(t){ objText.textContent = t; }
function showAct(i){
  var a = window.VEYL_STORY.acts[i];
  document.getElementById('act-title').textContent = a.title;
  document.getElementById('act-sub').textContent = a.sub;
  actBanner.classList.remove('hidden');
  actBanner.style.animation = 'none'; void actBanner.offsetWidth; actBanner.style.animation = '';
  clearTimeout(showAct._t);
  showAct._t = setTimeout(function(){ actBanner.classList.add('hidden'); }, 4300);
}
function toast(t, ms){
  toastEl.textContent = t; toastEl.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.add('hidden'); }, ms || 2600);
}
function setHP(v){ hpFill.style.width = Math.max(0, v)+'%'; }

// ---------- dialogue engine v2: beats, portraits, flags, inline choices ----------
// Script is an array of nodes:
//   ["NAME", "text with [p] short beat, [P] long beat"]   line
//   { choice: [{label, set:{flag:val}, goto:"label"|null, cb}] }   player choice
//   { set: {flag: value} }                                flag write
//   { if: "flag", then: [...], else: [...] }              conditional splice
//   { label: "name" }                                     jump target
//   { jump: "name" }                                      goto
//   { end: true }                                         close now
window.VEYL_FLAGS = {};
var SPEAK_COLORS = { KAEL: '#d9a441', DREN: '#8a97b8', SELLA: '#ff7b14', ISSA: '#e8dcc0',
  SERPENT: '#c1121f', CHRONICLE: '#8a6f52', 'THE END?': '#c1121f' };
var dlg = document.getElementById('dlg'), dlgName = document.getElementById('dlg-name'),
    dlgText = document.getElementById('dlg-text'),
    dlgChoices = document.getElementById('dlg-choices');
var convo = null, line = 0, typing = null, convoDone = null, endChoices = null;
function flagTrue(f){ var v = window.VEYL_FLAGS[f]; return v === true || (typeof v === 'number' && v > 0); }
function runNode(nd){
  if (Array.isArray(nd)) { showLine(nd[0], nd[1]); return false; }
  if (nd.set) { for (var k in nd.set) window.VEYL_FLAGS[k] = nd.set[k]; return true; }
  if (nd.if) {
    var branch = flagTrue(nd.if) ? (nd.then || []) : (nd.else || []);
    convo = convo.slice(0, line + 1).concat(branch, convo.slice(line + 1));
    return true;
  }
  if (nd.label) return true;
  if (nd.jump) {
    for (var i = 0; i < convo.length; i++)
      if (!Array.isArray(convo[i]) && convo[i].label === nd.jump) { line = i; return showLineNode(), false; }
    return true;
  }
  if (nd.choice) { showChoices(nd.choice); return false; }
  if (nd.end) { closeConvo(); return false; }
  return true;
}
function showLineNode(){ return runNode(convo[line]); }
var dlgSkip = document.getElementById('dlg-skip');
function startConvo(lines, opts){
  opts = opts || {};
  convo = lines.slice(); line = 0;
  convoDone = opts.onDone || null; endChoices = opts.choices || null;
  dlg.classList.remove('hidden'); dlgChoices.classList.add('hidden'); dlgChoices.innerHTML = '';
  if (opts.skip) {
    dlgSkip.classList.remove('hidden');
    dlgSkip.onclick = function(ev){ ev.stopPropagation(); window.SFX.ui(); line = convo.length; stepConvo(); };
  } else dlgSkip.classList.add('hidden');
  stepConvo();
}
function stepConvo(){
  while (line < convo.length) {
    if (!runNode(convo[line])) return;   // line shown or choices open or closed
    line++;
  }
  if (endChoices) { showChoices(endChoices); endChoices = null; return; }
  closeConvo();
}
function showLine(sp, tx){
  var key = String(sp).split(',')[0].split(' ')[0].toUpperCase();
  dlgName.textContent = '◆ ' + sp;
  dlgName.style.color = SPEAK_COLORS[key] || '#ff7b14';
  dlgText.textContent = '';
  stopType();
  // tokenize beats: [p]=350ms, [P]=900ms
  var toks = [], buf = '';
  for (var i = 0; i < tx.length; i++) {
    if (tx[i] === '[' && (tx[i+1] === 'p' || tx[i+1] === 'P') && tx[i+2] === ']') {
      if (buf) { toks.push({ t: 'txt', s: buf }); buf = ''; }
      toks.push({ t: 'wait', ms: tx[i+1] === 'p' ? 350 : 950 });
      i += 2;
    } else buf += tx[i];
  }
  if (buf) toks.push({ t: 'txt', s: buf });
  dlgText.dataset.full = tx.replace(/\[p\]|\[P\]/g, '');
  var ti = 0, ci = 0, cur = '';
  function drive(){
    if (ti >= toks.length) { typing = null; return; }
    var tk = toks[ti];
    if (tk.t === 'wait') {
      ti++; ci = 0; typing = setTimeout(drive, tk.ms); return;
    }
    cur += tk.s[ci++];
    dlgText.textContent = cur;
    if (ci >= tk.s.length) { ti++; ci = 0; }
    typing = setTimeout(drive, /[,.!?;:—]/.test(tk.s[ci-1]) ? 70 : 18);  // punctuation breathes
  }
  drive();
}
function stopType(){ if (typing) { clearInterval(typing); clearTimeout(typing); typing = null; } }
function advanceConvo(){
  if (!convo) return;
  window.SFX.ui();
  if (dlgText.textContent.length < dlgText.dataset.full.length) {
    stopType();
    dlgText.textContent = dlgText.dataset.full; return;
  }
  line++;
  stepConvo();
}
function showChoices(list){
  dlgChoices.innerHTML = ''; dlgChoices.classList.remove('hidden');
  list.forEach(function(c){
    var b = document.createElement('button'); b.textContent = c.label;
    b.addEventListener('click', function(ev){
      ev.stopPropagation(); window.SFX.choice();
      if (c.set) for (var k in c.set) window.VEYL_FLAGS[k] = c.set[k];
      dlgChoices.classList.add('hidden');
      if (c.goto) {
        for (var i = 0; i < convo.length; i++)
          if (!Array.isArray(convo[i]) && convo[i].label === c.goto) { line = i; stepConvo(); return; }
      }
      if (c.cb) { var cb = c.cb; closeConvo(); cb(); return; }
      line++; stepConvo();
    });
    dlgChoices.appendChild(b);
  });
}
function closeConvo(){
  stopType();
  dlg.classList.add('hidden'); dlgChoices.classList.add('hidden');
  dlgSkip.classList.add('hidden');
  convo = null; var f = convoDone; convoDone = null; endChoices = null; if (f) f();
}
dlg.addEventListener('click', advanceConvo);

// ---------- world + Kael ----------
var K = null, kaelPos = new THREE.Vector3(0, 0, 168);
var kaelYaw = Math.PI;   // facing north (-z)
var world = null, texMesh = null, colliders = [], bloodMats = [], bloodTex = null, marker = null;
var rayc = new THREE.Raycaster(), rayDir = new THREE.Vector3(0, -1, 0), rayFrame = 0;
function makeBloodTexture(){
  var c = document.createElement('canvas'); c.width = c.height = 128;
  var x = c.getContext('2d');
  x.fillStyle = '#ffd9d9'; x.fillRect(0, 0, 128, 128);
  for (var i = 0; i < 90; i++) {
    x.strokeStyle = 'rgba(' + (120+Math.random()*120|0) + ',10,16,' + (0.25+Math.random()*0.4) + ')';
    x.lineWidth = 1 + Math.random()*3;
    x.beginPath();
    var sx = Math.random()*128, sy = Math.random()*128;
    x.moveTo(sx, sy);
    x.bezierCurveTo(sx+20, sy+10, sx-10, sy+40, sx+15, sy+70);
    x.stroke();
  }
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return t;
}
new THREE.GLTFLoader().load('models/veyl_city.glb?v=2',
  function(g){
    world = g.scene; scene.add(world);
    // solid-only collider set: tex mesh (skip transparent blood/glow/gold)
    world.traverse(function(o){
      if (o.isMesh && o.material && o.material.name === 'tex') texMesh = o;
    });
    // blood water: scrolling flow map
    bloodTex = makeBloodTexture();
    world.traverse(function(o){
      if (o.material && o.material.name === 'blood' && bloodMats.indexOf(o.material) < 0) {
        o.material.map = bloodTex; o.material.needsUpdate = true; bloodMats.push(o.material);
      }
    });
    // objective beacon: thin beam + ground ring + bobbing chevron (reads as UI, not geometry)
    marker = new THREE.Group();
    var beamMat = new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.28,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 30, 8, 1, true), beamMat);
    beam.position.y = 15; marker.add(beam);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.22, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffc861, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.6; marker.add(ring);
    marker.userData.ring = ring;
    var chev = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffc861, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    chev.rotation.x = Math.PI; chev.position.y = 21; marker.add(chev);
    marker.userData.chev = chev;
    marker.visible = false;
    scene.add(marker);
    // colliders
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'models/colliders.json?v=2', true);
    xhr.onload = function(){ try { colliders = JSON.parse(xhr.responseText).block || []; } catch(e){} };
    xhr.send();
    K = window.KAEL.build();
    K.root.position.copy(kaelPos);
    scene.add(K.root);
    prog('ready.');
    window.dispatchEvent(new CustomEvent('dragon:ready'));
    setObjective(window.VEYL_STORY.acts[0].objective);
    showAct(0);
    startConvo(window.VEYL_STORY.intro);
    if (window.VEYL_ONREADY) window.VEYL_ONREADY();
  },
  function(xhr){ if (xhr.total) prog('loading the capital… '+Math.round(xhr.loaded/xhr.total*100)+'%'); },
  function(err){ prog('GLB failed: '+(err && err.message || err)); }
);

// walkable heights (city flat 0; temple route rises; pyramid mass blocks)
function groundY(x, z){
  if (Math.abs(x) < 10 && z < -2 && z > -26) return 43*(-2-z)/24;      // blood stairs
  if (Math.abs(x) < 26 && z <= -12 && z >= -52) return 44;             // hall
  if (Math.abs(x) < 17 && z < -51 && z >= -71) return 47;              // sanctuary
  return 0;
}
function blocked(x, z){
  if (Math.abs(x) < 62 && z < -25 && z > -146) {
    if (Math.abs(x) < 10 && z > -26) return false;                    // stairs cut
    if (Math.abs(x) < 26 && z <= -12 && z >= -52) return false;       // hall
    if (Math.abs(x) < 17 && z < -51 && z >= -71) return false;        // sanctuary
    return true;                                                      // pyramid mass
  }
  return false;
}

// ---------- quest log + marker ----------
var questEl = document.getElementById('questlog');
function logStep(text, state){
  var d = document.createElement('div');
  if (state) d.className = state;
  d.textContent = text;
  questEl.appendChild(d);
  while (questEl.children.length > 5) questEl.removeChild(questEl.firstChild);
  var nows = questEl.querySelectorAll('.now');
  for (var i = 0; i < nows.length - 1; i++) { nows[i].className = 'done'; }
}
function setMarker(x, z){
  if (!marker) return;
  marker.position.set(x, groundY(x, z), z);
  marker.visible = true;
}

// ---------- player state (real physics) ----------
var player = { hp: 100, alive: true, attackCD: 0, moveAmt: 0, wantAttack: false,
               vy: 0, grounded: true, wantJump: false,
               coyote: 0, buffer: 0, jumpHeld: false };
function collide(nx, nz){
  var r = 0.7;
  for (var i = 0; i < colliders.length; i++) {
    var c = colliders[i];
    var dx = nx - c[0], dz = nz - c[1];
    if (Math.abs(dx) < c[2]+r && Math.abs(dz) < c[3]+r) return true;
  }
  return false;
}
function solidSet(){
  return texMesh ? [texMesh] : (world ? [world] : []);
}
function sampleGround(x, z){
  // raycast solid mesh (every 2nd frame; 4th when thermally throttled); zones as fallback
  rayFrame++;
  var every = (typeof perfQ !== 'undefined' && perfQ.level >= 1) ? 4 : 2;
  var set = solidSet();
  if (set.length && rayFrame % every === 0) {
    rayc.set(new THREE.Vector3(x, kaelPos.y + 6, z), rayDir);
    rayc.far = 60;
    var hits = rayc.intersectObjects(set, false);
    if (hits.length) return hits[0].point.y;
  }
  return groundY(x, z);
}
// hard snap: spawn/respawn never bury Kael (ray from well above, long reach)
function snapToGround(){
  var set = solidSet();
  if (set.length) {
    rayc.set(new THREE.Vector3(kaelPos.x, kaelPos.y + 40, kaelPos.z), rayDir);
    rayc.far = 120;
    var hits = rayc.intersectObjects(set, false);
    if (hits.length) { kaelPos.y = hits[0].point.y; player.gYs = kaelPos.y; player.vy = 0; return; }
  }
  kaelPos.y = groundY(kaelPos.x, kaelPos.z); player.gYs = kaelPos.y; player.vy = 0;
}
var vignette = document.getElementById('vignette'), vig = 0;
function hurt(dmg){
  if (!player.alive || player.iframes > 0) return;   // i-frames: no contact multihit
  player.hp -= dmg; setHP(player.hp); window.SFX.hurt();
  player.iframes = 0.7;
  vig = Math.min(1, vig + 0.55);
  if (player.hp <= 0) window.SFX.sweep(true);   // death: muffled world
  if (player.hp <= 0) {
    player.alive = false;
    toast('Kael falls. The blood takes him home… (tap to rise at the gate)', 6000);
    setTimeout(function(){
      kaelPos.set(0, 0, 168); kaelYaw = Math.PI;
      snapToGround();
      window.SFX.sweep(false);
      player.hp = 100; setHP(100); player.alive = true; player.iframes = 2;
      toast('Kael rises at the south gate.');
    }, 3200);
  }
}

// ---------- input ----------
var keys = {};
window.addEventListener('keydown', function(e){
  keys[e.code] = true;
  if (e.code === 'KeyE') { if (convo) advanceConvo(); else if (window.VEYL_INTERACT) window.VEYL_INTERACT(); }
  if (e.code === 'KeyF') player.wantAttack = true;
  if (e.code === 'Space') { player.wantJump = true; player.jumpHeld = true; }
  if (['ArrowUp','ArrowDown','Space'].indexOf(e.code) >= 0) e.preventDefault();
});
window.addEventListener('keyup', function(e){
  keys[e.code] = false;
  if (e.code === 'Space') {
    player.jumpHeld = false;
    if (player.vy > 3) player.vy *= 0.45;   // variable jump: release cuts rise
  }
});
var dragging = false, lx = 0, ly = 0, downT = 0;
canvas.addEventListener('pointerdown', function(e){ dragging = true; lx = e.clientX; ly = e.clientY; downT = performance.now(); });
window.addEventListener('pointerup', function(e){
  if (dragging && performance.now()-downT < 220 && Math.abs(e.clientX-lx) < 8 && Math.abs(e.clientY-ly) < 8)
    player.wantAttack = true;   // tap = swing
  dragging = false;
});
window.addEventListener('pointermove', function(e){
  if (!dragging || convo) return;
  yaw -= (e.clientX - lx) * 0.0034; pitch += (e.clientY - ly) * 0.0028;
  pitch = Math.max(-0.5, Math.min(0.9, pitch)); lx = e.clientX; ly = e.clientY;
});
var stick = { x: 0, y: 0, on: false };
(function(){
  var el = document.getElementById('stick'), nub = document.getElementById('nub'), id = null;
  function setNub(dx, dy){ nub.style.left = (35+dx)+'px'; nub.style.top = (35+dy)+'px'; }
  el.addEventListener('pointerdown', function(e){ id = e.pointerId; try{el.setPointerCapture(id);}catch(_){} move(e); });
  el.addEventListener('pointermove', function(e){ if (e.pointerId === id) move(e); });
  function end(e){ if (e.pointerId === id){ id = null; stick.x = stick.y = 0; stick.on = false; setNub(0,0); } }
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  function move(e){
    var r = el.getBoundingClientRect();
    var dx = e.clientX-(r.left+55), dy = e.clientY-(r.top+55);
    var m = Math.hypot(dx, dy) || 1, cl = Math.min(m, 42);
    dx = dx/m*cl; dy = dy/m*cl; setNub(dx, dy);
    stick.x = dx/42; stick.y = dy/42; stick.on = true;
  }
})();
function touchBtn(id, fn){
  var el = document.getElementById(id);
  el.addEventListener('pointerdown', function(e){ e.preventDefault(); e.stopPropagation(); fn(); });
  el.addEventListener('click', function(e){ e.preventDefault(); fn(); });
}
touchBtn('btn-act', function(){
  if (convo) advanceConvo(); else if (window.VEYL_INTERACT) window.VEYL_INTERACT();
});
touchBtn('btn-atk', function(){ player.wantAttack = true; });
touchBtn('btn-jump', function(){ player.wantJump = true; player.jumpHeld = true;
  setTimeout(function(){ player.jumpHeld = false; if (player.vy > 3) player.vy *= 0.45; }, 180); });

// ---------- loop ----------
var started = false, paused = false, clock = new THREE.Clock();
window.VEYL_PAUSED = function(){ return paused; };
function setPaused(p){
  paused = p;
  document.getElementById('paused').classList.toggle('hidden', !p);
  document.getElementById('pause-btn').textContent = p ? '▶' : '⏸';
  if (AudioSys.el) { try { p ? AudioSys.el.pause() : AudioSys.el.play(); } catch(e){} }
  clock.getDelta();
}
document.getElementById('pause-btn').addEventListener('click', function(){ if (started) setPaused(!paused); });
document.getElementById('resume-btn').addEventListener('click', function(){ setPaused(false); });
document.getElementById('restart-btn').addEventListener('click', function(){ window.location.reload(); });
window.addEventListener('keydown', function(e){ if (e.code === 'KeyP' && started) setPaused(!paused); });
function goFullscreen(){
  try {
    var el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(function(){});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch(e){}
}
document.getElementById('fs-btn').addEventListener('click', function(){
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    try {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch(e){}
  } else goFullscreen();
});
window.addEventListener('dragon:begin', function(){ started = true; initAudio(); goFullscreen(); clock.getDelta(); });
window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

var mvX = 0, mvZ = 0;
function tick(){
  requestAnimationFrame(tick);
  var dt = Math.min(clock.getDelta(), 0.05);
  if (paused) { renderer.render(scene, camera); return; }
  if (started && K && player.alive) {
    var busy = !!convo;
    mvX = mvZ = 0;
    if (!busy) {
      if (keys.KeyW || keys.ArrowUp) mvZ += 1;
      if (keys.KeyS || keys.ArrowDown) mvZ -= 1;
      if (keys.KeyA || keys.ArrowLeft) mvX -= 1;
      if (keys.KeyD || keys.ArrowRight) mvX += 1;
      if (stick.on) { mvX += stick.x; mvZ -= stick.y; }
    }
    var amt = Math.min(1, Math.hypot(mvX, mvZ));
    player.moveAmt = amt;
    // analog curve + accel/decel: velocity chases intent, never snaps
    var curved = Math.pow(Math.min(1, amt), 1.35);
    var sp = ((keys.ShiftLeft || keys.ShiftRight) ? 15 : 9) * curved;
    var dx = -Math.sin(yaw)*mvZ + Math.cos(yaw)*mvX;
    var dz = -Math.cos(yaw)*mvZ - Math.sin(yaw)*mvX;
    var dl = Math.hypot(dx, dz) || 1;
    var txv = dx/dl*sp, tzv = dz/dl*sp;
    if (curved < 0.05) { txv = 0; tzv = 0; }
    var rate = player.grounded ? (curved > 0.05 ? 9 : 13) : 2.5;
    player.vx = (player.vx || 0) + (txv - (player.vx || 0)) * Math.min(1, dt*rate);
    player.vz = (player.vz || 0) + (tzv - (player.vz || 0)) * Math.min(1, dt*rate);
    var spdNow = Math.hypot(player.vx, player.vz);
    player.moveAmt = Math.min(1, spdNow/9);
    if (spdNow > 0.4) {
      var nx = kaelPos.x + player.vx*dt, nz = kaelPos.z + player.vz*dt;
      nx = Math.max(-300, Math.min(300, nx)); nz = Math.max(-300, Math.min(330, nz));
      // axis-separated slide: colliders + temple mass
      if (!blocked(nx, kaelPos.z) && !collide(nx, kaelPos.z)) kaelPos.x = nx;
      else player.vx *= 0.2;
      if (!blocked(kaelPos.x, nz) && !collide(kaelPos.x, nz)) kaelPos.z = nz;
      else player.vz *= 0.2;
      var want = Math.atan2(player.vx, player.vz);
      var d = want - kaelYaw;
      while (d > Math.PI) d -= 2*Math.PI; while (d < -Math.PI) d += 2*Math.PI;
      kaelYaw += d * Math.min(1, dt*9);
      if (K) K.root.rotation.z += ((-d*0.35) - K.root.rotation.z) * Math.min(1, dt*6); // bank turns
    } else if (K) K.root.rotation.z *= 1 - Math.min(1, dt*6);
    var amt = player.moveAmt;
    // gravity + jump: coyote, buffer, variable height, heavy fall, apex hang
    // smoothed ground (raycast/zone source switches can't pop Kael's feet)
    player.gYs = (player.gYs === undefined ? sampleGround(kaelPos.x, kaelPos.z)
      : player.gYs + (sampleGround(kaelPos.x, kaelPos.z) - player.gYs) * Math.min(1, dt*10));
    var gy = player.gYs;
    if (player.grounded) player.coyote = 0.1; else player.coyote = Math.max(0, player.coyote - dt);
    if (player.wantJump) player.buffer = 0.14;
    else player.buffer = Math.max(0, player.buffer - dt);
    player.wantJump = false;
    if (player.buffer > 0 && player.coyote > 0) {
      player.vy = 9; player.grounded = false; player.coyote = 0; player.buffer = 0;
      if (K) K.root.scale.set(0.92, 1.08, 0.92);   // stretch on takeoff
    }
    var grav = player.vy > 0 ? (Math.abs(player.vy) < 2 ? 13 : 26) : 42;  // apex hang + heavy fall
    player.vy -= grav*dt;
    if (player.vy < -30) player.vy = -30;
    kaelPos.y += player.vy*dt;
    if (kaelPos.y <= gy) {
      if (!player.grounded && player.vy < -12) {
        window.SFX.hit(); if (K) { K.landDip = 1; K.root.scale.set(1.12, 0.86, 1.12); }
        spawnPuff(kaelPos.x, gy, kaelPos.z, true);
      }
      kaelPos.y = gy; player.vy = 0; player.grounded = true;
    } else if (kaelPos.y > gy + 0.05) {
      player.grounded = false;
    }
    if (K) {  // ease squash/stretch back to normal
      var s = K.root.scale;
      s.x += (1-s.x)*Math.min(1,dt*8); s.y += (1-s.y)*Math.min(1,dt*8); s.z += (1-s.z)*Math.min(1,dt*8);
    }
    if (!tick._snapped && world) { tick._snapped = true; snapToGround(); }
    K.root.position.set(kaelPos.x, kaelPos.y, kaelPos.z);
    K.root.rotation.y = kaelYaw;
    var atk = false;
    if (player.wantAttack && player.attackCD <= 0 && !busy) {
      atk = true; player.attackCD = 0.5;   // swing SFX lives in kael.animate
      if (window.VEYL_SWING) window.VEYL_SWING();
    }
    player.wantAttack = false;
    player.attackCD = Math.max(0, player.attackCD - dt);
    window.KAEL.animate(K, amt, dt, atk, !player.grounded);
    // camera rig: damped follow + shoulder offset + look-ahead + collision + FOV kick
    var fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    // smoothed look-ahead: raw per-frame deltas jitter (esp. throttled), so ease them
    var rvx = (kaelPos.x - (tick._px === undefined ? kaelPos.x : tick._px))/Math.max(dt, 0.001);
    var rvz = (kaelPos.z - (tick._pz === undefined ? kaelPos.z : tick._pz))/Math.max(dt, 0.001);
    tick._px = kaelPos.x; tick._pz = kaelPos.z;
    tick._lvx = (tick._lvx || 0) + (rvx - (tick._lvx || 0)) * Math.min(1, dt*4);
    tick._lvz = (tick._lvz || 0) + (rvz - (tick._lvz || 0)) * Math.min(1, dt*4);
    var la = Math.hypot(tick._lvx, tick._lvz);
    var lax = 0, laz = 0;
    if (la > 0.8) { lax = tick._lvx/la*Math.min(la*0.14, 1.6); laz = tick._lvz/la*Math.min(la*0.14, 1.6); }
    var tx = kaelPos.x + lax, ty = kaelPos.y + 2.6, tz = kaelPos.z + laz;
    tx += Math.cos(yaw)*0.9; tz += -Math.sin(yaw)*0.9;       // shoulder offset
    var dx = -fx*Math.cos(pitch), dz = -fz*Math.cos(pitch), dy = -Math.sin(pitch);
    var dl = Math.hypot(dx, dy, dz); dx/=dl; dy/=dl; dz/=dl;
    tick._cc = ((tick._cc || 0) + 1) % 2;                    // collision ray, every 2nd frame
    if (tick._cc === 0) {
      var cset = solidSet();
      if (cset.length) {
        rayc.set(new THREE.Vector3(tx, ty, tz), new THREE.Vector3(dx, dy, dz));
        rayc.far = CAMD + 1;
        var hits = rayc.intersectObjects(cset, false);     // solid only: never blinded by blood/glow
        tick._cd = hits.length ? Math.max(1.4, hits[0].distance - 0.5) : CAMD;
      }
    }
    var wantD = (tick._cd || CAMD);
    // GTA rule: snap IN fast (never show wall interiors), drift OUT slow (no jitter)
    var cRate = wantD < camDist ? 16 : 2.2;
    camDist += (wantD - camDist) * Math.min(1, dt*cRate);
    var cx = tx - dx*camDist, cz = tz - dz*camDist, cy = ty - dy*camDist;
    camPos.x += (cx - camPos.x) * Math.min(1, dt*7);         // damped follow
    camPos.y += (Math.max(1.6, cy) - camPos.y) * Math.min(1, dt*7);
    camPos.z += (cz - camPos.z) * Math.min(1, dt*7);
    camera.position.copy(camPos);
    camera.lookAt(tx, ty, tz);
    var wantFov = (keys.ShiftLeft || keys.ShiftRight) && amt > 0.3 ? 70 : 62;
    if (Math.abs(camera.fov - wantFov) > 0.1) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, dt*4);
      camera.updateProjectionMatrix();
    }
  }
  ember.intensity = 1.0 + Math.sin(performance.now()*0.0021)*0.18;
  perfTick(dt);
  if (debugOn) updateDebug();
  if (bloodTex) { bloodTex.offset.x += dt*0.025; bloodTex.offset.y += dt*0.011; }
  if (player.iframes > 0) {   // blink through invulnerability
    player.iframes -= dt;
    if (K) K.root.visible = (Math.floor(performance.now()/90) % 2 === 0) || player.iframes <= 0;
  } else if (K && !K.root.visible) K.root.visible = true;
  var lowHP = (player.hp < 35 && player.alive) ? (0.35 + Math.sin(performance.now()*0.006)*0.2) : 0;
  vig = Math.max(lowHP, vig - dt*1.4);
  vignette.style.opacity = vig.toFixed(2);
  for (var di = 0; di < dusts.length; di++) {
    var dm = dusts[di];
    if (!dm.on) continue;
    dm.life -= dt;
    if (dm.life <= 0) { dm.on = false; dm.sp.visible = false; continue; }
    dm.sp.visible = true;
    var f = dm.life / dm.max;
    dm.sp.material.opacity = 0.6 * f;
    dm.sp.position.y += dt * 1.4;
    var sc = dm.sp.scale.x + dt * 2.2;
    dm.sp.scale.set(sc, sc, 1);
  }
  if (marker && marker.visible) {
    var mp = performance.now()*0.004;
    marker.userData.ring.rotation.z += dt*1.4;
    marker.userData.chev.position.y = 21 + Math.sin(mp*1.6)*1.6;
    marker.children[0].material.opacity = 0.2 + Math.sin(mp)*0.1;
  }
  renderer.render(scene, camera);
}

// ---------- debug overlay (?debug=1): fps, state, one-tap report ----------
var debugOn = /[?&]debug=1/.test(window.location.search);
var debugEl = document.getElementById('debug');
if (debugOn) debugEl.classList.remove('hidden');
var dbgWorst = 0;
function updateDebug(){
  var info = renderer.info.render;
  var lines = [
    'fps ' + (perfQ.fps ? perfQ.fps.toFixed(0) : '?') + '  q' + perfQ.level +
    '  calls ' + info.calls + '  tris ' + (info.triangles/1000).toFixed(0) + 'k',
    'kael ' + kaelPos.x.toFixed(1) + ',' + kaelPos.y.toFixed(1) + ',' + kaelPos.z.toFixed(1) +
    (player.grounded ? ' GND' : ' AIR') + ' vy' + player.vy.toFixed(1),
    'cam d' + camDist.toFixed(1) + ' yaw' + yaw.toFixed(2) + ' pitch' + pitch.toFixed(2),
    'knight ' + (K ? (K.ready ? 'RIG' : (K.failMsg || 'loading...')) : 'none'),
    'hp ' + Math.round(player.hp) + ' act ' + ((window.VEYL_QUEST && window.VEYL_QUEST.act) || 0)
  ];
  debugEl.textContent = lines.join('\n') + '\n[tap to copy report]';
}
if (debugEl) debugEl.addEventListener('click', function(){
  var t = debugEl.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t);
});
// triple-tap top-left toggles debug without URL param
(function(){
  var taps = 0, lt = 0;
  document.addEventListener('pointerdown', function(e){
    if (e.clientX > 120 || e.clientY > 120) return;
    var n = performance.now();
    if (n - lt > 600) taps = 0;
    lt = n; taps++;
    if (taps >= 3) { taps = 0; debugOn = !debugOn; debugEl.classList.toggle('hidden', !debugOn); }
  });
})();

// public API for actors.js
window.VEYL = {
  scene: scene, camera: camera, player: player,
  kael: function(){ return K; }, kaelPos: kaelPos,
  getKaelYaw: function(){ return kaelYaw; },
  groundY: groundY, toast: toast, setObjective: setObjective, showAct: showAct,
  startConvo: startConvo, hurt: hurt, setHP: setHP, logStep: logStep, setMarker: setMarker,
  fx: function(x, y, z, big){ spawnPuff(x, y, z, big); if (!big) window.SFX.step(x, z); },
  isBusy: function(){ return !!convo; }
};
window.VEYL_ONREADY = null; window.VEYL_INTERACT = null; window.VEYL_SWING = null;
tick();
})();
