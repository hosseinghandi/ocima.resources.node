import { startServer } from "./runtime.js";

void startServer()
  .then(({ server, port }) => {
    console.log(`Ocima Ore API in ascolto su http://127.0.0.1:${port}`);
    const stop = () => server.close();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  })
  .catch((error: unknown) => {
    console.error("Impossibile avviare il server:", error);
    process.exitCode = 1;
  });
