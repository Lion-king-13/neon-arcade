NEON ARCADE — projet WebXR (Meta Quest 3)
==========================================

Structure
---------
  index.html          Page d'entrée : menu (langue, mode, difficulté, durée)
  engine.js           Moteur commun : scène, sessions VR/AR, contrôleurs,
                      HUD, boutons 3D, audio, langues, décor forêt,
                      points flottants, détection des surfaces réelles,
                      machine à états du jeu.
  hub.js              Menu in-VR pour choisir un mini-jeu.
  games/
    whackamole.js     Tape-Chenille (premier mini-jeu).

Lancer sur le Quest 3
---------------------
WebXR exige un hébergement HTTPS ; on NE peut PAS ouvrir index.html en file://
(les modules ES ne se chargeraient pas). Options simples :
  - Netlify Drop : glisser le dossier neon-arcade sur https://app.netlify.com/drop
  - GitHub Pages : pousser le dossier dans un repo, activer Pages
  - Serveur local + tunnel : `npx serve neon-arcade` puis un tunnel HTTPS (ngrok…)

Puis, dans le navigateur du Meta Quest 3, ouvrir l'URL et appuyer sur le bouton.
Pour le mode Passthrough, avoir défini/scanné sa pièce (Space Setup) sur le Quest.

Ajouter un mini-jeu
-------------------
Créer games/monjeu.js exportant un objet :

  export default {
    id:'monjeu',
    name:{fr:'Mon Jeu', en:'My Game'},
    color:'#2ee6d6',
    usesSurfaces:false,        // true si le jeu se pose sur les vrais murs/sol
    init(engine){},            // (optionnel) préparer des ressources
    buildLayout(engine, spots){}, // spots = surfaces réelles, ou null (immersion)
    start(engine){},           // début de partie : réinitialiser
    update(dt, engine){},      // chaque frame pendant le jeu
    cleanup(engine){},         // retirer ses objets
    onEnd(engine){}            // (optionnel) fin de partie
  }

API moteur utile : engine.field (groupe où ajouter ses meshes),
engine.eachMallet(cb), engine.good(pos,base,color), engine.bad(pos,penalty),
engine.miss(), engine.settings (mode/diff/dur), engine.timeLeft, engine.t(clé).

Puis l'enregistrer dans index.html :
  import monjeu from './games/monjeu.js';
  engine.registerGames([whackamole, monjeu]);
Le hub l'ajoutera automatiquement à la liste.
