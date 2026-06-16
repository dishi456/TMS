import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

// Allocate a unique public 6-digit reference code (100000–999999) to a property.
// Retries on the rare collision.
export async function generatePropertyRef(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const ref = String(randomInt(100000, 1000000));
    const exists = await prisma.property.findUnique({ where: { ref }, select: { id: true } });
    if (!exists) return ref;
  }
  // Extremely unlikely fallback.
  return String(Date.now()).slice(-6);
}
