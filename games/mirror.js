// games/mirror.js — Miroir (mode spécial générique)
// Un mini-jeu de base tiré au sort, mais le monde est INVERSÉ gauche/droite.
// Très déroutant… et très drôle.
export default {
  id:'mirror',
  name:{fr:'Miroir', en:'Mirror'},
  color:'#4db8ff',
  usesSurfaces:false,
  theme:'carnival',
  dlc:true, special:true,

  _g:null,

  _pick(engine){
    const pool=engine.games.filter(g=>!g.special && !g.chooseOptions && !g.usesSurfaces);
    return pool.length? pool[(Math.random()*pool.length)|0] : null;
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
  buildLayout(engine, spots){ engine.setMirror(true); this._g && this._g.buildLayout(engine, spots); },
  start(engine){
    engine.setMirror(true);
    this._g && this._g.start(engine);
    const nm=this._g? (this._g.name[engine.lang]||this._g.name.fr) : '';
    if(nm) engine.popup(new engine.THREE.Vector3(0,1.75,-1.2), nm, '#4db8ff');
  },
  update(dt, engine){ this._g && this._g.update(dt, engine); },
  onTrigger(i, engine){ this._g && this._g.onTrigger && this._g.onTrigger(i, engine); },
  onRelease(i, engine){ this._g && this._g.onRelease && this._g.onRelease(i, engine); },
  onEnd(engine){ this._g && this._g.onEnd && this._g.onEnd(engine); },
  cleanup(engine){ this._g && this._g.cleanup(engine); engine.setMirror(false); this._g=null; }
};