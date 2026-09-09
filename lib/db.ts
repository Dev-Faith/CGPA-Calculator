import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma Client instances in development (due to hot reloading)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Add the Neon PostgreSQL connection string to the deployment environment.",
    );
  }
  if (!url.startsWith("postgres")) return url;

  const parsed = new URL(url);
  parsed.searchParams.set("connection_limit", "3");
  parsed.searchParams.set("pool_timeout", "20");
  parsed.searchParams.set("connect_timeout", "15");
  return parsed.toString();
}

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
