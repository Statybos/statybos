"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, verifyCredentials } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!verifyCredentials(email, password)) {
    redirect("/admin/login?klaida=1");
  }
  await createSession(email);
  redirect("/admin/kandidatai");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
