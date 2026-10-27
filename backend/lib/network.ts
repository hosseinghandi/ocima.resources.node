import { networkInterfaces } from "node:os";

/** IPv4 addresses of this machine that other devices on the same network can reach. */
export function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((list) => list ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .sort((a, b) => Number(isPrivateLan(b)) - Number(isPrivateLan(a)));
}

function isPrivateLan(address: string): boolean {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address);
}

export function lanUrls(port: number): string[] {
  return lanAddresses().map((address) => `http://${address}:${port}`);
}
