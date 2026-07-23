// games/daily.js — Défi du Jour (mode spécial générique)
// Chaque jour, un mini-jeu imposé (le même pour tout le monde, tiré de la date).
// Un seul essai qui compte vraiment : ton meilleur score du jour.
export default {
  id:'daily',
  name:{fr:'Défi du Jour', en:'Daily Challenge'},
  color:'#ffd54a',
  usesSurfaces:false,
  theme:'carnival',
  dlc:true, special:true,

  _g:null,

  _seed(){ const d=new Date(); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); },
  _pick(engine){
    const pool=engine.games.filter(g=>!g.special && !g.chooseOptions && !g.usesSurfaces).sort((a,b)=>a.id<b.id?-1:1);
    if(!pool.length) return null;
    let s=this._seed(); s=(s*1103515245+12345)>>>0;   // mélange simple
    return pool[s % pool.length];
  },
  init(engine){
    this._g=this._pick(engine);
    if(this._g){
      this._g.init?.(engine);
      const forced=engine.settings.decor;
      engine.gameTheme=(forced&&forced!=='auto')?forced:(this._g.theme||'carnival');
      engine.useEnvironment(engine.settings.mode==='ar'?'gameAR':'gameVR');
    }
  },
  buildLayout(engine, spots){ this._g && this._g.buildLayout(engine, spots); },
  start(engine){
    this._g && this._g.start(engine);
    const nm=this._g? (this._g.name[engine.lang]||this._g.name.fr) : '';
    const d=new Date(), dd=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
    if(nm && engine.THREE) engine.popup(new engine.THREE.Vector3(0,1.75,-1.2), dd+' · '+nm, '#ffd54a');
  },
  update(dt, engine){ this._g && this._g.update(dt, engine); },
  onTrigger(i, engine){ this._g && this._g.onTrigger && this._g.onTrigger(i, engine); },
  onRelease(i, engine){ this._g && this._g.onRelease && this._g.onRelease(i, engine); },
  onEnd(engine){ this._g && this._g.onEnd && this._g.onEnd(engine); },
  cleanup(engine){ this._g && this._g.cleanup(engine); this._g=null; }
};