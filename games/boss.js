// games/boss.js — Duel de Boss (mode spécial)
// Une énorme cible flotte devant toi. Seuls ses POINTS FAIBLES (noyaux lumineux)
// comptent. Elle riposte en lâchant des leurres : ne tire pas dessus (−3) !
// Boss vaincu = gros bonus, un nouveau boss arrive, plus coriace.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Y_AXIS=new THREE.Vector3(0,1,0);
const BOSS_POS=new THREE.Vector3(0,1.55,-2.4);

let R=null;
function res(){
  if(R) return R;
  R={
    tracerGeo:new THREE.CylinderGeometry(0.005,0.005,1,6),
    coreGeo:new THREE.IcosahedronGeometry(0.11,1),
    shell:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0x4a1a5e, emissiveIntensity:.45, roughness:.5, metalness:.4}),
    ring:new THREE.MeshStandardMaterial({color:0x8b6cff, emissive:0x8b6cff, emissiveIntensity:.7, roughness:.4}),
    weak:new THREE.MeshStandardMaterial({color:0xff2d95, emissive:0xff2d95, emissiveIntensity:1.0, roughness:.3}),
    weakOff:new THREE.MeshStandardMaterial({color:0x3a2140, emissive:0x1a0a20, emissiveIntensity:.2, roughness:.7}),
    lure:new THREE.MeshStandardMaterial({color:0x8b93a7, emissive:0x2a3040, emissiveIntensity:.3, roughness:.6}),
    eye:new THREE.MeshBasicMaterial({color:0xffd54a})
  };
  return R;
}

const STYLES=[
  {name:'ORBE',    shell:0x2a2140, glow:0x8b6cff, body:'sphere'},
  {name:'CUBE',    shell:0x1f2a40, glow:0x2ee6d6, body:'box'},
  {name:'ÉTOILE',  shell:0x3a1a2a, glow:0xff2d95, body:'octa'},
  {name:'TOTEM',   shell:0x223018, glow:0xb8f34d, body:'cyl'}
];

const boss = {
  id:'boss',
  name:{fr:'Duel de Boss', en:'Boss Duel'},
  color:'#8b6cff',
  usesSurfaces:false,
  theme:'carnival',
  dlc:true, special:true,

  chaos:false,
  _boss:null, _weaks:[], _lures:[], _guns:[], _flash:[0,0], _tracers:[],
  _level:1, _lureTimer:0, _style:0,

  init(engine){ res(); },
  buildLayout(engine, spots){},

  _buildBoss(engine){
    const r=res(); const g=new THREE.Group(); g.position.copy(BOSS_POS);
    const st=STYLES[this._style % STYLES.length];
    const shellMat=new THREE.MeshStandardMaterial({color:st.shell, emissive:st.glow, emissiveIntensity:.4, roughness:.5, metalness:.4});
    let geo;
    if(st.body==='box') geo=new THREE.BoxGeometry(0.62,0.62,0.62);
    else if(st.body==='octa') geo=new THREE.OctahedronGeometry(0.50,0);
    else if(st.body==='cyl') geo=new THREE.CylinderGeometry(0.34,0.44,0.80,10);
    else geo=new THREE.SphereGeometry(0.42,26,20);
    const body=new THREE.Mesh(geo, shellMat); g.add(body); g.userData.body=body;
    const ringMat=new THREE.MeshStandardMaterial({color:st.glow, emissive:st.glow, emissiveIntensity:.75, roughness:.4});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.60,0.025,12,44), ringMat); ring.rotation.x=Math.PI/2.4; g.add(ring); g.userData.ring=ring;
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.09,16,12), r.eye); eye.position.set(0,0,0.44); g.add(eye);
    engine.field.add(g); this._boss=g; g.userData.style=st;
    // points faibles autour du corps
    this._weaks=[];
    const n=3+Math.min(3,this._level);
    for(let k=0;k<n;k++){
      const a=(k/n)*Math.PI*2;
      const core=new THREE.Mesh(r.coreGeo, r.weak.clone());
      core.position.set(Math.cos(a)*0.46, Math.sin(a)*0.30, 0.16);
      g.add(core);
      this._weaks.push({mesh:core, alive:true, a, hp:1+Math.floor(this._level/2)});
    }
  },
  _clearBoss(engine){ if(this._boss){ engine.field.remove(this._boss); this._boss=null; } this._weaks=[]; },

  start(engine){
    this._guns=[];
    engine.setTool((i)=>{ const gn=engine.makeGun(i); this._guns[i]=gn; return gn; }, 'ray');
    for(const l of this._lures.slice()) engine.field.remove(l.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._lures.length=0; this._tracers.length=0; this._flash=[0,0];
    this._level=1; this._lureTimer=2.5; this._style=(Math.random()*STYLES.length)|0;
    this._clearBoss(engine); this._buildBoss(engine);
  },

  _spawnLure(engine){
    const r=res(); const g=new THREE.Group();
    let kind='rock';
    if(this.chaos){ const rr=Math.random(); kind = rr<0.22?'bonus' : (rr<0.42?'malus':'rock'); }
    const mat = kind==='bonus' ? new THREE.MeshStandardMaterial({color:0xb8f34d, emissive:0xb8f34d, emissiveIntensity:.8, roughness:.4})
             : kind==='malus' ? new THREE.MeshStandardMaterial({color:0xff4d5e, emissive:0xff4d5e, emissiveIntensity:.8, roughness:.4})
             : r.lure;
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(0.10,0), mat); g.add(m); g.userData.kind=kind;
    g.position.copy(BOSS_POS);
    engine.field.add(g);
    // vise la tête du joueur (léger décalage : il faut se pencher pour esquiver)
    const head=engine.headPos(new THREE.Vector3());
    const aim=new THREE.Vector3(head.x+(Math.random()-0.5)*0.55, head.y+(Math.random()-0.5)*0.45, head.z+0.10);
    const dirv=aim.sub(BOSS_POS).normalize();
    const sp=1.5+Math.random()*0.7+this._level*0.12;
    const vx=dirv.x*sp, vy=dirv.y*sp+0.45;
    this._lures.push({group:g, pos:g.position, v:new THREE.Vector3(vx,vy,dirv.z*sp), radius:0.11, t:0, kind:g.userData.kind});
  },
  _rmLure(engine,l){ engine.field.remove(l.group); const i=this._lures.indexOf(l); if(i>=0) this._lures.splice(i,1); },

  onTrigger(i, engine){
    engine.sfx.shot(); if(this._guns[i]) this._flash[i]=0.08;
    const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
    const wp=new THREE.Vector3();
    let hit=null, hitT=1e9, kind=null;
    // points faibles
    for(const w of this._weaks){ if(!w.alive) continue;
      w.mesh.getWorldPosition(wp); if(engine.mirror) wp.x=-wp.x;
      const px=wp.x-o.x, py=wp.y-o.y, pz=wp.z-o.z; const t=px*d.x+py*d.y+pz*d.z; if(t<0.2) continue;
      const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-t*t));
      if(dist<0.13 && t<hitT){ hit=w; hitT=t; kind='weak'; }
    }
    // leurres
    for(const l of this._lures){
      const px=l.pos.x-o.x, py=l.pos.y-o.y, pz=l.pos.z-o.z; const t=px*d.x+py*d.y+pz*d.z; if(t<0.2) continue;
      const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-t*t));
      if(dist<l.radius && t<hitT){ hit=l; hitT=t; kind='lure'; }
    }
    let end;
    if(kind==='weak'){
      hit.mesh.getWorldPosition(wp); end=wp.clone(); if(engine.mirror) end.x=-end.x;
      hit.hp--;
      if(hit.hp<=0){ hit.alive=false; hit.mesh.material=res().weakOff; engine.good(end.clone(), 5, '#ff2d95'); engine.burst(end.clone(), 0xff2d95); }
      else { engine.good(end.clone(), 2, '#ffb0dd'); }
      if(this._weaks.every(w=>!w.alive)){
        engine.good(new THREE.Vector3(BOSS_POS.x,BOSS_POS.y,BOSS_POS.z), 15, '#ffd54a');
        engine.burst(BOSS_POS.clone(), 0xffd54a); engine.sfx.gold();
        this._level++; this._style++; this._clearBoss(engine); this._buildBoss(engine);
        engine.popup(new THREE.Vector3(0,1.95,-1.4), STYLES[this._style%STYLES.length].name, '#ffd54a');
      }
    } else if(kind==='lure'){
      end=hit.pos.clone();
      if(hit.kind==='bonus'){ engine.good(hit.pos.clone(), 6, '#b8f34d'); }
      else engine.bad(hit.pos.clone(), 3);
      this._rmLure(engine,hit);
    } else { end=o.clone().addScaledVector(d,8); engine.miss(); }
    const mesh=new THREE.Mesh(res().tracerGeo, new THREE.MeshBasicMaterial({color:this._guns[i]?this._guns[i].userData.color:0x2ee6d6, transparent:true, opacity:.9}));
    const vec=new THREE.Vector3().subVectors(end,o), len=Math.max(0.01,vec.length());
    mesh.position.copy(o).addScaledVector(vec,0.5); mesh.quaternion.setFromUnitVectors(Y_AXIS, vec.normalize()); mesh.scale.set(1,len,1);
    engine.scene.add(mesh); this._tracers.push({mesh, life:0.12});
  },

  update(dt, engine){
    const time=engine.clock.elapsedTime;
    const alive=this._weaks.filter(w=>w.alive).length;
    engine.hudExtra=(engine.lang==='en'?'Boss ':'Boss ')+this._level+' · '+(this._boss&&this._boss.userData.style?this._boss.userData.style.name:'')+' · '+(engine.lang==='en'?'cores ':'noyaux ')+alive;
    if(this._boss){
      this._boss.position.x = BOSS_POS.x + Math.sin(time*0.6)*0.55;
      this._boss.position.y = BOSS_POS.y + Math.sin(time*0.9)*0.16;
      this._boss.rotation.z += dt*0.25;
      if(this._boss.userData.ring) this._boss.userData.ring.rotation.z += dt*1.1;
      for(const w of this._weaks){ if(w.alive) w.mesh.scale.setScalar(1+Math.sin(time*7+w.a*3)*0.14); }
    }
    // riposte
    this._lureTimer-=dt;
    if(this._lureTimer<=0 && this._lures.length<3+this._level){
      this._spawnLure(engine);
      this._lureTimer=Math.max(0.45, 1.7-this._level*0.18)*(0.7+Math.random()*0.5);
    }
    const head=engine.headPos(new THREE.Vector3());
    for(const l of this._lures.slice()){
      l.t+=dt; l.v.y-=0.5*dt; l.pos.addScaledVector(l.v,dt); l.group.position.copy(l.pos);
      l.group.rotation.x+=dt*2; l.group.rotation.y+=dt*1.4;
      if(l.pos.distanceTo(head)<0.30){        // touché ! il fallait esquiver
        if(l.kind==='bonus'){ engine.good(l.pos.clone(), 4, '#b8f34d'); }
        else { engine.bad(l.pos.clone(), l.kind==='malus'?5:3); engine.burst(l.pos.clone(), 0xff4d5e); }
        this._rmLure(engine,l); continue;
      }
      if(l.t>4.5 || l.pos.y<0.2 || Math.abs(l.pos.x)>2.6 || l.pos.z>0.6) this._rmLure(engine,l);
    }
    for(let i=0;i<2;i++){
      if(this._flash[i]>0){ this._flash[i]-=dt; const gn=this._guns[i]; if(gn) gn.userData.tip.scale.setScalar(1+Math.max(0,this._flash[i])*40); }
      else if(this._guns[i]) this._guns[i].userData.tip.scale.setScalar(1);
    }
    for(let k=this._tracers.length-1;k>=0;k--){ const tr=this._tracers[k]; tr.life-=dt; tr.mesh.material.opacity=Math.max(0,tr.life/0.12); if(tr.life<=0){ engine.scene.remove(tr.mesh); this._tracers.splice(k,1); } }
  },

  cleanup(engine){
    this._clearBoss(engine);
    for(const l of this._lures.slice()) engine.field.remove(l.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._lures.length=0; this._tracers.length=0;
    engine.clearTool();
  }
};

export default boss;
// Variante : le boss lâche aussi des bonus (verts, à tirer) et des malus (rouges, à fuir).
export const bossChaos = Object.assign({}, boss, {
  id:'bosschaos', name:{fr:'Boss — Chaos', en:'Boss — Chaos'}, color:'#ff4d5e',
  chaos:true, dlc:true, special:true,
  _boss:null, _weaks:[], _lures:[], _guns:[], _flash:[0,0], _tracers:[]
});