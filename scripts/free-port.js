/* Prints the first free TCP port starting at argv[2] (default 8081). Expo asks an interactive question when its port is busy,
   which would freeze the launcher scripts, so they pick a free port themselves. Usage: node scripts/free-port.js [start] */
const net = require('net');

const start = Number(process.argv[2] || 8081);

const accepts = (port, host) =>
  new Promise((resolve) => {
    const c = net.connect({ port, host });
    const done = (v) => {
      c.destroy();
      resolve(v);
    };
    c.setTimeout(400, () => done(false));
    c.once('connect', () => done(true));
    c.once('error', () => done(false));
  });

const canListen = (port) =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port);
  });

async function isFree(port) {
  if ((await accepts(port, '127.0.0.1')) || (await accepts(port, '::1'))) return false; // something is already serving it
  return canListen(port);
}

(async () => {
  for (let p = start; p < start + 60; p++) {
    if (await isFree(p)) {
      console.log(p);
      return;
    }
  }
  console.error('No free port found');
  process.exit(1);
})();
