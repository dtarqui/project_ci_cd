// Arranca un PostgreSQL real para las pruebas de integracion
// (__tests__/postgres.integration.test.js) y lo detiene cuando el proceso padre
// cierra la entrada estandar. Va en un proceso aparte porque embedded-postgres es
// un modulo ES y Jest ejecuta las pruebas como CommonJS.
//
// Uso: node embeddedPostgres.mjs <directorio de datos> <puerto>
import EmbeddedPostgres from "embedded-postgres";

const [, , databaseDir, port] = process.argv;

const pg = new EmbeddedPostgres({
  databaseDir,
  port: Number(port),
  user: "postgres",
  password: "postgres",
  persistent: false,
  onLog: () => {},
  onError: (message) => process.stderr.write(`${message}\n`),
});

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};

process.stdin.on("end", stop);
process.stdin.on("close", stop);
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
process.stdin.resume();

await pg.initialise();
await pg.start();
await pg.createDatabase("ventas_test");
process.stdout.write("READY\n");
