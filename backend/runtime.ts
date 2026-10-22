import { mkdirSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join, resolve } from "node:path";
import { openDatabases } from "./database/index.js";
import { createApp } from "./app.js";

export async function startServer(
  options: {
    port?: number;
    host?: string;
    dataDirectory?: string;
    staticDirectory?: string;
  } = {},
): Promise<{ server: Server; port: number }> {
  const dataDirectory = resolve(
    options.dataDirectory ??
      process.env.OCIMA_DATA_DIR ??
      join(process.cwd(), "data"),
  );
  mkdirSync(dataDirectory, { recursive: true });
  const databases = openDatabases(dataDirectory);
  const app = createApp(databases, options.staticDirectory);

  const port = options.port ?? Number(process.env.PORT ?? 3001);
  const host = options.host ?? "127.0.0.1";
  const server = createServer(app);
  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(port, host, () => {
        server.off("error", rejectListen);
        resolveListen();
      });
    });
  } catch (error) {
    databases.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    databases.close();
    throw new Error("Impossibile determinare la porta del server.");
  }

  server.once("close", databases.close);
  return { server, port: address.port };
}
