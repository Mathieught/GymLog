// Écran de lancement : l'haltère du logo se dessine, puis "GymLog" apparaît et l'écran s'efface.
// Rendu dans le layout racine, donc affiché seulement au lancement (ou rechargement) de l'app, pas
// à chaque navigation. Animation 100 % CSS (voir .splash dans globals.css) : visible dès le premier
// affichage du HTML, sans attendre le JavaScript, et retirée d'elle-même à la fin.
export function SplashScreen() {
  return (
    <div className="splash" aria-hidden="true">
      <svg width="96" height="96" viewBox="0 0 512 512">
        <line x1="96" y1="256" x2="416" y2="256" />
        <line x1="140" y1="176" x2="140" y2="336" />
        <line x1="372" y1="176" x2="372" y2="336" />
        <line x1="96" y1="208" x2="96" y2="304" />
        <line x1="416" y1="208" x2="416" y2="304" />
      </svg>
      <p className="splash-word">
        Gym<span className="text-accent">Log</span>
      </p>
    </div>
  );
}
