// games/reflexpads.js — Dalles Réflexe
// Des dalles s'illuminent autour de toi ; tape vite la bonne à la main.
// Dalle allumée = +1, dorée = +5, rouge = à NE PAS toucher (−3). Rate = combo perdu.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const ZAXIS = new THREE.Vector3(0,0,1);
const HIT_R = 0.13;

let R=null;
function res(){
  if(R) return R;
  R={ panelGeo:new THREE.BoxGeometry(0.17,0.17,0.03),
      rimGeo:new THREE.TorusGeometry(0.11,0.008,8,4),
      off:new THREE.MeshStandardMaterial({color:0x1a2233, emissive:0x0a1424, emissiveIntensity:.3, roughness:.5}) };
  return R;
}

export default {
  id:'reflex',
  name:{fr:'Dalles Réflexe', en:'Reflex Tiles'},
  color:'#b8f34d',
  usesSurfaces:false,
  theme:'carnival',

  _pads:[], _actTimer:0,

  init(engine){ res(); },

  buildLayout(engine, spots){
    this._pads.length=0;
    const r=res(); const PLAYER=new THREE.Vector3(0,1.5,0);
    const yaws=[-64,-32,0,32,64].map(d=>d*Math.PI/180);
    const pitches=[-40,-8,26].map(d=>d*Math.PI/180);
    for(const pit of pitches) for(const yaw of yaws){
      const d=new THREE.Vector3(Math.sin(yaw)*Math.cos(pit), Math.sin(pit), -Math.cos(yaw)*Math.cos(pit)).normalize();
      const pos=PLAYER.clone().add(d.clone().multiplyScalar(0.82)); pos.y=Math.max(pos.y,0.3);
      const normal=d.clone().negate();
      const q=new THREE.Quaternion().setFromUnitVectors(ZAXIS, normal);
      const panel=new THREE.Mesh(r.panelGeo, r.off.clone()); panel.position.copy(pos); panel.quaternion.copy(q); engine.field.add(panel);
      const rim=new THREE.Mesh(r.rimGeo, new THREE.MeshBasicMaterial({color:0x2ee6d6, transparent:true, opacity:.25})); rim.position.copy(pos); rim.quaternion.copy(q); rim.rotation.z=Math.PI/4; engine.field.add(rim);
      this._pads.push({panel, rim, pos, active:false, type:'normal', tt:0, life:1, cd:0});
    }
  },

  start(engine){
    engine.clearTool();
    for(const p of this._pads){ p.active=false; p.tt=0; p.cd=0; this._deactivate(p); }
    this._actTimer=0.6;
  },

  _colorFor(type){ return type==='gold'?0xffd54a : (type==='bad'?0xff4d5e : 0xb8f34d); },
  _activate(p, type, life){
    p.active=true; p.type=type; p.tt=0; p.life=life;
    const col=this._colorFor(type);
    p.panel.material.color.setHex(col); p.panel.material.emissive.setHex(col); p.panel.material.emissiveIntensity=1.0;
    p.rim.material.color.setHex(col); p.rim.material.opacity=0.9;
  },
  _deactivate(p){
    p.active=false;
    p.panel.material.color.setHex(0x1a2233); p.panel.material.emissive.setHex(0x0a1424); p.panel.material.emissiveIntensity=0.3;
    p.rim.material.color.setHex(0x2ee6d6); p.rim.material.opacity=0.25;
    p.panel.scale.setScalar(1);
  },

  update(dt, engine){
    const diff=engine.settings.diff;
    // apparition
    this._actTimer-=dt;
    if(this._actTimer<=0){
      const free=this._pads.filter(p=>!p.active);
      if(free.length){
        const p=free[(Math.random()*free.length)|0];
        let type='normal'; const rnd=Math.random();
        const badChance={easy:0.10,normal:0.16,hard:0.24}[diff];
        if(rnd<badChance) type='bad'; else if(rnd<badChance+0.10) type='gold';
        const life={easy:[1.4,1.9],normal:[1.0,1.5],hard:[0.7,1.1]}[diff];
        this._activate(p, type, life[0]+Math.random()*(life[1]-life[0]));
      }
      this._actTimer={easy:0.85,normal:0.62,hard:0.42}[diff]*(0.7+Math.random()*0.6);
    }
    const time=engine.clock.elapsedTime;
    for(const p of this._pads){
      if(p.cd>0) p.cd-=dt;
      if(!p.active) continue;
      p.tt+=dt;
      p.panel.scale.setScalar(1+Math.sin(time*10)*0.04);
      if(p.tt>=p.life){ if(p.type!=='bad') engine.miss(); this._deactivate(p); }
    }
    // frappe main
    engine.eachMallet((mp)=>{
      for(const p of this._pads){
        if(!p.active || p.cd>0) continue;
        if(mp.distanceTo(p.pos)<HIT_R){
          p.cd=0.4;
          if(p.type==='bad') engine.bad(p.pos.clone(),3);
          else engine.good(p.pos.clone(), p.type==='gold'?5:1, p.type==='gold'?'#ffd54a':'#eaffd2');
          this._deactivate(p);
        }
      }
    });
  },

  cleanup(engine){ this._pads.length=0; }
};