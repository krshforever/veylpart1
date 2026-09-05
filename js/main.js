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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
var yaw = Math.PI, pitch = 0.12, CAMD = 9;   // orbit behind Kael

// ---------- audio: licensed loop + synth SFX ----------
var AudioSys = { ctx: null };
function initAudio(){
  var a = document.createElement('audio');
  a.loop = true; a.volume = 0.55; a.preload = 'auto';
  var s1 = document.createElement('source'); s1.src = 'audio/ambience.mp3'; s1.type = 'audio/mpeg';
  var s2 = document.createElement('source'); s2.src = 'audio/ambience.ogg'; s2.type = 'audio/ogg';
  a.appendChild(s1); a.appendChild(s2);
  var p = a.play(); if (p && p.catch) p.catch(function(){});
  try {
    AudioSys.ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e){}
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
window.SFX = {
  swing: function(){ blip(320, 0.12, 'sawtooth', 0.08); },
  hit:   function(){ blip(90, 0.25, 'square', 0.16); },
  hurt:  function(){ blip(70, 0.35, 'sawtooth', 0.2); },
  ui:    function(){ blip(660, 0.06, 'sine', 0.07); },
  choice:function(){ blip(440, 0.1, 'sine', 0.09); setTimeout(function(){ blip(550,0.12,'sine',0.09); }, 110); }
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

// ---------- dialogue with choices ----------
var dlg = document.getElementById('dlg'), dlgName = document.getElementById('dlg-name'),
    dlgText = document.getElementById('dlg-text'),
    dlgChoices = document.getElementById('dlg-choices');
var convo = null, line = 0, typing = null, convoDone = null, convoChoices = null;
function startConvo(lines, opts){
  opts = opts || {};
  convo = lines; line = 0; convoDone = opts.onDone || null; convoChoices = opts.choices || null;
  dlg.classList.remove('hidden'); dlgChoices.classList.add('hidden'); dlgChoices.innerHTML = '';
  showLine();
}
function showLine(){
  dlgName.textContent = convo[line][0]; dlgText.textContent = '';
  clearInterval(typing); var tx = convo[line][1], i = 0;
  typing = setInterval(function(){
    dlgText.textContent = tx.slice(0, ++i);
    if (i >= tx.length) clearInterval(typing);
  }, 16);
}
function advanceConvo(){
  if (!convo) return;
  window.SFX.ui();
  if (dlgText.textContent.length < convo[line][1].length) {
    clearInterval(typing); dlgText.textContent = convo[line][1]; return;
  }
  line++;
  if (line >= convo.length) {
    if (convoChoices) { showChoices(); return; }
    closeConvo();
  } else showLine();
}
function showChoices(){
  dlgChoices.innerHTML = ''; dlgChoices.classList.remove('hidden');
  convoChoices.forEach(function(c){
    var b = document.createElement('button'); b.textContent = c.label;
    b.addEventListener('click', function(ev){
      ev.stopPropagation(); window.SFX.choice();
      var cb = c.cb; closeConvo(); if (cb) cb();
    });
    dlgChoices.appendChild(b);
  });
}
function closeConvo(){
  dlg.classList.add('hidden'); dlgChoices.classList.add('hidden');
  convo = null; var f = convoDone; convoDone = null; if (f) f();
}
dlg.addEventListener('click', advanceConvo);

// ---------- world + Kael ----------
var K = null, kaelPos = new THREE.Vector3(0, 0, 168);
var kaelYaw = Math.PI;   // facing north (-z)
var world = null, colliders = [], bloodMats = [], bloodTex = null, marker = null;
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
new THREE.GLTFLoader().load('models/veyl_city.glb',
  function(g){
    world = g.scene; scene.add(world);
    // blood water: scrolling flow map
    bloodTex = makeBloodTexture();
    world.traverse(function(o){
      if (o.material && o.material.name === 'blood' && bloodMats.indexOf(o.material) < 0) {
        o.material.map = bloodTex; o.material.needsUpdate = true; bloodMats.push(o.material);
      }
    });
    // objective beacon
    marker = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.6, 26, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.32,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    scene.add(marker);
    // colliders
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'models/colliders.json', true);
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
  marker.position.set(x, groundY(x, z) + 13, z);
  marker.visible = true;
}

// ---------- player state (real physics) ----------
var player = { hp: 100, alive: true, attackCD: 0, moveAmt: 0, wantAttack: false,
               vy: 0, grounded: true, wantJump: false };
function collide(nx, nz){
  var r = 0.7;
  for (var i = 0; i < colliders.length; i++) {
    var c = colliders[i];
    var dx = nx - c[0], dz = nz - c[1];
    if (Math.abs(dx) < c[2]+r && Math.abs(dz) < c[3]+r) return true;
  }
  return false;
}
function sampleGround(x, z){
  // raycast real mesh every 4th frame; zone heights as instant fallback
  rayFrame++;
  if (world && rayFrame % 4 === 0) {
    rayc.set(new THREE.Vector3(x, kaelPos.y + 6, z), rayDir);
    rayc.far = 30;
    var hits = rayc.intersectObject(world, true);
    if (hits.length) return hits[0].point.y;
  }
  return groundY(x, z);
}
function hurt(dmg){
  if (!player.alive) return;
  player.hp -= dmg; setHP(player.hp); window.SFX.hurt();
  if (player.hp <= 0) {
    player.alive = false;
    toast('Kael falls. The blood takes him home… (tap to rise at the gate)', 6000);
    setTimeout(function(){
      kaelPos.set(0, 0, 168); kaelYaw = Math.PI;
      player.hp = 100; setHP(100); player.alive = true;
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
  if (e.code === 'Space') player.wantJump = true;
  if (['ArrowUp','ArrowDown','Space'].indexOf(e.code) >= 0) e.preventDefault();
});
window.addEventListener('keyup', function(e){ keys[e.code] = false; });
var dragging = false, lx = 0, ly = 0, downT = 0;
canvas.addEventListener('pointerdown', function(e){ dragging = true; lx = e.clientX; ly = e.clientY; downT = performance.now(); });
window.addEventListener('pointerup', function(e){
  if (dragging && performance.now()-downT < 220 && Math.abs(e.clientX-lx) < 8 && Math.abs(e.clientY-ly) < 8)
    player.wantAttack = true;   // tap = swing
  dragging = false;
});
window.addEventListener('pointermove', function(e){
  if (!dragging || convo) return;
  yaw -= (e.clientX - lx) * 0.0034; pitch -= (e.clientY - ly) * 0.0028;
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
document.getElementById('btn-act').addEventListener('click', function(){
  if (convo) advanceConvo(); else if (window.VEYL_INTERACT) window.VEYL_INTERACT();
});
document.getElementById('btn-atk').addEventListener('click', function(){ player.wantAttack = true; });
document.getElementById('btn-jump').addEventListener('click', function(){ player.wantJump = true; });

// ---------- loop ----------
var started = false, clock = new THREE.Clock();
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
    var sp = ((keys.ShiftLeft || keys.ShiftRight) ? 15 : 9) * amt;
    if (amt > 0.05) {
      // camera-relative move dir
      var dx = -Math.sin(yaw)*mvZ + Math.cos(yaw)*mvX;
      var dz = -Math.cos(yaw)*mvZ - Math.sin(yaw)*mvX;
      var nx = kaelPos.x + dx*sp*dt, nz = kaelPos.z + dz*sp*dt;
      nx = Math.max(-300, Math.min(300, nx)); nz = Math.max(-300, Math.min(330, nz));
      // axis-separated slide: colliders + temple mass
      if (!blocked(nx, kaelPos.z) && !collide(nx, kaelPos.z)) kaelPos.x = nx;
      if (!blocked(kaelPos.x, nz) && !collide(kaelPos.x, nz)) kaelPos.z = nz;
      var want = Math.atan2(dx, dz);
      var d = want - kaelYaw;
      while (d > Math.PI) d -= 2*Math.PI; while (d < -Math.PI) d += 2*Math.PI;
      kaelYaw += d * Math.min(1, dt*10);
    }
    // gravity + jump + ground
    var gy = sampleGround(kaelPos.x, kaelPos.z);
    if (player.wantJump && player.grounded) { player.vy = 8.5; player.grounded = false; }
    player.wantJump = false;
    player.vy -= 26*dt;
    kaelPos.y += player.vy*dt;
    if (kaelPos.y <= gy) {
      if (!player.grounded && player.vy < -12) { /* landing thud */ window.SFX.hit(); }
      kaelPos.y = gy; player.vy = 0; player.grounded = true;
    } else if (kaelPos.y > gy + 0.05) {
      player.grounded = false;
    }
    K.root.position.set(kaelPos.x, kaelPos.y, kaelPos.z);
    K.root.rotation.y = kaelYaw;
    var atk = false;
    if (player.wantAttack && player.attackCD <= 0 && !busy) {
      atk = true; player.attackCD = 0.5; window.SFX.swing();
      if (window.VEYL_SWING) window.VEYL_SWING();
    }
    player.wantAttack = false;
    player.attackCD = Math.max(0, player.attackCD - dt);
    window.KAEL.animate(K, amt, dt, atk);
    // follow camera
    var tx = kaelPos.x, ty = kaelPos.y + 2.6, tz = kaelPos.z;
    var cx = tx + Math.sin(yaw)*Math.cos(pitch)*CAMD;
    var cz = tz + Math.cos(yaw)*Math.cos(pitch)*CAMD;
    var cy = ty + Math.sin(pitch)*CAMD;
    camera.position.set(cx, Math.max(1.6, cy), cz);
    camera.lookAt(tx, ty, tz);
  }
  ember.intensity = 1.0 + Math.sin(performance.now()*0.0021)*0.18;
  if (bloodTex) { bloodTex.offset.x += dt*0.025; bloodTex.offset.y += dt*0.011; }
  if (marker && marker.visible) marker.material.opacity = 0.24 + Math.sin(performance.now()*0.004)*0.12;
  renderer.render(scene, camera);
}

// public API for actors.js
window.VEYL = {
  scene: scene, camera: camera, player: player,
  kael: function(){ return K; }, kaelPos: kaelPos,
  getKaelYaw: function(){ return kaelYaw; },
  groundY: groundY, toast: toast, setObjective: setObjective, showAct: showAct,
  startConvo: startConvo, hurt: hurt, setHP: setHP, logStep: logStep, setMarker: setMarker,
  isBusy: function(){ return !!convo; }
};
window.VEYL_ONREADY = null; window.VEYL_INTERACT = null; window.VEYL_SWING = null;
tick();
})();
