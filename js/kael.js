/* KAEL — exiled gate-knight. Procedural low-poly character, code-driven motion.
   Parts are named groups; main.js drives update(dt, state). No rigs, no assets. */
(function(){
"use strict";
function mat(color, emissive){
  var m = new THREE.MeshLambertMaterial({ color: color });
  if (emissive) { m.emissive = new THREE.Color(emissive); }
  return m;
}
var PLATE = 0x23232c, DARK = 0x14141a, CLOAK = 0x5c0a10, GOLD = 0xd9a441,
    EMBER = 0xff7b14, BONE = 0xd8cbaa;

function box(w, h, d, m, x, y, z){
  var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); return o;
}

function buildKnight(){
  var root = new THREE.Group();
  var plate = mat(PLATE), dark = mat(DARK), cloakM = new THREE.MeshLambertMaterial({ color: CLOAK, side: THREE.DoubleSide });

  // legs (pivot at hip y=0.95)
  function leg(side){
    var g = new THREE.Group(); g.position.set(0.22*side, 0.95, 0);
    g.add(box(0.26, 0.55, 0.3, plate, 0, -0.28, 0));
    g.add(box(0.3, 0.42, 0.42, dark, 0, -0.75, 0.04));   // boot
    root.add(g); return g;
  }
  var legL = leg(-1), legR = leg(1);

  // torso
  var torso = new THREE.Group(); torso.position.set(0, 0.95, 0); root.add(torso);
  torso.add(box(0.72, 0.75, 0.44, plate, 0, 0.38, 0));
  torso.add(box(0.78, 0.16, 0.5, dark, 0, 0.02, 0));      // belt
  torso.add(box(0.2, 0.3, 0.06, mat(GOLD, 0x442200), 0, 0.45, 0.24)); // brand sigil
  torso.add(box(0.86, 0.22, 0.56, plate, 0, 0.72, 0));    // pauldrons bar

  // arms (pivot at shoulder)
  function arm(side){
    var g = new THREE.Group(); g.position.set(0.5*side, 0.68, 0); torso.add(g);
    g.children; // noop
    g.position.y = 0.68; // relative to torso group (torso at y .95)
    var a = new THREE.Group(); a.position.set(0.5*side, 1.63, 0); root.add(a);
    a.add(box(0.24, 0.62, 0.28, plate, 0, -0.31, 0));
    a.add(box(0.3, 0.2, 0.34, dark, 0, 0.02, 0));          // pauldron
    return a;
  }
  var armL = arm(-1), armR = arm(1);

  // sword in right hand
  var sword = new THREE.Group(); sword.position.set(0, -0.62, 0.1); armR.add(sword);
  sword.add(box(0.09, 0.5, 0.09, mat(0x3a2a1a), 0, -0.1, 0));       // grip
  sword.add(box(0.34, 0.08, 0.12, mat(GOLD, 0x442200), 0, 0.12, 0)); // guard
  var blade = box(0.14, 1.5, 0.05, mat(0xb9c2cc), 0, 0.95, 0); sword.add(blade);
  var edge = box(0.05, 1.5, 0.06, mat(EMBER, EMBER), 0.06, 0.95, 0); sword.add(edge); // ember edge

  // head + helm
  var head = new THREE.Group(); head.position.set(0, 1.95, 0); root.add(head);
  head.add(box(0.4, 0.42, 0.42, mat(BONE), 0, 0.1, 0));
  head.add(box(0.46, 0.3, 0.48, plate, 0, 0.32, 0));       // helm
  head.add(box(0.4, 0.07, 0.05, mat(EMBER, EMBER), 0, 0.12, 0.22)); // eye slit

  // cloak (swings)
  var cloakPivot = new THREE.Group(); cloakPivot.position.set(0, 1.6, -0.26); root.add(cloakPivot);
  var cloak = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5, 1, 3), cloakM);
  cloak.position.set(0, -0.75, -0.1); cloak.rotation.x = 0.12;
  cloakPivot.add(cloak);

  root.traverse(function(o){ o.frustumCulled = true; });
  return { root: root, legL: legL, legR: legR, torso: torso, armL: armL, armR: armR,
           sword: sword, head: head, cloakPivot: cloakPivot, cloak: cloak,
           phase: 0, atkT: -1, dead: false };
}

/* state: { moving:0..1, attacking:bool, dt } — mutates pose */
function animate(K, moveAmt, dt, attacking){
  if (attacking && K.atkT < 0) K.atkT = 0;
  if (K.atkT >= 0) {
    K.atkT += dt;
    var t = K.atkT / 0.45, sw = Math.sin(Math.min(t,1)*Math.PI);
    K.armR.rotation.x = -2.3*sw - 0.2;
    K.armR.rotation.z = 0.5*sw;
    K.torso.rotation.y = -0.5*sw;
    if (t >= 1) { K.atkT = -1; K.armR.rotation.set(0,0,0); K.torso.rotation.y = 0; }
  }
  K.phase += dt * (4 + moveAmt*7);
  var s = Math.sin(K.phase), amp = 0.12 + moveAmt*0.55;
  K.legL.rotation.x = s*amp; K.legR.rotation.x = -s*amp;
  if (K.atkT < 0) { K.armL.rotation.x = -s*amp*0.7; K.armR.rotation.x += -(-s)*amp*0.4; }
  K.root.position.y += Math.abs(Math.cos(K.phase))*0.05*moveAmt;  // bob (applied on offset below)
  var breathe = Math.sin(performance.now()*0.002)*0.012;
  K.torso.scale.y = 1 + breathe;
  K.cloakPivot.rotation.x = 0.08 + moveAmt*0.35 + Math.sin(K.phase*0.5)*0.04;
  K.head.rotation.y = Math.sin(performance.now()*0.0006)*0.08*(1-moveAmt);
}

window.KAEL = { build: buildKnight, animate: animate };
})();
