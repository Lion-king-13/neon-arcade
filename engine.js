// engine.js — moteur commun NEON ARCADE
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const BASE_STRINGS = {
  fr:{ score:"SCORE", combo:"COMBO", time2:"TEMPS", again:"REJOUER", menu:"MENU", quit:"QUITTER", play:"JOUER",
       go:"GO", timeUp:"TEMPS !", result:"TERMINÉ", newbest:"NOUVEAU RECORD !", hitsL:"Touchées", accL:"Précision",
       best:"Meilleur", scanning:"Analyse de la zone…", choose:"Choisis un jeu", ready:"Prêt" },
  en:{ score:"SCORE", combo:"COMBO", time2:"TIME", again:"PLAY AGAIN", menu:"MENU", quit:"QUIT", play:"PLAY",
       go:"GO", timeUp:"TIME!", result:"FINISHED", newbest:"NEW RECORD!", hitsL:"Hits", accL:"Accuracy",
       best:"Best", scanning:"Scanning your area…", choose:"Choose a game", ready:"Ready" }
};

export class Engine {
  constructor(){
    this.THREE = THREE;
    this.lang = 'fr';
    this.settings = { mode:'vr', diff:'normal', dur:60 };
    this.strings = { fr:{...BASE_STRINGS.fr}, en:{...BASE_STRINGS.en} };
    this.state = 'idle';
    this.currentGame = null; this.hub = null; this.games = [];

    this.score=0; this.combo=0; this.hits=0; this.misses=0; this.timeLeft=0;
    this.countT=0; this.countN=3; this.scanT=0; this.scanBest=[];

    this.buttons=[]; this.popups=[]; this.particles=[]; this.fireflies=[];
    this.xrSession=null; this.boundedSpace=null; this.vrReady=false; this.arReady=false;

    this._tmp=new THREE.Vector3(); this._tmp2=new THREE.Vector3(); this._vq=new THREE.Quaternion(); this._q=new THREE.Quaternion();

    this._buildScene();
    this._buildForest();
    this._buildRetro();
    this._buildControllers();
    this._buildPanels();
    this._buildAudio();

    this._initEntitlements();
    this.clock=new THREE.Clock();
    this.useEnvironment('hub');           // arrière-plan du menu 2D = rétro
    this.renderer.setAnimationLoop((t,frame)=>this._render(frame));
  }

  /* ---------- i18n ---------- */
  addStrings(dict){ for(const l of ['fr','en']) if(dict[l]) Object.assign(this.strings[l], dict[l]); }
  t(k){ return (this.strings[this.lang] && this.strings[this.lang][k]) || k; }

  /* ---------- Scène ---------- */
  _buildScene(){
    const scene=new THREE.Scene(); this.scene=scene;
    this.skyTex=this._makeSky();
    this.camera=new THREE.PerspectiveCamera(65, innerWidth/innerHeight, 0.05, 100);
    this.camera.position.set(0,1.55,1.1);
    const renderer=new THREE.WebGLRenderer({antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
    renderer.xr.enabled=true; document.body.appendChild(renderer.domElement); this.renderer=renderer;

    scene.add(new THREE.HemisphereLight(0x9fb4c9,0x203028,1.1));
    const key=new THREE.DirectionalLight(0xcfe0ff,0.85); key.position.set(2,5,2); scene.add(key);
    this.rim=new THREE.PointLight(0x8b6cff,5,12); this.rim.position.set(0,2.4,-1.2); scene.add(this.rim);

    this.grid=new THREE.GridHelper(24,48,0x2ee6d6,0x123028);
    this.grid.material.transparent=true; this.grid.material.opacity=0.28; scene.add(this.grid);
    this.floor=new THREE.Mesh(new THREE.CircleGeometry(14,48), new THREE.MeshStandardMaterial({color:0x0b1512,roughness:1,metalness:0}));
    this.floor.rotation.x=-Math.PI/2; this.floor.position.y=-0.002; scene.add(this.floor);

    this.field=new THREE.Group(); scene.add(this.field);
    addEventListener('resize',()=>{ this.camera.aspect=innerWidth/innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth,innerHeight); });
  }
  _makeSky(){
    const cv=document.createElement('canvas'); cv.width=16; cv.height=256; const g=cv.getContext('2d');
    const grad=g.createLinearGradient(0,0,0,256);
    grad.addColorStop(0,'#090d28'); grad.addColorStop(.52,'#0d2033'); grad.addColorStop(.78,'#123b39'); grad.addColorStop(1,'#08130f');
    g.fillStyle=grad; g.fillRect(0,0,16,256); const tex=new THREE.CanvasTexture(cv); return tex;
  }

  /* ---------- Décor forêt (jeu, immersion) ---------- */
  _buildForest(){
    this.env=new THREE.Group(); this.scene.add(this.env);
    const trunkMat=new THREE.MeshStandardMaterial({color:0x201a2e,roughness:.9});
    const folA=new THREE.MeshStandardMaterial({color:0x1f6f55,emissive:0x0e3b2c,emissiveIntensity:.35,roughness:.75});
    const folB=new THREE.MeshStandardMaterial({color:0x2ea27a,emissive:0x14513a,emissiveIntensity:.42,roughness:.75});
    for(let i=0;i<16;i++){
      const a=(i/16)*Math.PI*2+(Math.random()-.5)*0.28, rad=3.2+Math.random()*2.6, h=1.6+Math.random()*1.9;
      const tree=new THREE.Group();
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.10,h*0.5,7),trunkMat); trunk.position.y=h*0.25; tree.add(trunk);
      for(let l=0;l<3;l++){ const cone=new THREE.Mesh(new THREE.ConeGeometry(0.58-l*0.13,0.82,8), l%2?folB:folA); cone.position.y=h*0.45+l*0.42; tree.add(cone); }
      tree.position.set(Math.cos(a)*rad,0,Math.sin(a)*rad); tree.rotation.y=Math.random()*Math.PI; tree.scale.setScalar(0.8+Math.random()*0.7);
      this.env.add(tree);
    }
    const moon=new THREE.Mesh(new THREE.SphereGeometry(0.7,20,16),new THREE.MeshBasicMaterial({color:0xe4e9ff})); moon.position.set(-4.5,4.6,-6.5); this.env.add(moon);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(1.0,20,16),new THREE.MeshBasicMaterial({color:0x8ea0ff,transparent:true,opacity:0.14})); glow.position.copy(moon.position); this.env.add(glow);
    const ffGeo=new THREE.SphereGeometry(0.016,6,6), ffMat=new THREE.MeshBasicMaterial({color:0xd6f56e});
    for(let i=0;i<30;i++){ const f=new THREE.Mesh(ffGeo,ffMat); const base=new THREE.Vector3((Math.random()-.5)*7,0.4+Math.random()*2.4,(Math.random()-.5)*7); f.position.copy(base); this.env.add(f); this.fireflies.push({mesh:f,base,ph:Math.random()*6.28,sp:0.4+Math.random()*0.6}); }
  }
  _updateFireflies(time){ for(const f of this.fireflies){ f.mesh.position.x=f.base.x+Math.sin(time*f.sp+f.ph)*0.25; f.mesh.position.y=f.base.y+Math.sin(time*f.sp*0.7+f.ph)*0.18; f.mesh.position.z=f.base.z+Math.cos(time*f.sp+f.ph)*0.25; } }

  /* ---------- Décor rétro (hub) ---------- */
  _makeRetroSky(){
    const cv=document.createElement('canvas'); cv.width=16; cv.height=256; const g=cv.getContext('2d');
    const grad=g.createLinearGradient(0,0,0,256);
    grad.addColorStop(0,'#1a0b3a'); grad.addColorStop(.5,'#2a0f4a'); grad.addColorStop(.8,'#3a1250'); grad.addColorStop(1,'#0a0618');
    g.fillStyle=grad; g.fillRect(0,0,16,256); return new THREE.CanvasTexture(cv);
  }
  _makeGridTex(){
    const s=256, cv=document.createElement('canvas'); cv.width=cv.height=s; const c=cv.getContext('2d');
    c.fillStyle='#0a0618'; c.fillRect(0,0,s,s);
    c.shadowBlur=10; c.lineWidth=4;
    c.strokeStyle='#ff2d95'; c.shadowColor='#ff2d95';
    c.beginPath(); c.moveTo(0,0); c.lineTo(s,0); c.stroke();
    c.strokeStyle='#2ee6d6'; c.shadowColor='#2ee6d6';
    c.beginPath(); c.moveTo(0,0); c.lineTo(0,s); c.stroke();
    const tex=new THREE.CanvasTexture(cv); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(30,30); return tex;
  }
  _makeSunTex(){
    const s=256, cv=document.createElement('canvas'); cv.width=cv.height=s; const c=cv.getContext('2d');
    const grad=c.createLinearGradient(0,0,0,s);
    grad.addColorStop(0,'#ffe66a'); grad.addColorStop(.5,'#ff7a3c'); grad.addColorStop(1,'#ff2d95');
    c.fillStyle=grad; c.beginPath(); c.arc(s/2,s/2,s*0.42,0,Math.PI*2); c.fill();
    c.globalCompositeOperation='destination-out';
    for(let y=s*0.56, k=0; y<s; y+=13, k++){ c.fillRect(0,y,s, 6+k*1.2); }
    return new THREE.CanvasTexture(cv);
  }
  _buildRetro(){
    this.retro=new THREE.Group(); this.scene.add(this.retro); this.retro.visible=false;
    this.retroSky=this._makeRetroSky();
    const grid=new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.MeshBasicMaterial({map:this._makeGridTex(),transparent:true}));
    grid.rotation.x=-Math.PI/2; this.retro.add(grid);
    const sun=new THREE.Mesh(new THREE.PlaneGeometry(7,7), new THREE.MeshBasicMaterial({map:this._makeSunTex(),transparent:true}));
    sun.position.set(0,3.0,-11); this.retro.add(sun);
    const pts=[]; for(let i=0;i<160;i++){ const a=Math.random()*Math.PI*2, r=6+Math.random()*8, y=2+Math.random()*7; pts.push(Math.cos(a)*r,y,Math.sin(a)*r-4); }
    const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    this.retro.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.05,transparent:true,opacity:.8})));
    const mMat=new THREE.MeshBasicMaterial({color:0xff2d95,wireframe:true});
    for(let i=0;i<9;i++){ const a=-Math.PI/2+(i/8)*Math.PI; const m=new THREE.Mesh(new THREE.ConeGeometry(1.2+Math.random(),1.5+Math.random()*1.6,4),mMat);
      m.position.set(Math.cos(a)*9, 0.7, Math.sin(a)*9-2); m.rotation.y=Math.random(); this.retro.add(m); }
  }

  useEnvironment(kind){
    const retro=kind==='hub', vr=kind==='gameVR', ar=kind==='gameAR';
    this.retro.visible=retro; this.env.visible=vr; this.grid.visible=vr; this.floor.visible=vr; this.rim.visible=vr;
    if(ar){ this.scene.background=null; this.scene.fog=null; this.renderer.setClearAlpha(0); }
    else if(retro){ this.scene.background=this.retroSky; this.scene.fog=new THREE.FogExp2(0x140a2e,0.032); this.renderer.setClearAlpha(1); }
    else { this.scene.background=this.skyTex; this.scene.fog=new THREE.FogExp2(0x0a1a17,0.085); this.renderer.setClearAlpha(1); }
  }

  /* ---------- Contrôleurs ---------- */
  _buildControllers(){
    this.mallets=[]; this.grips=[]; this.malletVisual=[]; this._tools=[]; const COL=[0x2ee6d6,0xff4d5e];
    for(let i=0;i<2;i++){
      const grip=this.renderer.xr.getControllerGrip(i); const g=new THREE.Group();
      const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.018,0.14,12), new THREE.MeshStandardMaterial({color:0x1a2030,roughness:.6,metalness:.4}));
      handle.rotation.x=-Math.PI/2; handle.position.z=-0.02; g.add(handle);
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.05,20,16), new THREE.MeshStandardMaterial({color:COL[i],emissive:COL[i],emissiveIntensity:.9,roughness:.35}));
      head.position.z=-0.12; g.add(head);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.058,0.008,10,24), new THREE.MeshBasicMaterial({color:COL[i]})); ring.position.z=-0.12; g.add(ring);
      grip.add(g); this.scene.add(grip); this.mallets.push(head); this.grips.push(grip); this.malletVisual.push(g);
    }
    // contrôleurs "ray" pour la gâchette (jeux de tir)
    this.controllers=[];
    for(let i=0;i<2;i++){
      const c=this.renderer.xr.getController(i); this.scene.add(c);
      c.addEventListener('selectstart', ()=>{ if(this.state==='play') this.currentGame && this.currentGame.onTrigger && this.currentGame.onTrigger(i,this); });
      this.controllers.push(c);
    }
  }
  // Rayon de visée : remplit origin (position) et dir (direction -Z monde) du contrôleur i.
  aimRay(i, origin, dir){
    const c=this.controllers[i]; c.getWorldPosition(origin);
    dir.set(0,0,-1).applyQuaternion(c.getWorldQuaternion(this._q)); return dir;
  }
  // Filet de capture télescopique (papillons). userData.cp = point de capture.
  makeNet(i){
    const T=this.THREE; const g=new T.Group();
    const silver=new T.MeshStandardMaterial({color:0xd7dce4, roughness:.3, metalness:.85});
    const black=new T.MeshStandardMaterial({color:0x14161c, roughness:.6, metalness:.2});
    const white=new T.MeshBasicMaterial({color:0xf4f6fb, transparent:true, opacity:.16, side:T.DoubleSide});
    const netWire=new T.MeshBasicMaterial({color:0xffffff, wireframe:true, transparent:true, opacity:.4});
    // manche : poignée noire (côté main) + 2 segments argentés télescopiques
    const grip=new T.Mesh(new T.CylinderGeometry(0.013,0.013,0.10,12), black); grip.rotation.x=Math.PI/2; grip.position.z=0.02; g.add(grip);
    const seg1=new T.Mesh(new T.CylinderGeometry(0.011,0.012,0.16,12), silver); seg1.rotation.x=Math.PI/2; seg1.position.z=-0.11; g.add(seg1);
    const seg2=new T.Mesh(new T.CylinderGeometry(0.009,0.010,0.14,12), silver); seg2.rotation.x=Math.PI/2; seg2.position.z=-0.24; g.add(seg2);
    // cerceau métallique
    const hoop=new T.Mesh(new T.TorusGeometry(0.115,0.006,12,40), silver); hoop.position.z=-0.33; g.add(hoop);
    // poche blanche profonde + maillage
    const bag=new T.Mesh(new T.ConeGeometry(0.115,0.20,24,1,true), white); bag.rotation.x=-Math.PI/2; bag.position.z=-0.43; g.add(bag);
    const mesh=new T.Mesh(new T.ConeGeometry(0.115,0.20,14,4,true), netWire); mesh.rotation.x=-Math.PI/2; mesh.position.z=-0.43; g.add(mesh);
    const cp=new T.Object3D(); cp.position.set(0,0,-0.36); g.add(cp); g.userData.cp=cp;
    return g;
  }
  // Canne à crochet (pêche aux canards). userData.cp = pointe du crochet.
  makeHook(i){
    const T=this.THREE; const color=[0x2ee6d6,0xff4d5e][i]; const g=new T.Group();
    const pole=new T.Mesh(new T.CylinderGeometry(0.008,0.009,0.30,10), new T.MeshStandardMaterial({color:0x6b4a2a,roughness:.85}));
    pole.rotation.x=Math.PI/2; pole.position.z=-0.15; g.add(pole);
    const hook=new T.Mesh(new T.TorusGeometry(0.032,0.006,10,18,Math.PI*1.5), new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.6,roughness:.4,metalness:.4}));
    hook.position.set(0,-0.025,-0.31); hook.rotation.set(0,Math.PI/2,Math.PI*0.5); g.add(hook);
    const cp=new T.Object3D(); cp.position.set(0,-0.05,-0.32); g.add(cp); g.userData.cp=cp;
    return g;
  }
  eachMallet(cb){ for(let i=0;i<this.mallets.length;i++){ this.mallets[i].getWorldPosition(this._tmp); cb(this._tmp,i); } }
  // Échange l'outil en main. space='grip' (tenu) ou 'ray' (aligné sur la visée).
  setTool(fn, space){
    this.clearTool();
    const parents = space==='ray' ? this.controllers : this.grips;
    for(let i=0;i<parents.length;i++){ this.malletVisual[i].visible=false; const tool=fn(i); if(tool){ parents[i].add(tool); this._tools.push(tool); } }
  }
  clearTool(){
    for(const tl of this._tools){ tl.parent && tl.parent.remove(tl); }
    this._tools.length=0;
    for(const v of this.malletVisual) v.visible=true;
  }

  /* ---------- Panneaux / HUD / boutons ---------- */
  _makePanel(w,h,px){
    const canvas=document.createElement('canvas'); canvas.width=px; canvas.height=Math.round(px*h/w);
    const ctx=canvas.getContext('2d'); const tex=new THREE.CanvasTexture(canvas); tex.anisotropy=4;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({map:tex,transparent:true}));
    return {mesh,ctx,canvas,tex};
  }
  _rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  _buildPanels(){
    this.hud=this._makePanel(0.94,0.27,940); this.hud.mesh.position.set(0,2.05,-0.72); this.scene.add(this.hud.mesh); this.hud.mesh.visible=false;
    this.board=this._makePanel(1.1,0.74,1000); this.board.mesh.position.set(0,1.5,-1.25); this.scene.add(this.board.mesh); this.board.mesh.visible=false;
  }
  drawHUD(){
    const c=this.hud.ctx, W=this.hud.canvas.width, H=this.hud.canvas.height; c.clearRect(0,0,W,H);
    c.fillStyle='rgba(19,24,38,.86)'; this._rr(c,0,0,W,H,26); c.fill();
    c.strokeStyle='rgba(46,230,214,.5)'; c.lineWidth=3; this._rr(c,2,2,W-4,H-4,24); c.stroke();
    const cell=(label,val,x,col)=>{ c.textAlign='center'; c.fillStyle='#8b93a7'; c.font='700 26px Segoe UI, sans-serif'; c.fillText(label,x,56); c.fillStyle=col; c.font='900 74px Segoe UI, sans-serif'; c.fillText(val,x,136); };
    cell(this.t('score'),String(this.score),W*0.2,'#f4f6fb');
    cell(this.t('combo'),'x'+this.combo,W*0.5,'#b8f34d');
    cell(this.t('time2'),Math.max(0,Math.ceil(this.timeLeft))+'s',W*0.8,this.timeLeft<=5?'#ff4d5e':'#2ee6d6');
    this.hud.tex.needsUpdate=true;
  }
  drawBoard(lines){
    const c=this.board.ctx, W=this.board.canvas.width, H=this.board.canvas.height; c.clearRect(0,0,W,H);
    c.fillStyle='rgba(15,20,34,.9)'; this._rr(c,0,0,W,H,34); c.fill();
    c.strokeStyle='rgba(139,108,255,.6)'; c.lineWidth=4; this._rr(c,3,3,W-6,H-6,30); c.stroke();
    c.textAlign='center';
    const subs=lines.map(ln=>ln.text.split('\n'));
    let total=0; lines.forEach((ln,i)=>{ total += subs[i].length*(ln.s||70)*1.02 + (ln.gap||14); });
    total -= (lines[lines.length-1].gap||14);
    let y=(H-total)/2;
    lines.forEach((ln,i)=>{
      c.fillStyle=ln.col||'#f4f6fb'; c.font=(ln.w||'900')+' '+(ln.s||70)+'px Segoe UI, sans-serif';
      for(const p of subs[i]){ y+=(ln.s||70)*0.80; c.fillText(p,W/2,y); y+=(ln.s||70)*0.22; }
      y+=(ln.gap||14);
    });
    this.board.tex.needsUpdate=true;
  }
  showBoard(v){ this.board.mesh.visible=v; }
  showHUD(v){ this.hud.mesh.visible=v; }
  clearButtons(){ for(const b of this.buttons){ this.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.map.dispose(); b.mesh.material.dispose(); } this.buttons.length=0; }
  setButtons(list){
    this.clearButtons();
    for(const it of list){
      const p=this._makePanel(0.34,0.14,360); const c=p.ctx,W=p.canvas.width,H=p.canvas.height;
      c.fillStyle='rgba(19,24,38,.95)'; this._rr(c,0,0,W,H,40); c.fill();
      c.lineWidth=5; c.strokeStyle=it.color; this._rr(c,3,3,W-6,H-6,36); c.stroke();
      c.fillStyle=it.color; c.textAlign='center'; c.font='900 58px Segoe UI, sans-serif'; c.fillText(it.label,W/2,H/2+20); p.tex.needsUpdate=true;
      p.mesh.position.copy(it.pos); this.scene.add(p.mesh);
      this.buttons.push({mesh:p.mesh,onTrigger:it.onTrigger,cd:0.5});
    }
  }
  _updateButtons(dt){
    for(const b of this.buttons){ if(b.cd>0) b.cd-=dt; }
    this.eachMallet((pos)=>{ for(const b of this.buttons){ if(b.cd>0) continue; if(pos.distanceTo(b.mesh.position)<0.13){ b.cd=0.6; b.onTrigger(); } } });
  }

  /* ---------- Audio ---------- */
  _buildAudio(){
    this.actx=null;
    this.sfx={
      hit:()=>this._beep(420,0.12,'square',0.16,760),
      gold:()=>{ this._beep(660,0.1,'triangle',0.18,990); setTimeout(()=>this._beep(990,0.12,'triangle',0.16,1320),70); },
      bad:()=>this._beep(150,0.22,'sawtooth',0.2,60),
      miss:()=>this._beep(200,0.12,'sine',0.08,140),
      count:()=>this._beep(520,0.1,'sine',0.14),
      go:()=>this._beep(880,0.25,'triangle',0.2,1200),
      end:()=>{ this._beep(600,0.15,'triangle',0.16,400); setTimeout(()=>this._beep(400,0.3,'sine',0.16,200),150); },
      pick:()=>{ this._beep(700,0.08,'square',0.16,1100); setTimeout(()=>this._beep(1100,0.1,'square',0.14,1500),60); },
      shot:()=>this._beep(880,0.06,'square',0.14,220)
    };
    this.voiceOK='speechSynthesis' in window;
  }
  _audio(){ if(!this.actx) this.actx=new (window.AudioContext||window.webkitAudioContext)(); return this.actx; }
  _beep(freq,dur,type,gain,slideTo){
    try{ const a=this._audio(),o=a.createOscillator(),g=a.createGain(); o.type=type||'sine'; o.frequency.value=freq;
      if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo,a.currentTime+dur);
      g.gain.setValueAtTime(gain||0.15,a.currentTime); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+dur);
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+dur);
    }catch(e){}
  }
  speak(txt){ if(!this.voiceOK) return; try{ const u=new SpeechSynthesisUtterance(txt); u.lang=this.lang==='fr'?'fr-FR':'en-US'; u.rate=1.1; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){} }

  /* ---------- Particules / points ---------- */
  burst(pos,color){
    const geo=this._partGeo||(this._partGeo=new THREE.SphereGeometry(0.014,6,6));
    const mat=new THREE.MeshBasicMaterial({color});
    for(let i=0;i<12;i++){ const p=new THREE.Mesh(geo,mat); p.position.copy(pos);
      const v=new THREE.Vector3((Math.random()-.5),(Math.random()*.8+.2),(Math.random()-.5)).multiplyScalar(1.5);
      this.scene.add(p); this.particles.push({mesh:p,v,life:0.5}); }
  }
  _updateParticles(dt){ for(let i=this.particles.length-1;i>=0;i--){ const pt=this.particles[i]; pt.life-=dt; pt.v.y-=3*dt; pt.mesh.position.addScaledVector(pt.v,dt); pt.mesh.scale.multiplyScalar(1-dt*2); if(pt.life<=0){ this.scene.remove(pt.mesh); this.particles.splice(i,1); } } }
  popup(pos,text,color){
    const cv=document.createElement('canvas'); cv.width=256; cv.height=128; const c=cv.getContext('2d');
    c.textAlign='center'; c.font='900 96px Segoe UI, sans-serif'; c.lineWidth=10; c.strokeStyle='rgba(0,0,0,.55)'; c.strokeText(text,128,92); c.fillStyle=color; c.fillText(text,128,92);
    const tex=new THREE.CanvasTexture(cv); const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthTest:false});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(0.18,0.09),mat); mesh.position.copy(pos); mesh.renderOrder=999; this.scene.add(mesh);
    this.popups.push({mesh,mat,life:0.85});
  }
  _updatePopups(dt){ for(let i=this.popups.length-1;i>=0;i--){ const u=this.popups[i]; u.life-=dt; u.mesh.position.y+=dt*0.4; u.mesh.quaternion.copy(this._vq); u.mat.opacity=Math.max(0,u.life/0.85); if(u.life<=0){ this.scene.remove(u.mesh); u.mesh.material.map.dispose(); this.popups.splice(i,1); } } }
  clearPopups(){ for(const u of this.popups) this.scene.remove(u.mesh); this.popups.length=0; }

  /* ---------- Scoring ---------- */
  good(pos,base,color){ this.combo++; this.hits++; const mult=1+Math.floor(this.combo/5); const pts=base*mult; this.score+=pts; this.popup(pos,'+'+pts,color||'#eaffd2'); (color==='#ffd54a'?this.sfx.gold:this.sfx.hit)(); this.burst(pos, color?parseInt(color.slice(1),16):0xb8f34d); return pts; }
  bad(pos,penalty){ this.combo=0; this.misses++; this.score=Math.max(0,this.score-penalty); this.popup(pos,'-'+penalty,'#ff5a68'); this.sfx.bad(); this.burst(pos,0xff4d5e); }
  miss(){ this.combo=0; this.misses++; this.sfx.miss(); }

  /* ---------- Surfaces (passthrough) ---------- */
  _pointInPoly(x,z,poly){ let inside=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const xi=poly[i].x,zi=poly[i].z,xj=poly[j].x,zj=poly[j].z; const inter=((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi); if(inter) inside=!inside; } return inside; }
  _boundsPolygon(frame,ref){ const bs=this.boundedSpace; if(!bs||!bs.boundsGeometry||bs.boundsGeometry.length<3) return null; let bp; try{ bp=frame.getPose(bs,ref); }catch(e){ return null; } if(!bp) return null; const bm=new THREE.Matrix4().fromArray(bp.transform.matrix); return bs.boundsGeometry.map(pt=>{ const w=new THREE.Vector3(pt.x,0,pt.z).applyMatrix4(bm); return {x:w.x,z:w.z}; }); }
  sampleSpots(frame){
    const out=[]; const ref=this.renderer.xr.getReferenceSpace(); if(!frame||!frame.detectedPlanes||!ref) return out;
    const player=new THREE.Vector3(0,1.2,0); const zone=this._boundsPolygon(frame,ref); const MAX_DIST=2.4;
    const FURNITURE=['table','desk','couch','sofa','shelf','storage','bed','screen','lamp','plant','other','window','door','wall art'];
    frame.detectedPlanes.forEach(plane=>{
      let pose; try{ pose=frame.getPose(plane.planeSpace,ref); }catch(e){ return; }
      if(!pose||!plane.polygon||plane.polygon.length<3) return;
      const m=new THREE.Matrix4().fromArray(pose.transform.matrix); const label=(plane.semanticLabel||'').toLowerCase(); let kind;
      if(label.includes('floor')) kind='floor'; else if(label.includes('ceiling')) kind='ceiling'; else if(label.includes('wall')) kind='wall';
      else if(FURNITURE.some(k=>label.includes(k))) return;
      else if(plane.orientation==='horizontal'){ const y=(new THREE.Vector3().setFromMatrixPosition(m)).y; if(y<0.35) kind='floor'; else if(y>1.6) kind='ceiling'; else return; }
      else kind='wall';
      const poly=plane.polygon.map(p=>({x:p.x,z:p.z}));
      let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9; poly.forEach(p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);});
      const perPlane=kind==='floor'?4:3; let placed=0,tries=0;
      while(placed<perPlane && tries<60){ tries++;
        const px=minX+Math.random()*(maxX-minX), pz=minZ+Math.random()*(maxZ-minZ);
        if(!this._pointInPoly(px,pz,poly)) continue;
        const world=new THREE.Vector3(px,0,pz).applyMatrix4(m);
        if(kind!=='ceiling'&&(world.y<0.25||world.y>2.2)) continue;
        if(Math.hypot(world.x-player.x,world.z-player.z)>MAX_DIST) continue;
        if(zone&&!this._pointInPoly(world.x,world.z,zone)) continue;
        let normal,emerge;
        if(kind==='floor'){ normal=new THREE.Vector3(0,1,0); emerge=0.2; world.y=Math.max(world.y,0.03); }
        else if(kind==='ceiling'){ normal=new THREE.Vector3(0,-1,0); emerge=THREE.MathUtils.clamp(world.y-1.75,0.4,1.1); }
        else { normal=new THREE.Vector3(player.x-world.x,0,player.z-world.z); if(normal.lengthSq()<1e-4) normal.set(0,0,1); normal.normalize(); emerge=0.22; }
        if(out.some(s=>s.pos.distanceTo(world)<0.35)) continue;
        out.push({pos:world,normal,kind,emerge}); placed++;
      }
    });
    return out.slice(0,16);
  }

  /* ---------- Jeux / états ---------- */
  /* ---------- Droits / DLC ---------- */
  // La couche boutique (Meta IAP via Digital Goods API, ou autre) appelle unlockDLC()
  // après achat. En dev/test : ?dlc=1 dans l'URL, ou engine.unlockDLC() dans la console.
  _initEntitlements(){
    this.entitlements={ special:false };
    try{
      const q=new URLSearchParams(location.search);
      if(q.get('dlc')==='1') localStorage.setItem('neonarcade_dlc','1');
      if(q.get('dlc')==='0') localStorage.removeItem('neonarcade_dlc');
      if(localStorage.getItem('neonarcade_dlc')==='1') this.entitlements.special=true;
    }catch(e){}
  }
  entitled(key){ return !!this.entitlements[key]; }
  unlockDLC(){ this.entitlements.special=true; try{ localStorage.setItem('neonarcade_dlc','1'); }catch(e){} if(this.state==='hub') this.hub.render(); }
  lockDLC(){ this.entitlements.special=false; try{ localStorage.removeItem('neonarcade_dlc'); }catch(e){} if(this.state==='hub') this.hub.render(); }

  registerGames(list){ this.games=list; for(const g of list) if(g.strings) this.addStrings(g.strings); }
  setHub(hub){ this.hub=hub; }
  clearField(){ while(this.field.children.length){ this.field.remove(this.field.children[0]); } }

  showHub(){
    this.state='hub'; this.showHUD(false); this.clearButtons();
    if(this.currentGame){ this.currentGame.cleanup?.(this); this.currentGame=null; }
    this.clearField(); this.clearPopups();
    this.useEnvironment('hub');
    this.hub.render();
  }
  selectGame(game){
    this.hub?.hide?.();
    this.currentGame=game; game.init?.(this); this.clearField(); this.sfx.pick();
    const ar = this.settings.mode==='ar';
    this.useEnvironment(ar?'gameAR':'gameVR');
    if(ar && game.usesSurfaces){
      this.state='scan'; this.scanT=0; this.scanBest=[]; this.setButtons([]); this.showBoard(true);
      this.drawBoard([{text:'NEON ARCADE',s:60,col:'#b8f34d',gap:12},{text:this.t('scanning'),s:44,col:'#2ee6d6'}]);
    } else { game.buildLayout(this,null); this._startCountdown(); }
  }
  _resetScore(){ this.score=0; this.combo=0; this.hits=0; this.misses=0; this.timeLeft=this.settings.dur; }
  _startCountdown(){
    this._resetScore(); this.currentGame.start?.(this);
    this.showBoard(true); this.setButtons([]); this.showHUD(false);
    this.state='count'; this.countT=0; this.countN=3;
    this.drawBoard([{text:'3',s:220,col:'#2ee6d6'}]); this.sfx.count(); this.speak(this.t('ready'));
  }
  _startPlay(){ this.state='play'; this.showBoard(false); this.setButtons([]); this.showHUD(true); this.timeLeft=this.settings.dur; this.sfx.go(); this.speak(this.t('go')); }
  _endGame(){
    this.state='over'; this.showHUD(false); this.currentGame.onEnd?.(this);
    const g=this.currentGame; const bk='neonarcade_'+g.id+'_'+this.settings.diff+'_'+this.settings.dur;
    const prev=parseInt(localStorage.getItem(bk)||'0',10); const record=this.score>prev;
    if(record){ try{ localStorage.setItem(bk,String(this.score)); }catch(e){} }
    const acc=this.hits+this.misses>0?Math.round(this.hits*100/(this.hits+this.misses)):0;
    this.drawBoard([
      {text:this.t('result'),s:56,col:'#8b93a7',gap:6},
      {text:String(this.score),s:150,col:'#b8f34d',gap:10},
      record?{text:this.t('newbest'),s:44,col:'#ffd54a',gap:14}:{text:this.t('best')+' '+Math.max(prev,this.score),s:34,col:'#8b93a7',gap:14},
      {text:this.t('hitsL')+' '+this.hits+'   ·   '+this.t('accL')+' '+acc+'%',s:34,col:'#8b93a7'}
    ]);
    this.showBoard(true);
    this.setButtons([
      {label:this.t('again'),color:'#2ee6d6',pos:new THREE.Vector3(-0.2,1.02,-0.85),onTrigger:()=>this._startCountdown()},
      {label:this.t('menu'), color:'#8b93a7',pos:new THREE.Vector3(0.2,1.02,-0.85), onTrigger:()=>this.showHub()}
    ]);
    this.sfx.end(); this.speak(this.t('timeUp'));
  }

  /* ---------- Sessions (ré-entrant) ---------- */
  async detect(){ if(!navigator.xr) return; const [v,a]=await Promise.all([ navigator.xr.isSessionSupported('immersive-vr').catch(()=>false), navigator.xr.isSessionSupported('immersive-ar').catch(()=>false) ]); this.vrReady=v; this.arReady=a; }
  async enter(mode){
    if(this.xrSession){ try{ await this.xrSession.end(); }catch(e){} this.xrSession=null; }
    this.settings.mode=mode; try{ this._audio().resume(); }catch(e){}
    const sessionMode=mode==='ar'?'immersive-ar':'immersive-vr';
    const opts=mode==='ar'
      ? {requiredFeatures:['local-floor'],optionalFeatures:['plane-detection','anchors','hit-test','hand-tracking','bounded-floor']}
      : {optionalFeatures:['local-floor','bounded-floor','hand-tracking']};
    const session=await navigator.xr.requestSession(sessionMode,opts);
    this.xrSession=session;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    await this.renderer.xr.setSession(session);
    this.boundedSpace=(mode==='ar')?await session.requestReferenceSpace('bounded-floor').catch(()=>null):null;
    session.addEventListener('end',()=>{ this._onSessionEnd(); },{once:true});
    this.showHub();
  }
  _onSessionEnd(){
    this.xrSession=null; this.boundedSpace=null; this.state='idle';
    if(this.currentGame){ this.currentGame.cleanup?.(this); this.currentGame=null; }
    this.hub?.hide?.(); this.clearField(); this.clearPopups(); this.clearButtons();
    this.showBoard(false); this.showHUD(false);
    this.useEnvironment('hub');
    if(this.voiceOK) try{ speechSynthesis.cancel(); }catch(e){}
    this.onExit?.();
  }
  exit(){ if(this.xrSession){ try{ this.xrSession.end(); }catch(e){ this._onSessionEnd(); } } }

  /* ---------- Boucle ---------- */
  _render(frame){
    const dt=Math.min(this.clock.getDelta(),0.05); const time=this.clock.elapsedTime;
    if(this.renderer.xr.isPresenting){ this.renderer.xr.getCamera().getWorldQuaternion(this._vq); } else this.camera.getWorldQuaternion(this._vq);

    this._updateParticles(dt);
    if(this.env.visible) this._updateFireflies(time);

    if(this.state==='scan'){
      this.scanT+=dt; const spots=this.sampleSpots(frame); if(spots.length>this.scanBest.length) this.scanBest=spots;
      if(this.scanT>=1.8){ this.currentGame.buildLayout(this, this.scanBest.length>=6?this.scanBest:null); this._startCountdown(); }
    } else if(this.state==='count'){
      this.countT+=dt; if(this.countT>=0.85){ this.countT=0; this.countN--;
        if(this.countN>0){ this.drawBoard([{text:String(this.countN),s:220,col:'#2ee6d6'}]); this.sfx.count(); }
        else { this.drawBoard([{text:this.t('go'),s:200,col:'#b8f34d'}]); this._startPlay(); } }
    } else if(this.state==='play'){
      this.timeLeft-=dt; this.currentGame.update(dt,this); this.drawHUD(); if(this.timeLeft<=0) this._endGame();
    } else if(this.state==='hub'){
      this.hub?.update?.(dt,this);
    }

    if(this.state!=='play' && this.state!=='hub') this._updateButtons(dt);
    this._updatePopups(dt);
    if(!this.xrSession){ this._pa=(this._pa||0)+0.003; this.camera.position.x=Math.sin(this._pa)*0.5; this.camera.lookAt(0,1.4,-0.4); }
    this.renderer.render(this.scene,this.camera);
  }
}