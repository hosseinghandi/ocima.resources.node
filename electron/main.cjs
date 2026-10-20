const { app, BrowserWindow } = require("electron");
const path = require("node:path");

let apiServer;

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: "#f5f7f5",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (app.isPackaged) {
    process.env.OCIMA_DATA_DIR ??= path.join(app.getPath("userData"), "data");
    const serverPath = path.join(app.getAppPath(), "dist-server", "server.cjs");
    const { startServer } = require(serverPath);
    const result = await startServer({
      port: 0,
      staticDirectory: path.join(app.getAppPath(), "dist"),
    });
    apiServer = result.server;
    await window.loadURL(`http://127.0.0.1:${result.port}`);
  } else {
    await window.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(createWindow).catch((error) => {
  console.error("Impossibile avviare Ocima Ore:", error);
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      console.error("Impossibile riaprire Ocima Ore:", error);
      app.quit();
    });
  }
});

app.on("before-quit", () => {
  apiServer?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
