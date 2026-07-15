import { PrismaClient } from "@prisma/client";

// Single shared PrismaClient for the whole process. Caching it on globalThis in
// EVERY environment (not just dev) guarantees we never start a second query
// engine — each PrismaClient spins up its own engine + connection-pool threads,
// which is what exhausts cPanel's process/thread limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
