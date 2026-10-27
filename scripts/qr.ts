// Usage: npm run qr [-- http://192.168.1.75:3001]
// Prints a QR code for the app address and saves it as ocima-qr.png.
import { resolve } from "node:path";
import QRCode from "qrcode";
import { lanUrls } from "../backend/lib/network.js";

const port = Number(process.env.PORT ?? 3001);
const url = process.argv[2] ?? lanUrls(port)[0];

if (!url) {
  console.error("Nessuna rete locale trovata. Passa l'indirizzo: npm run qr -- http://192.168.1.75:3001");
  process.exit(1);
}

const file = resolve("ocima-qr.png");
await QRCode.toFile(file, url, { width: 640, margin: 2 });
console.log(await QRCode.toString(url, { type: "terminal", small: true }));
console.log(`Indirizzo: ${url}`);
console.log(`Immagine salvata in: ${file}`);
