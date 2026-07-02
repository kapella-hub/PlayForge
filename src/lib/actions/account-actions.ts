"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) {
    throw new Error("This account has no password set");
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw new Error("Current password is incorrect");
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { password: hash },
  });
}
