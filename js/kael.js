/* KAEL v2 — Strong Knight (bumstrum, CC-BY, Sketchfab) with idle motion,
   runtime arm override for attacks, capsule fallback if load fails.
   Same interface as v1: build() -> K, animate(K, moveAmt, dt, attacking). */
(function(){
"use strict";
function mat(color, emissive){
  var m = new THREE.MeshLambertMaterial({ color: color });
  if (emissive) m.emissive = new THREE.Color(emissive);
  return m;
}
function box(w,h,d,m,x,y,z){
  var o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
  o.position.set(x||0,y||0,z||0); return o;
}
function buildCapsule(){
  var root = new THREE.Group();
  var body = new THREE.Mesh(new THREE.CapsuleGeometry
    ? new THREE.CapsuleGeometry(0.42, 1.0, 4, 8)
    : new THREE.CylinderGeometry(0.42, 0.5, 1.9, 8), mat(0x23232c));
  body.position.y = 1.15; root.add(body);
  root.add(box(0.4, 0.4, 0.42, mat(0xd8cbaa), 0, 1.95, 0));
  return root;
}

function buildKnight(){
  var K = { root: new THREE.Group(), ready: false, mixer: null,
            armR: null, phase: 0, atkT: -1, fallback: false };
  K.root.add(buildCapsule());   // instant body, swapped when knight lands
  var errBox = document.getElementById('err'), errText = document.getElementById('err-text');
  function failWhy(m){
    K.failMsg = m;
    if (errBox) { errBox.style.display='block'; (errText || errBox).textContent += '\nKNIGHT: ' + m; }
  }
  new THREE.GLTFLoader().load('models/knight/scene.gltf?v=4',
    function(g){
      var model = g.scene;
      // normalize: model is ~212 units tall, faces +Z (verified below at runtime)
      var bbox = new THREE.Box3().setFromObject(model);
      var size = new THREE.Vector3(); bbox.getSize(size);
      var s = 1.9 / size.y;
      model.scale.setScalar(s);
      bbox.setFromObject(model);
      model.position.y -= bbox.min.y;
      K.root.clear(); K.root.add(model);
      // idle animation
      if (g.animations && g.animations.length) {
        K.mixer = new THREE.AnimationMixer(model);
        var idle = g.animations.find(function(a){ return /idle/i.test(a.name); }) || g.animations[0];
        K.mixer.clipAction(idle).play();
      }
      // bones for procedural walk + attack override (post-mixer, every frame wins)
      K.bones = {};
      model.traverse(function(o){
        if (/^(L_leg_02|R_leg_07|L_knee_03|R_knee_08|L_foot_05|R_foot_010|L_arm_015|R_arm_039|R_shoulder_038|spine_012|hips_01)$/.test(o.name)) {
          K.bones[o.name] = o;
          o.userData.bx = o.rotation.x; o.userData.bz = o.rotation.z;
        }
      });
      K.armR = K.bones['R_arm_039'] || null;
      // ember blade: follows the forearm every frame (bone-space math breaks
      // across scaled rigs, so track shoulder->arm in world space instead)
      // weapon: take HIS OWN maul (skinned prop in the rig) and seat it in his
      // fist via attach() — correct scale and skinning for free.
      if (K.armR) {
        var maul = null;
        model.traverse(function(o){ if (!maul && o.name === 'maul') maul = o; });
        if (maul) {
          K.armR.updateWorldMatrix(true, false);
          K.armR.attach(maul);
          maul.position.set(0, -0.85, 0.3);
          maul.rotation.set(1.25, 0, 0.15);
          var edge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 0.14),
            new THREE.MeshLambertMaterial({ color: 0xff7b14, emissive: 0xff5a14 }));
          edge.material.emissiveIntensity = 1;
          edge.position.set(0, 0.9, 0);
          maul.add(edge);
          K.blade = edge;
        }
      }
      // buckler on left forearm
      var armL = K.bones['L_arm_015'];
      if (armL) {
        var buck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 10),
          new THREE.MeshLambertMaterial({ color: 0x3a3a44, emissive: 0x1a0d05 }));
        buck.rotation.z = Math.PI/2; buck.position.set(0, -0.7, 0.15);
        armL.add(buck);
        var boss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5),
          new THREE.MeshLambertMaterial({ color: 0xd9a441, emissive: 0x442200 }));
        boss.position.set(0.12, -0.7, 0.15); armL.add(boss);
      }
      K.ready = true;
    },
    undefined,
    function(err){ K.fallback = true; failWhy('load error: ' + (err && (err.message || err.target && err.target.status) || err)); }
  );
  setTimeout(function(){
    if (!K.ready && !K.failMsg) failWhy('still loading after 12s (network?)');
  }, 12000);
  return K;
}

function animate(K, moveAmt, dt, attacking, airborne){
  if (K.mixer) K.mixer.update(dt);
  // Kael's idle carries root-motion droop that buries him waist-deep:
  // pin hips+spine to bind positions every frame (limbs keep acting).
  var B0 = K.bones || {};
  ['hips_01', 'spine_012'].forEach(function(nm){
    var b = B0[nm];
    if (b) {
      if (!b.userData.px) { b.userData.px = b.position.x; b.userData.py = b.position.y; b.userData.pz = b.position.z; }
      else b.position.set(b.userData.px, b.userData.py, b.userData.pz);
    }
  });
  // smoothed locomotion amount (no snapping between idle/run)
  K.smooth = (K.smooth === undefined ? moveAmt : K.smooth + (moveAmt - K.smooth) * Math.min(1, dt*7));
  var sm = K.smooth;
  if (attacking && K.atkT < 0) { K.atkT = 0; K.combo = ((K.combo || 0) + 1) % 2; window.SFX && window.SFX.swing(); }
  var B = K.bones || {}, sw = 0;
  if (K.atkT >= 0) {
    // combo: 0 = overhead cleave, 1 = backhand sweep (eased in/out)
    K.atkT += dt;
    var alt = (K.combo === 1);
    var t = Math.min(K.atkT / 0.5, 1);
    var te = t*t*(3-2*t);
    sw = Math.sin(te*Math.PI);
    if (B['R_arm_039']) B['R_arm_039'].rotation.x = B['R_arm_039'].userData.bx - (alt ? 1.4 : 2.4)*sw;
    if (B['R_shoulder_038']) {
      B['R_shoulder_038'].rotation.z = B['R_shoulder_038'].userData.bz + (alt ? -0.9 : 0.5)*sw;
      B['R_shoulder_038'].rotation.y = alt ? -0.8*sw : 0;
    }
    if (B['spine_012']) {
      B['spine_012'].rotation.y = (alt ? 0.7 : -0.55)*sw;
      B['spine_012'].rotation.x = 0.25*sw;
    }
    if (B['L_arm_015']) B['L_arm_015'].rotation.x = B['L_arm_015'].userData.bx - 0.9*sw; // buckler brace
    if (t >= 1) {
      if (B['R_arm_039']) B['R_arm_039'].rotation.x = B['R_arm_039'].userData.bx;
      if (B['R_shoulder_038']) { B['R_shoulder_038'].rotation.z = B['R_shoulder_038'].userData.bz; B['R_shoulder_038'].rotation.y = 0; }
      if (B['spine_012']) { B['spine_012'].rotation.y = 0; B['spine_012'].rotation.x = 0; }
      K.atkT = -1; sw = 0;
    }
  }
  // walk: stride matched to smoothed speed (less ice-skating), softer when airborne
  var spd = airborne ? 0 : sm;
  K.phase += dt * (2 + spd*11);
  var s = Math.sin(K.phase), amp = spd * 0.62;
  if (B['L_leg_02']) B['L_leg_02'].rotation.x = B['L_leg_02'].userData.bx + s*amp;
  if (B['R_leg_07']) B['R_leg_07'].rotation.x = B['R_leg_07'].userData.bx - s*amp;
  if (B['L_knee_03']) B['L_knee_03'].rotation.x = B['L_knee_03'].userData.bx + Math.max(0, -s)*amp*1.1;
  if (B['R_knee_08']) B['R_knee_08'].rotation.x = B['R_knee_08'].userData.bx + Math.max(0, s)*amp*1.1;
  if (B['L_foot_05']) B['L_foot_05'].rotation.x = B['L_foot_05'].userData.bx + Math.max(0, s)*amp*0.8 - amp*0.25;   // toe-off / heel-strike
  if (B['R_foot_010']) B['R_foot_010'].rotation.x = B['R_foot_010'].userData.bx + Math.max(0, -s)*amp*0.8 - amp*0.25;
  // foot-plant dust: fire on stride zero-crossing while moving on ground
  var prevS = K._ps === undefined ? s : K._ps; K._ps = s;
  if (!airborne && spd > 0.35 && ((prevS > 0) !== (s > 0)) && window.VEYL && window.VEYL.fx) {
    var kp = window.VEYL.kaelPos;
    window.VEYL.fx(kp.x, kp.y, kp.z, false);
  }
  if (B['L_arm_015'] && K.atkT < 0) B['L_arm_015'].rotation.x = B['L_arm_015'].userData.bx - s*amp*0.7;
  if (B['R_arm_039'] && K.atkT < 0) B['R_arm_039'].rotation.x = B['R_arm_039'].userData.bx + s*amp*0.4;
  // (maul rides the fist via attach — no per-frame tracking needed)
  // landing dip + turn bank live on the hips
  K.landDip = Math.max(0, (K.landDip || 0) - dt*3);
  var targetLean = spd * 0.1 + (K.landDip * 0.35);
  K.root.rotation.x += (targetLean - K.root.rotation.x) * Math.min(1, dt*6);
  K.root.position.y += Math.abs(Math.cos(K.phase)) * 0.07 * spd - K.landDip * 0.25;
  if (B['hips_01']) {
    B['hips_01'].rotation.y = s*amp*0.12;
    B['hips_01'].position.y = B['hips_01'].userData.by !== undefined ? B['hips_01'].userData.by : (B['hips_01'].userData.by = B['hips_01'].position.y);
    B['hips_01'].position.y = B['hips_01'].userData.by - K.landDip * 0.3;
  }
  if (B['spine_012'] && K.atkT < 0) B['spine_012'].rotation.x = spd*0.08;
}

window.KAEL = { build: buildKnight, animate: animate };
})();
