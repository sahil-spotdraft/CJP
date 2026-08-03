import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string) {
  return EMAIL_RE.test(email.trim());
}

export async function listCsOwners() {
  return prisma.csOwner.findMany({ orderBy: { name: "asc" } });
}

export async function createCsOwner(params: { name: string; email: string }) {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!isValidEmail(email)) throw new Error("Email must be a valid email address");

  const existing = await prisma.csOwner.findUnique({ where: { email } });
  if (existing) throw new Error("A CS owner with this email already exists");

  return prisma.csOwner.create({ data: { name, email } });
}
