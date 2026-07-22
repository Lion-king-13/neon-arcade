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

  _addOrb(item, yaw, y){
    const T=THREE, r=0.92;
    const x=Math.sin(yaw)*r, z=-Math.cos(yaw)*r;
    const col = item.locked ? '#5b6472' : item.color;
    const orb=new T.Mesh(new T.SphereGeometry(0.055,24,18),
      new T.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:item.locked?0.25:0.7, roughness:.3}));
    const ring=new T.Mesh(new T.TorusGeometry(0.09,0.006,10,32),
      new T.MeshBasicMaterial({color:col, transparent:true, opacity:item.locked?0.35:0.75}));
    const halo=new T.Mesh(new T.SphereGeometry(0.078,18,14),
      new T.MeshBasicMaterial({color:col, transparent:true, opacity:item.locked?0.05:0.12}));
    const g=new T.Group(); g.add(orb); g.add(ring); g.add(halo);
    const base=new T.Vector3(x,y,z); g.position.copy(base);
    const lbl=this._label((item.locked?'🔒 ':'')+item.label, col); lbl.position.set(x,y-0.135,z);
    this.group.add(g); this.group.add(lbl);
    this.orbs.push({g, orb, ring, lbl, base, action:item.action, locked:!!item.locked, cd:0.7, ph:Math.random()*6, hex:new T.Color(col).getHex()});
  }

  hide(){ this._clear(); this.group.visible=false; }
  _clear(){ for(const o of this.orbs){ this.group.remove(o.g); this.group.remove(o.lbl); } this.orbs.length=0; }

  render(){
    const e=this.e;
    this._clear();
    if(!this._view) this._view='base';
    e.showHUD(false);
    const special = this._view==='special';
    e.drawBoard([{text:special?e.t('special'):'NEON ARCADE', s:special?60:78, col:special?'#ffd54a':'#ff2d95', gap:8},{text:e.t('choose'), s:44, col:'#2ee6d6'}]);
    e.showBoard(true);

    let items;
    if(special){
      items=e.games.filter(g=>g.special).map(g=>({ label:(g.name[e.lang]||g.name.fr), color:g.color||'#ffd54a', locked:false, action:()=>e.selectGame(g) }));
      items.push({label:e.t('help'), color:'#4db8ff', action:()=>e.showHelp('special')});
      items.push({label:e.t('scores'), color:'#ffd54a', action:()=>e.showScores('special')});
      items.push({label:e.t('back'), color:'#8b93a7', action:()=>{ this._view='base'; this.render(); }});
    } else {
      items=e.games.filter(g=>!g.special).map(g=>({
        label:(g.name[e.lang]||g.name.fr), color:g.color||'#2ee6d6',
        locked: !!g.dlc && !e.entitled('special'), action:()=>e.selectGame(g)
      }));
      // orbe Modes Spéciaux (si des modes spéciaux existent)
      if(e.games.some(g=>g.special)){
        items.push({ label:e.t('special'), color:'#ffd54a', locked:!e.entitled('special'), action:()=>{ this._view='special'; this.render(); } });
      }
      items.push({label:e.t('vs'), color:'#b8f34d', action:()=>e.startVS()});
      items.push({label:e.t('help'), color:'#4db8ff', action:()=>e.showHelp('base')});
      items.push({label:e.t('scores'), color:'#ffd54a', action:()=>e.showScores('base')});
      items.push({label:e.t('quit'), color:'#8b93a7', action:()=>e.exit()});
    }
    const n=items.length;
    const rows = n>6 ? 2 : 1;
    const perRow = Math.ceil(n/rows);
    items.forEach((it,idx)=>{
      const row=Math.floor(idx/perRow), col=idx%perRow;
      const inRow=Math.min(perRow, n-row*perRow);
      const step=Math.min(0.34, 1.7/Math.max(1,inRow));
      const yaw=(col-(inRow-1)/2)*step;
      const y=(rows===1?1.34:1.48)-row*0.34;
      this._addOrb(it, yaw, y);
    });
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
      o.orb.material.emissiveIntensity = o.locked ? 0.25 : (near?1.1:0.7);
      o.lbl.quaternion.copy(e._vq);
    }
    if(pending){
      if(pending.locked){ e.sfx.bad(); e.popup(pending.g.position, 'DLC', '#8b93a7'); }
      else { e.sfx.pick(); e.burst(pending.g.position, pending.hex); const act=pending.action; act(); }
    }
  }
}