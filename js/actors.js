/* VEYL — actors.js: NPCs, enemies, quest state machine, finale.
   Requires window.VEYL (main.js). Runs its own update loop. */
(function(){
"use strict";
var V = window.VEYL, S = window.VEYL_STORY;
if (!V) return;

function mat(c, e){
  var m = new THREE.MeshLambertMaterial({ color: c });
  if (e) m.emissive = new THREE.Color(e);
  return m;
}
function box(w,h,d,m,x,y,z){
  var o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
  o.position.set(x||0, y||0, z||0); return o;
}

/* ---------- NPCs: real Sketchfab bodies (CC-BY, credited) + role props ---------- */
var NPC_MODELS = {
  dren:  { url: 'models/guard/scene.gltf?v=2', h: 1.95 },   // Castle Guard, rigged+anim
  sella: { url: 'models/peasant/scene.gltf?v=2', h: 1.65, pickName: 'peasant woman1' },
  issa:  { url: 'models/priest/scene.gltf?v=2', h: 1.85 }   // Low Poly Priest, rigged
};
/* normalize any model: isolate named variant, feet at origin, target height */
function fitModel(model, spec){
  if (spec.pickName) {
    var keep = null;
    model.updateMatrixWorld(true);
    model.traverse(function(o){ if (o.name === spec.pickName) keep = o; });
    if (keep) { model.clear(); model.add(keep); keep.position.set(0, 0, 0); }
  }
  var bb = new THREE.Box3().setFromObject(model);
  var size = new THREE.Vector3(); bb.getSize(size);
  var s = spec.h / (size.y || 1);
  model.scale.setScalar(s);
  bb.setFromObject(model);
  model.position.sub(new THREE.Vector3((bb.min.x+bb.max.x)/2, bb.min.y, (bb.min.z+bb.max.z)/2));
  return model;
}
function buildNPC(opts){
  var g = new THREE.Group();
  g.position.set(opts.pos[0], V.groundY(opts.pos[0], opts.pos[2]), opts.pos[2]);
  V.scene.add(g);
  var rec = { obj: g, baseY: g.position.y, seed: Math.random()*10, npc: opts,
              mixer: null, model: null };
  var spec = NPC_MODELS[opts.id];
  if (spec) {
    new THREE.GLTFLoader().load(spec.url, function(r){
      var model = fitModel(r.scene, spec);
      g.add(model);
      rec.model = model;
      if (r.animations && r.animations.length) {
        rec.mixer = new THREE.AnimationMixer(model);
        rec.mixer.clipAction(r.animations[0]).play();
      }
      addProps(g, opts, spec.h);
    }, undefined, function(){ addProps(g, opts, 1.8); });
  } else addProps(g, opts, 1.8);
  return rec;
}
      var s = spec.h / (size.y || 1);
      model.scale.setScalar(s);
      bb.setFromObject(model);
      model.position.sub(new THREE.Vector3((bb.min.x+bb.max.x)/2, bb.min.y, (bb.min.z+bb.max.z)/2));
      g.add(model);
      rec.model = model;
      if (r.animations && r.animations.length) {
        rec.mixer = new THREE.AnimationMixer(model);
        rec.mixer.clipAction(r.animations[0]).play();
      }
      addProps(g, opts, spec.h);
    }, undefined, function(){ addProps(g, opts, 1.8); });
  } else addProps(g, opts, 1.8);
  return rec;
}
function addProps(g, opts, h){
  if (opts.spear) { // Dren's gate-spear
    g.add(box(0.09, 3.0, 0.09, mat(0x3a2a1a), 0.62, 1.5, 0));
    g.add(box(0.22, 0.5, 0.08, mat(0xb9c2cc), 0.62, 3.1, 0));
  }
  if (opts.staff) { // Issa's brand-staff
    g.add(box(0.1, 2.6, 0.1, mat(0x3a2a1a), 0.62, 1.3, 0));
    var orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0xff7b14, 0xff7b14));
    orb.position.set(0.62, 2.75, 0); g.add(orb); g.userData.orb = orb;
  }
  if (opts.id === 'sella') { // merchant lantern + shawl
    g.add(box(0.7, 0.25, 0.5, mat(0x4a1a2a), 0, h+0.15, 0));
    var l = box(0.3, 0.4, 0.3, mat(0xff7b14, 0xff7b14), 0.55, 1.2, 0.2); g.add(l);
  }
  if (opts.id === 'issa') { // dark hood
    g.add(box(0.52, 0.3, 0.54, mat(0x1a1a22), 0, h+0.05, -0.03));
  }
}

/* ---------- drone builder: hive chitin + wings ---------- */
function buildDrone(x, z){
  var g = new THREE.Group();
  var chitin = mat(0x2a1420), glow = mat(0xff5a14, 0xff5a14);
  var bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), chitin);
  bodyM.scale.set(1, 0.8, 1.3); g.add(bodyM);
  var eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 6), glow);
  eye.position.set(0, 0.15, 0.85); g.add(eye);
  var sting = box(0.18, 0.18, 1.1, chitin, 0, -0.1, -1.2); g.add(sting);
  var wmat = new THREE.MeshLambertMaterial({ color: 0x6a4a5a, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  var wL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), wmat);
  wL.position.set(-0.9, 0.45, -0.2); wL.rotation.z = 0.35; g.add(wL);
  var wR = wL.clone(); wR.position.x = 0.9; wR.rotation.z = -0.35; g.add(wR);
  g.position.set(x, V.groundY(x, z)+2.2, z);
  V.scene.add(g);
  return { obj: g, wL: wL, wR: wR, hp: 36, atkCD: 0, seed: Math.random()*10, dead: false,
           home: new THREE.Vector3(x, 0, z) };
}

function buildHusk(x, z){
  var g = new THREE.Group();
  g.position.set(x, V.groundY(x, z), z);
  V.scene.add(g);
  var rec = { obj: g, hp: 60, atkCD: 0, seed: Math.random()*10, dead: false,
              mixer: null, model: null, home: new THREE.Vector3(x, 0, z) };
  new THREE.GLTFLoader().load('models/cultist/scene.gltf?v=2', function(r){
    var model = r.scene;
    model.traverse(function(o){ if (/smg/i.test(o.name || '')) o.visible = false; }); // no guns in Veyl
    fitModel(model, { h: 1.9 });
    g.add(model);
    rec.model = model;
    // ember eyes on the hood
    var eL = box(0.09, 0.09, 0.05, mat(0xff5a14, 0xff5a14), -0.14, 1.58, 0.3);
    var eR = box(0.09, 0.09, 0.05, mat(0xff5a14, 0xff5a14), 0.14, 1.58, 0.3);
    g.add(eL); g.add(eR);
    if (r.animations && r.animations.length) {
      rec.mixer = new THREE.AnimationMixer(model);
      rec.mixer.clipAction(r.animations[0]).play();
    }
  });
  return rec;
}

/* ---------- quest state ---------- */
var Q = { act: 0, metDren: false, metSella: false, metIssa: false,
          drones: [], husks: [], dronesDead: 0, husksDead: 0,
          brand: false, serpentMet: false, over: false };
window.VEYL_QUEST = Q;

var npcs = [];
var interactTarget = null;
var interactEl = document.getElementById('interact');
var bossWrap = document.getElementById('boss-wrap');
var bossFill = document.getElementById('boss-fill');

V.VEYL_ONREADY = function(){ /* world ready; actors spawn on begin */ };
var spawned = false;
window.addEventListener('dragon:begin', function(){
  if (spawned) return; spawned = true;
  npcs.push(buildNPC({ id: 'dren', robe: 0x3a2028, trim: 0xd9a441, spear: true, pos: S.npc.dren.pos }));
  npcs.push(buildNPC({ id: 'sella', robe: 0x4a1a2a, trim: 0xff7b14, glowTrim: true, pos: S.npc.sella.pos }));
  npcs.push(buildNPC({ id: 'issa', robe: 0x1a1a22, trim: 0xe8dcc0, staff: true, pos: S.npc.issa.pos }));
  V.logStep('Enter the south gate', 'now');
  V.logStep('Speak with Guard Dren');
  V.setMarker(S.markers.dren[0], S.markers.dren[1]);
  V.toast('Find Guard Dren — follow the gold beacon north.', 4200);
});

function setAct(i){
  Q.act = i; V.showAct(i); V.setObjective(S.acts[i].objective);
}

/* ---------- interaction ---------- */
function nearestNPC(){
  var kp = V.kaelPos, best = null, bd = 36;
  npcs.forEach(function(n){
    var d = n.obj.position.distanceToSquared(kp);
    if (d < bd) { bd = d; best = n; }
  });
  return best;
}
window.VEYL_INTERACT = function(){
  if (V.isBusy()) return;
  var n = nearestNPC();
  if (n) talkTo(n.npc.id);
  else if (nearSerpent() && !Q.over) talkSerpent();
};

function talkTo(id){
  if (id === 'dren' && !Q.metDren) {
    V.startConvo(S.npc.dren.tree, { onDone: function(){
      Q.metDren = true; setAct(1);
      V.logStep('Enter the south gate', 'done');
      V.logStep('Find Sella\'s shop (lantern door)', 'now');
      V.setMarker(S.markers.sella[0], S.markers.sella[1]);
      V.toast('Act II — the market feeds the hive.', 3000);
    }});
  } else if (id === 'sella' && !Q.metSella) {
    V.startConvo(S.npc.sella.tree, { onDone: function(){
      Q.metSella = true;
      V.logStep('Find Sella\'s shop (lantern door)', 'done');
      V.logStep('Destroy the hive drones (0/3)', 'now');
      V.setMarker(S.markers.market[0], S.markers.market[1]);
      V.setObjective('Cleanse the hive drones in the market (0/3).');
      [[30,58],[44,72],[36,80]].forEach(function(p){ Q.drones.push(buildDrone(p[0], p[1])); });
      V.toast('They come off the stalls — steel out!', 3000);
    }});
  } else if (id === 'issa' && !Q.metIssa) {
    if (Q.dronesDead < 3) {
      V.startConvo([["ISSA","The market still hums, child. Finish it before you climb."]]);
      return;
    }
    V.startConvo(S.npc.issa.tree, { onDone: function(){
      Q.metIssa = true; Q.brand = true; setAct(2);
      V.logStep('Climb to Priest Issa', 'done');
      V.logStep('Enter the ember veil', 'now');
      V.setMarker(S.markers.stairs[0], S.markers.stairs[1]);
      window.SFX.choice(); V.toast(S.toasts.brand, 4000);
    }});
  } else {
    var flavor = {
      dren: [["DREN","North, exile. The avenue won't walk itself."]],
      sella: [["SELLA","Still breathing, still selling. The temple stairs, knight — mind the red ones."]],
      issa: [["ISSA","The brand burns with you. Go down the throat of the hall."]]
    };
    V.startConvo(flavor[id]);
  }
}

/* ---------- serpent finale ---------- */
var SERP = new THREE.Vector3(0, 47, -55);
var bossHP = 100;
function nearSerpent(){
  var dx = V.kaelPos.x - SERP.x, dz = V.kaelPos.z - SERP.z;
  return (dx*dx + dz*dz) < 100 && !Q.over;
}
function talkSerpent(){
  if (!Q.brand || Q.dronesDead < 3) {
    V.startConvo([["SERPENT","NOT YET, LITTLE REFUSAL. THE MARKET HUMS. THE BRAND UNLIT. COME BACK BURNING."]]);
    return;
  }
  Q.serpentMet = true;
  bossWrap.classList.remove('hidden');
  V.startConvo(S.npc.serpent.tree, { choices: S.npc.serpent.choices.map(function(c){
    return { label: c.label, cb: function(){ endGame(c.ending); } };
  })});
}
function endGame(which){
  Q.over = true;
  bossFill.style.width = (which === 'break' ? '0%' : '100%');
  document.body.style.transition = 'filter 2.5s';
  document.body.style.filter = which === 'break' ? 'brightness(1.6) saturate(0.4)' : 'brightness(0.5) saturate(1.6) hue-rotate(-30deg)';
  V.startConvo(S.endings[which], { onDone: function(){
    V.setObjective(which === 'break' ? 'THE DAWN REFUSAL — fin.' : 'THE BLEEDING REIGN — fin.');
    V.toast('Thank you for playing VEYL. Reload to walk it again.', 8000);
  }});
}

/* ---------- combat ---------- */
window.VEYL_SWING = function(){
  var kp = V.kaelPos, yaw = V.getKaelYaw();
  var fx = Math.sin(yaw), fz = Math.cos(yaw);
  var dmg = Q.brand ? 24 : 12;
  var hitAny = false;
  [Q.drones, Q.husks].forEach(function(list){
    list.forEach(function(e){
      if (e.dead) return;
      var dx = e.obj.position.x - kp.x, dz = e.obj.position.z - kp.z;
      var dist = Math.hypot(dx, dz);
      if (dist < 4.2 && (dx*fx + dz*fz) > 0.5) {
        e.hp -= dmg; hitAny = true; window.SFX.hit();
        e.obj.position.x += fx*0.8; e.obj.position.z += fz*0.8;
        if (e.hp <= 0) kill(e);
      }
    });
  });
  if (!hitAny) { /* swung at air */ }
};
var shake = 0;
function kill(e){
  e.dead = true; window.SFX.hit();
  if (Q.drones.indexOf(e) >= 0) {
    Q.dronesDead++; V.toast(S.toasts.droneDown + ' (' + Q.dronesDead + '/3)');
    V.setObjective('Cleanse the hive drones in the market (' + Q.dronesDead + '/3).');
    if (Q.dronesDead >= 3) {
      V.setObjective('Climb to Priest Issa in the court.');
      V.logStep('Destroy the hive drones (0/3)', 'done');
      V.logStep('Climb to Priest Issa', 'now');
      V.setMarker(S.markers.issa[0], S.markers.issa[1]);
      V.toast(S.toasts.marketClear, 3500);
    }
  } else {
    Q.husksDead++; V.toast(S.toasts.huskDown + ' (' + Q.husksDead + '/2)');
  }
}

/* ---------- per-frame ---------- */
var husksSpawned = false;
var clock2 = { last: performance.now() };
function loop(){
  requestAnimationFrame(loop);
  var now = performance.now();
  var dt = Math.min((now - clock2.last)/1000, 0.05);
  clock2.last = now;
  if (window.VEYL_PAUSED && window.VEYL_PAUSED()) return;
  var kp = V.kaelPos, t = now/1000;

  var talking = V.isBusy() ? nearestNPC() : null;
  npcs.forEach(function(n){
    if (n.mixer) n.mixer.update(dt);                              // rigged idle
    else n.obj.position.y = n.baseY + Math.sin(t*1.4 + n.seed)*0.05; // fallback breath
    if (talking === n) {                                          // speaking gesture
      var b = 1 + Math.sin(t*9)*0.015;
      n.obj.scale.set(b, 1 + Math.sin(t*9)*0.02, b);
    } else n.obj.scale.set(1, 1, 1);
    // body physics: NPCs hold ground, Kael can't walk through them
    var dx = kp.x - n.obj.position.x, dz = kp.z - n.obj.position.z;
    var d2 = dx*dx + dz*dz;
    if (d2 < 1.44 && d2 > 0.0001 && V.player.alive) {
      var d = Math.sqrt(d2), push = (1.2 - d);
      V.kaelPos.x += dx/d*push; V.kaelPos.z += dz/d*push;
    }
    // face Kael when near
    var dx = kp.x - n.obj.position.x, dz = kp.z - n.obj.position.z;
    if (dx*dx + dz*dz < 64) n.obj.rotation.y = Math.atan2(dx, dz);
    if (n.obj.userData.orb) n.obj.userData.orb.position.y = 2.75 + Math.sin(t*2.2)*0.08;
  });

  // interact prompt
  var near = nearestNPC();
  var showSerp = (!near && nearSerpent()) ? true : false;
  if ((near || showSerp) && !V.isBusy()) {
    interactEl.textContent = showSerp ? 'E — Face it' : 'E — Speak';
    interactEl.classList.remove('hidden');
  } else { interactEl.classList.add('hidden'); }

  // spawn husks on hall entry
  if (!husksSpawned && kp.z < -12 && Math.abs(kp.x) < 26) {
    V.logStep('Enter the ember veil', 'done');
    V.logStep('Face the Bleeding Serpent', 'now');
    V.setMarker(S.markers.serpent[0], S.markers.serpent[1]);
    husksSpawned = true;
    Q.husks.push(buildHusk(-12, -30)); Q.husks.push(buildHusk(12, -38));
    V.toast('The hall exhales. Husks rise from the pews of bone.', 3500);
  }

  // enemies
  [ {list: Q.drones, spd: 5.5, rng: 3.2, dmg: 10, fly: true},
    {list: Q.husks, spd: 3.2, rng: 2.8, dmg: 14, fly: false} ].forEach(function(cfg){
    cfg.list.forEach(function(e){
      if (e.dead) {
        e.obj.position.y -= dt*2; e.obj.rotation.z += dt*1.5;   // crumple
        if (e.obj.position.y < V.groundY(e.obj.position.x, e.obj.position.z)-2.5)
          V.scene.remove(e.obj);
        return;
      }
      var dx = kp.x - e.obj.position.x, dz = kp.z - e.obj.position.z;
      var dist = Math.hypot(dx, dz);
      var gy = V.groundY(e.obj.position.x, e.obj.position.z);
      if (e.mixer) e.mixer.update(dt);
      if (dist < 26) {
        var px = e.obj.position.x;
        e.obj.position.x += dx/dist*cfg.spd*dt;
        e.obj.position.z += dz/dist*cfg.spd*dt;
        var wantYaw = Math.atan2(dx, dz), dy = wantYaw - e.obj.rotation.y;
        while (dy > Math.PI) dy -= 2*Math.PI; while (dy < -Math.PI) dy += 2*Math.PI;
        e.obj.rotation.y += dy * Math.min(1, dt*6);
        e.obj.rotation.z += ((-(e.obj.position.x - px)/Math.max(dt, 0.001))*0.06 - e.obj.rotation.z) * Math.min(1, dt*5); // bank
        if (cfg.fly) e.obj.position.y = gy + 2.2 + Math.sin(t*3+e.seed)*0.4 - Math.min(1, dist/10)*0.8; // swoop low near prey
        else { e.obj.position.y = gy + Math.abs(Math.sin(t*5+e.seed))*0.22; }
        e.atkCD -= dt;
        if (dist < cfg.rng && e.atkCD <= 0 && V.player.alive && !V.isBusy()) {
          e.atkCD = 1.6; V.hurt(cfg.dmg); shake = 0.35;
        }
      } else {
        // drift home + idle
        if (cfg.fly) e.obj.position.y = gy + 2.2 + Math.sin(t*2+e.seed)*0.5;
      }
      if (e.wL) { e.wL.rotation.y = Math.sin(t*30)*0.5; e.wR.rotation.y = -Math.sin(t*30)*0.5; }
    });
  });

  if (shake > 0) {
    shake -= dt;
    V.camera.position.x += (Math.random()-0.5)*shake;
    V.camera.position.y += (Math.random()-0.5)*shake;
  }
}
loop();
})();
