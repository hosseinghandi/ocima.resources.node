import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import { openDatabases, type Databases } from "./db/db.js";
import { RequestError } from "./lib/errors.js";
import { lanUrls } from "./lib/network.js";
import { resolveDataDirectory } from "./paths/paths.js";
import { createApiRouter } from "./routes/api.js";

function createApp(
  databases: Databases,
  staticDirectory?: string,
): express.Express {
  const app = express();
  app.use(express.json({ limit: "20mb" }));
  app.use("/api", createApiRouter(databases));

  if (staticDirectory) {
    const directory = resolve(staticDirectory);
    app.use(express.static(directory));
    app.get("/{*path}", (_request, response, next) => {
      response.sendFile(join(directory, "index.html"), (error) => {
        if (error) next(error);
      });
    });
  }

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      next: express.NextFunction,
    ) => {
      if (response.headersSent) {
        next(error);
        return;
      }
      if (error instanceof RequestError) {
        response.status(error.status).json({ error: error.message });
        return;
      }
      if (error instanceof SyntaxError && "body" in error) {
        response.status(400).json({ error: "Il JSON inviato non è valido." });
        return;
      }
      console.error("Errore del server:", error);
      response.status(500).json({ error: "Errore interno del server." });
    },
  );
  return app;
}

export async function startServer(
  options: {
    port?: number;
    host?: string;
    dataDirectory?: string;
    staticDirectory?: string;
  } = {},
): Promise<{ server: Server; port: number }> {
  const databases = openDatabases(resolveDataDirectory(options.dataDirectory));
  const server = createServer(createApp(databases, options.staticDirectory));
  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(
        options.port ?? Number(process.env.PORT ?? 3001),
        options.host ?? "127.0.0.1",
        () => {
          server.off("error", rejectListen);
          resolveListen();
        },
      );
    });
  } catch (error) {
    databases.close();
    throw error;
  }
  server.once("close", databases.close);
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Impossibile determinare la porta del server.");
  }
  return { server, port: address.port };
}

// Run directly (tsx / node); Electron imports startServer instead.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  // Standalone mode serves the built app (dist) and is reachable from the local network.
  const staticDirectory = resolve(process.env.OCIMA_STATIC_DIR ?? "dist");
  startServer({
    host: process.env.HOST ?? "0.0.0.0",
    staticDirectory: existsSync(staticDirectory) ? staticDirectory : undefined,
  })
    .then(({ server, port }) => {
      console.log(`Ocima Ore in ascolto su http://127.0.0.1:${port}`);
      for (const url of lanUrls(port)) console.log(`  Dalla rete locale: ${url}`);
      const stop = () => server.close();
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    })
    .catch((error: unknown) => {
      console.error("Impossibile avviare il server:", error);
      process.exitCode = 1;
    });
}
