// Configuration Expo dynamique.
//
// Tout le paramétrage statique vit dans app.json ; ce fichier ne fait qu'y
// injecter la clé Google Maps Android, qui ne doit pas être versionnée.
//
// La clé est lue depuis GOOGLE_MAPS_API_KEY_ANDROID :
//   - builds EAS  : `eas secret:create --name GOOGLE_MAPS_API_KEY_ANDROID --value <clé>`
//   - build local : exporter la variable avant `expo prebuild` / `expo run:android`
//
// Sans la variable, la config reste valide et le build réussit — seules les
// cartes s'affichent en gris. Voir docs/publication-google-play.md.
module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn(
      '[app.config] GOOGLE_MAPS_API_KEY_ANDROID absente — les cartes Android seront vides.'
    );
    // Laisser l'entrée vide plutôt qu'un faux littéral : une clé factice fait
    // échouer les appels Maps silencieusement et masque le vrai problème.
    delete config.android?.config?.googleMaps;
    return config;
  }

  config.android.config.googleMaps.apiKey = apiKey;
  return config;
};
