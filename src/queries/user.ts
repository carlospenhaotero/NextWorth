import "server-only";
import { prisma } from "@/server/db";

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      baseCurrency: true,
      createdAt: true,
    },
  });
}
