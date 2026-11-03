/* Avvia la CLI di Expo nello stesso processo Node invece che tramite lo shim "expo"/"npx expo":
   su Windows gli shim .cmd generati da npm in node_modules\.bin si rompono se il percorso del
   progetto contiene certi caratteri speciali (es. "^"). Imposta anche EXPO_NO_DEV_MENU=1 cosi'
   scuotere il telefono durante i test con Expo Go non apre piu' il menu sviluppatore. */
if (process.env.EXPO_NO_DEV_MENU === undefined) {
  process.env.EXPO_NO_DEV_MENU = '1';
}

require('../node_modules/expo/bin/cli');
