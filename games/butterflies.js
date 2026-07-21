// games/butterflies.js — Attrape-Papillons
// Des papillons volètent devant le joueur ; on les capture avec un filet dans
// chaque main. Papillon coloré = +1, doré = +5, abeille = à éviter (−3).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const CATCH_R = 0.14;
// volume de vol (à portée, devant le joueur)
const CENTER = new THREE.Vector3(0, 1.4, -0.7);
const HALF = new THREE.Vector3(0.72, 0.42, 0.34);

const PALETTE = [0x8b6cff, 0xff4d5e, 0x2ee6d6, 0xb8f34d, 0xff2d95, 0xffa23c];

let R=null;
function res(){
  if(R) return R;
  R={
    body:new THREE.MeshStandardMaterial({color:0x141018, roughness:.6}),
    bee: new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0x3a2a00, roughness:.5}),
    beeStripe:new THREE.MeshStandardMaterial({color:0x161018, roughness:.6}),
    beeWing:new THREE.MeshStandardMaterial({color:0xdfe6ff, transparent:true, opacity:.5, side:THREE.DoubleSide, roughness:.3}),
    ant:new THREE.MeshStandardMaterial({color:0x0b0e14}),
    bodyGeo:new THREE.SphereGeometry(1,10,8),
    wingGeo:new THREE.CircleGeometry(1,16),
    antGeo:new THREE.CylinderGeometry(0.0025,0.0025,0.03,5),
    netRingGeo:new THREE.TorusGeometry(0.075,0.006,10,28),
    netBagGeo:new THREE.ConeGeometry(0.075,0.14,16,1,true),
    netHandleGeo:new THREE.CylinderGeometry(0.009,0.011,0.16,10)
  };
  return R;
}

function makeWingMat(color){ return new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.4, roughness:.5, side:THREE.DoubleSide, transparent:true, opacity:.92}); }

function makeButterfly(type, color){
  const r=res(); const g=new THREE.Group();
  const isBee = type==='bad';
  // corps
  const body=new THREE.Mesh(r.bodyGeo, isBee?r.bee:r.body);
  body.scale.set(0.012,0.012, isBee?0.03:0.026); g.add(body);
  if(isBee){
    for(let k=-1;k<=1;k++){ const st=new THREE.Mesh(r.bodyGeo, r.beeStripe); st.scale.set(0.0125,0.0125,0.004); st.position.z=k*0.01; g.add(st); }
  }
  // antennes
  [-1,1].forEach(sx=>{ const a=new THREE.Mesh(r.antGeo, r.ant); a.position.set(sx*0.004,0.006,0.026); a.rotation.set(0.5,0,sx*0.3); g.add(a); });
  // ailes : 2 paires (avant + arrière) de chaque côté, sur des charnières qui battent
  const wings=[]; const wMat=isBee?r.beeWing:makeWingMat(color);
  const wMat2=isBee?r.beeWing:makeWingMat(new THREE.Color(color).offsetHSL(0.04,0,-0.05).getHex());
  [-1,1].forEach(sx=>{
    const foreH=new THREE.Group(); g.add(foreH);
    const fore=new THREE.Mesh(r.wingGeo, wMat); fore.rotation.x=-Math.PI/2;
    fore.scale.set(0.055,1,0.07); fore.position.set(sx*0.055,0,0.012);
    foreH.add(fore); wings.push({h:foreH, sx, base:0.15, amp:isBee?1.1:0.9});
    const hindH=new THREE.Group(); g.add(hindH);
    const hind=new THREE.Mesh(r.wingGeo, wMat2); hind.rotation.x=-Math.PI/2;
    hind.scale.set(0.042,1,0.05); hind.position.set(sx*0.04,0,-0.02);
    hindH.add(hind); wings.push({h:hindH, sx, base:0.05, amp:isBee?1.1:0.8});
  });
  g.userData.wings=wings; g.userData.bee=isBee;
  return g;
}

export default {
  id:'butterflies',
  name:{fr:'Attrape-Papillons', en:'Butterfly Catch'},
  color:'#8b6cff',
  usesSurfaces:false,

  _active:[], _spawnTimer:0, _nets:[],

  init(engine){ res(); },
  buildLayout(engine, spots){ /* rien de spatial : les papillons volent dans l'air */ },

  start(engine){
    this._nets=[];
    engine.setTool((i)=>{ const n=engine.makeNet(i); this._nets[i]=n; return n; });
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0; this._spawnTimer=0.5;
  },

  _spawn(engine){
    let type='normal', color=PALETTE[(Math.random()*PALETTE.length)|0];
    const rnd=Math.random();
    const badChance={easy:0.10,normal:0.15,hard:0.22}[engine.settings.diff];
    if(rnd<badChance){ type='bad'; }
    else if(rnd<badChance+0.09){ type='gold'; color=0xffd54a; }

    const g=makeButterfly(type, color);
    // point d'attache dans le volume
    const home=new THREE.Vector3(
      CENTER.x+(Math.random()-.5)*2*HALF.x,
      CENTER.y+(Math.random()-.5)*2*HALF.y,
      CENTER.z+(Math.random()-.5)*2*HALF.z
    );
    g.position.copy(home); engine.field.add(g);
    const speed={easy:[0.8,1.2],normal:[1.1,1.6],hard:[1.5,2.1]}[engine.settings.diff];
    const life={easy:6.5,normal:5.2,hard:4.2}[engine.settings.diff];
    const obj={ group:g, type, color, home, phase:'enter', tt:0,
      wig:Math.random()*6, flap:12+Math.random()*8,
      rx:0.10+Math.random()*0.12, ry:0.06+Math.random()*0.08, rz:0.08+Math.random()*0.10,
      sx:speed[0]+Math.random()*(speed[1]-speed[0]), sy:0.6+Math.random()*0.8, sz:0.5+Math.random()*0.7,
      life, caught:false };
    // entre par le bas
    g.position.y = home.y - 0.4;
    this._active.push(obj);
  },

  _pop(engine,o){ engine.field.remove(o.group); const i=this._active.indexOf(o); if(i>=0) this._active.splice(i,1); },

  update(dt, engine){
    // apparition
    this._spawnTimer-=dt;
    if(this._spawnTimer<=0){
      this._spawn(engine);
      const maxConc={easy:3,normal:4,hard:6}[engine.settings.diff];
      if(this._active.length<maxConc && Math.random()<0.5) this._spawn(engine);
      const base={easy:1.05,normal:0.82,hard:0.58}[engine.settings.diff];
      this._spawnTimer=base*(0.7+Math.random()*0.6);
    }
    const time=engine.clock.elapsedTime;
    for(const o of this._active.slice()){
      o.tt+=dt;
      // battement d'ailes
      const flap=Math.sin(time*o.flap+o.wig);
      for(const w of o.group.userData.wings){ w.h.rotation.z = w.sx*(w.base + w.amp*0.5*(flap+1)); }
      // trajectoire
      if(o.phase==='enter'){
        o.group.position.y += (o.home.y-o.group.position.y)*Math.min(1,dt*3);
        if(Math.abs(o.group.position.y-o.home.y)<0.03){ o.phase='wander'; o.tt=0; }
      } else if(o.phase==='wander'){
        const p=time*1.0;
        o.group.position.set(
          o.home.x + Math.sin(p*o.sx+o.wig)*o.rx,
          o.home.y + Math.sin(p*o.sy+o.wig*1.3)*o.ry,
          o.home.z + Math.cos(p*o.sz+o.wig)*o.rz
        );
        // dérive douce du point d'attache
        o.home.x += Math.sin(time*0.5+o.wig)*dt*0.05;
        if(o.tt>=o.life){ o.phase='leave'; o.tt=0; }
      } else { // leave : s'envole vers le haut
        o.group.position.y += dt*(0.7+o.tt*0.5);
        o.group.position.x += Math.sin(time*2+o.wig)*dt*0.3;
        if(o.group.position.y>2.3){ if(o.type!=='bad') engine.miss(); this._pop(engine,o); continue; }
      }
      // orientation : face au déplacement (léger)
      o.group.rotation.y = Math.sin(time*0.8+o.wig)*0.4;
    }
    // capture au filet
    for(const net of this._nets){
      if(!net) continue;
      net.userData.cp.getWorldPosition(engine._tmp2);
      for(const o of this._active){
        if(o.caught) continue;
        if(engine._tmp2.distanceTo(o.group.position) < CATCH_R){
          o.caught=true; const pos=o.group.position.clone();
          if(o.type==='bad') engine.bad(pos,3);
          else engine.good(pos, o.type==='gold'?5:1, o.type==='gold'?'#ffd54a':'#eaffd2');
          this._pop(engine,o);
        }
      }
    }
  },

  cleanup(engine){
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0;
    engine.clearTool();
  }
};
