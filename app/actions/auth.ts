"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const envHash = process.env.ADMIN_PASSWORD_HASH?.replace(/\\\$/g, "$").trim();

  if (!envUsername || !envHash) {
    return { error: "Server misconfiguration: admin credentials not set." };
  }

  if (username !== envUsername) {
    return { error: "Invalid username or password." };
  }

  const passwordMatch = await bcrypt.compare(password, envHash);
  if (!passwordMatch) {
    return { error: "Invalid username or password." };
  }

  await createSession(username);
  redirect("/portal");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
