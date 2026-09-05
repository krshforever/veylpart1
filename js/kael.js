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
  new THREE.GLTFLoader().load('models/knight/scene.gltf',
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
      // arm bone for attack override
      model.traverse(function(o){ if (o.name === 'R_arm_039') K.armR = o; });
      K.ready = true;
    },
    undefined,
    function(){ K.fallback = true; }  // capsule stays
  );
  return K;
}

function animate(K, moveAmt, dt, attacking){
  if (K.mixer) K.mixer.update(dt);
  if (attacking && K.atkT < 0) { K.atkT = 0; }
  if (K.atkT >= 0 && K.armR) {
    K.atkT += dt;
    var t = Math.min(K.atkT / 0.45, 1), sw = Math.sin(t*Math.PI);
    K.armR.rotation.x = K.armR.userData.bx !== undefined ? K.armR.userData.bx : (K.armR.userData.bx = K.armR.rotation.x);
    K.armR.rotation.x = K.armR.userData.bx - 1.9*sw;
    if (t >= 1) { K.armR.rotation.x = K.armR.userData.bx; K.atkT = -1; }
  } else if (K.atkT >= 0) {
    K.atkT += dt; if (K.atkT >= 0.45) K.atkT = -1;
  }
  // locomotion feel: lean + bob (no walk clip on this rig)
  K.phase += dt * (3 + moveAmt*8);
  var targetLean = moveAmt * 0.14;
  K.root.rotation.x += ((targetLean) - K.root.rotation.x) * Math.min(1, dt*6);
  K.root.position.y += Math.abs(Math.sin(K.phase)) * 0.06 * moveAmt;
}

window.KAEL = { build: buildKnight, animate: animate };
})();
