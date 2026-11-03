#!/usr/bin/env bash
# Distanza giornaliera -> Android e iPhone, tramite Expo Go (gratis, nessun Mac richiesto)   (la prima volta: chmod +x start.sh)
#
# ./start.sh            modalita LAN (predefinita): telefono e computer sulla STESSA Wi-Fi
# ./start.sh tunnel     funziona anche su reti diverse (piu lento, serve internet)
# ./start.sh help       mostra questo testo
#
# Installa l'app "Expo Go" dal Play Store (Android) o dall'App Store (iPhone).
# Su iPhone, Expo Go richiede un account Expo gratuito (https://expo.dev/signup):
# accedi qui sotto con lo stesso account anche dentro l'app Expo Go.
# Su Android NON serve nessun account.
set -euo pipefail
cd "$(dirname "$0")"

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; }

MODE=""
for arg in "$@"; do
  case "$arg" in
    help|-h|--help) usage; exit 0 ;;
    tunnel|lan) MODE="$arg" ;;
    *) echo "[ERROR] Opzione sconosciuta \"$arg\". Usa: tunnel, lan o help." >&2; exit 1 ;;
  esac
done

command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js non trovato. Installa Node 20.19+ (LTS) da https://nodejs.org e riprova." >&2; exit 1; }
node scripts/check-node.js

if [ ! -d node_modules/expo ]; then
  echo "[1/2] Installazione delle dipendenze, la prima volta richiede qualche minuto..."
  npm install || { echo "[ERROR] npm install fallito. Controlla la connessione a internet e riprova." >&2; exit 1; }
fi

# Expo Go su iPhone richiede lo stesso account Expo nel terminale e nell'app (Android non ne ha bisogno)
# (invocato tramite "node node_modules/expo/bin/cli" invece di "npx expo": su Windows gli shim .cmd
#  generati in node_modules/.bin si rompono se il percorso del progetto contiene caratteri come "^")
if ! node node_modules/expo/bin/cli whoami >/dev/null 2>&1; then
  cat <<'MSG'

================================================================
 Se userai un iPhone: Expo Go richiede un account Expo.
 Non ne hai uno? Creane uno gratis su https://expo.dev/signup
 Su Android puoi ignorare questo passaggio e premere Invio.
================================================================

MSG
  node node_modules/expo/bin/cli login || true
fi

PORT="$(node scripts/free-port.js 8081)"

if [ "${MODE:-}" = "tunnel" ]; then
  if [ ! -d node_modules/@expo/ngrok ]; then
    echo "[2/2] Installazione del tunnel (@expo/ngrok)..."
    npm install --save-dev @expo/ngrok
  fi
  cat <<'MSG'

================================================================
 Modalita TUNNEL: funziona su qualunque rete, ma puo richiedere
 fino a un minuto per connettersi (attendi "Tunnel ready"). Se
 resta bloccato, premi Ctrl+C e usa la modalita LAN: ./start.sh
================================================================

MSG
  exec node node_modules/expo/bin/cli start --tunnel --clear --port "$PORT"
fi

# Modalita LAN: l'IP dell'interfaccia che raggiunge davvero il router (ignora docker/VPN/adattatori virtuali)
LANIP=""
if command -v ip >/dev/null 2>&1; then
  LANIP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
elif command -v ipconfig >/dev/null 2>&1; then
  LANIP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
fi
[ -n "$LANIP" ] && export REACT_NATIVE_PACKAGER_HOSTNAME="$LANIP"

echo
echo "================================================================"
echo " 1. Il telefono e il computer devono essere sulla STESSA rete Wi-Fi."
echo " 2. Installa \"Expo Go\" dal Play Store (Android) o App Store (iPhone)."
echo "    Su iPhone accedi con lo stesso account Expo usato qui sopra."
echo " 3. Inquadra il QR code qui sotto:"
echo "      - Android: apri Expo Go e scansiona il QR dall'app."
echo "      - iPhone:  apri l'app Fotocamera e inquadra il QR."
[ -n "$LANIP" ] && echo "    Se la scansione non funziona: apri Expo Go e digita  exp://$LANIP:$PORT"
echo " 4. Tieni questo terminale aperto mentre usi l'app. Ctrl+C per fermare."
echo
echo " Non si carica? Controlla che il firewall permetta la porta $PORT, oppure prova:"
echo "     ./start.sh tunnel"
echo "================================================================"
echo
exec node node_modules/expo/bin/cli start --lan --clear --port "$PORT"
