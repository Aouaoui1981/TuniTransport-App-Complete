import 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';
import './src/services/locationTask';

// ──────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC TEMPORAIRE — à retirer une fois la cause établie.
//
// Sur Android, le clavier se referme de lui-même une seconde après avoir pris
// le focus, sur TOUS les champs de l'app : écrans d'authentification
// (ScrollView + KeyboardAvoidingView) comme champ de recherche des demandes
// (FlatList, aucune ombre au focus). Le defaut est donc a la racine, pas dans
// une mise en page particuliere — trois correctifs cibles sur les ecrans
// (edges, softwareKeyboardLayoutMode, elevation au focus) n'y ont rien change.
//
// `react-native-screens` gere les conteneurs de vues natives de chaque ecran de
// navigation : c'est le seul composant a la racine capable de detacher puis
// rattacher la vue qui detient le focus. Le desactiver n'apporte pas de
// correctif — il tranche une question : si le clavier tient, la cause est la ;
// s'il tombe encore, elle est ailleurs et on cesse de chercher de ce cote.
//
// Contrepartie assumee le temps du test : les transitions de navigation
// repassent en JS, donc un peu moins fluides. Aucune fonctionnalite perdue.
//
// L'appel est requis dynamiquement et reserve au natif : sur le web la
// bibliotheque n'a pas lieu d'etre, et l'importer en statique casse l'export
// web (build Cloudflare en echec sur le premier essai).
// ──────────────────────────────────────────────────────────────────────────
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-screens').enableScreens(false);
}

registerRootComponent(App);
