// hub.js — menu in-VR pour choisir un mini-jeu.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class Hub {
  constructor(engine){ this.engine = engine; }

  render(){
    const e = this.engine;
    e.showHUD(false);
    e.drawBoard([
      {text:'NEON ARCADE', s:78, col:'#b8f34d', gap:8},
      {text:e.t('choose'), s:44, col:'#8b93a7'}
    ]);
    e.showBoard(true);

    const list = [];
    const n = e.games.length;
    const top = 1.34;
    e.games.forEach((g,i)=>{
      list.push({
        label: (g.name[e.lang]||g.name.fr),
        color: g.color || '#2ee6d6',
        pos: new THREE.Vector3(0, top - i*0.17, -0.85),
        onTrigger: ()=> e.selectGame(g)
      });
    });
    list.push({
      label: e.t('quit'),
      color: '#8b93a7',
      pos: new THREE.Vector3(0, top - n*0.17 - 0.04, -0.85),
      onTrigger: ()=> e.exit()
    });
    e.setButtons(list);
  }
}
