// hub.js — menu in-VR rétro : on choisit un jeu en touchant une orbe.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class Hub {
  constructor(engine){
    this.e = engine;
    this.group = new THREE.Group();
    engine.scene.add(this.group);
    this.group.visible = false;
    this.orbs = [];
    this._m0 = new THREE.Vector3();
    this._m1 = new THREE.Vector3();
  }

  _label(text, color){
    const cv=document.createElement('canvas'); cv.width=512; cv.height=128;
    const c=cv.getContext('2d'); c.textAlign='center';
    c.font='900 64px Segoe UI, sans-serif'; c.lineWidth=8; c.strokeStyle='rgba(0,0,0,.6)';
    c.strokeText(text,256,84); c.fillStyle=color; c.fillText(text,256,84);
    const tex=new THREE.CanvasTexture(cv);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.085), new THREE.MeshBasicMaterial({map:tex,transparent:true,depthTest:false}));
    m.renderOrder=998; return m;
  }

  _addOrb(item, x){
    const orb=new THREE.Mesh(new THREE.SphereGeometry(0.06,24,18),
      new THREE.MeshStandardMaterial({color:item.color, emissive:item.color, emissiveIntensity:.7, roughness:.3}));
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.006,10,32),
      new THREE.MeshBasicMaterial({color:item.color, transparent:true, opacity:.75}));
    const halo=new THREE.Mesh(new THREE.SphereGeometry(0.085,18,14),
      new THREE.MeshBasicMaterial({color:item.color, transparent:true, opacity:.12}));
    const g=new THREE.Group(); g.add(orb); g.add(ring); g.add(halo);
    const base=new THREE.Vector3(x,1.32,-0.82); g.position.copy(base);
    const lbl=this._label(item.label, item.color); lbl.position.set(x,1.15,-0.82);
    this.group.add(g); this.group.add(lbl);
    this.orbs.push({g, orb, ring, lbl, base, action:item.action, cd:0.7, ph:Math.random()*6, hex:new THREE.Color(item.color).getHex()});
  }

  hide(){ this._clear(); this.group.visible=false; }
  _clear(){ for(const o of this.orbs){ this.group.remove(o.g); this.group.remove(o.lbl); } this.orbs.length=0; }

  render(){
    const e=this.e;
    this._clear();
    e.showHUD(false);
    e.drawBoard([{text:'NEON ARCADE', s:78, col:'#ff2d95', gap:8},{text:e.t('choose'), s:44, col:'#2ee6d6'}]);
    e.showBoard(true);

    const items=e.games.map(g=>({label:(g.name[e.lang]||g.name.fr), color:g.color||'#2ee6d6', action:()=>e.selectGame(g)}));
    items.push({label:e.t('quit'), color:'#8b93a7', action:()=>e.exit()});
    const n=items.length, step=0.34;
    items.forEach((it,i)=> this._addOrb(it, (i-(n-1)/2)*step));
    this.group.visible=true;
  }

  update(dt){
    const e=this.e, time=e.clock.elapsedTime;
    e.mallets[0].getWorldPosition(this._m0);
    if(e.mallets[1]) e.mallets[1].getWorldPosition(this._m1);
    let pending=null;
    for(const o of this.orbs){
      if(o.cd>0) o.cd-=dt;
      o.g.position.y=o.base.y+Math.sin(time*1.5+o.ph)*0.02;
      o.ring.rotation.z+=dt*0.9; o.ring.rotation.x=Math.PI/2;
      let near=false;
      for(const mp of [this._m0,this._m1]){
        const d=mp.distanceTo(o.g.position);
        if(d<0.30) near=true;
        if(d<0.13 && o.cd<=0 && !pending){ o.cd=0.9; pending=o; }
      }
      const target=near?1.35:1.0;
      const s=o.orb.scale.x + (target-o.orb.scale.x)*Math.min(1,dt*10);
      o.orb.scale.setScalar(s);
      o.orb.material.emissiveIntensity = near?1.1:0.7;
      o.lbl.quaternion.copy(e._vq);
    }
    if(pending){ e.sfx.pick(); e.burst(pending.g.position, pending.hex); const act=pending.action; act(); }
  }
}