import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";
import { getStorageMode } from "@/lib/storage-mode";

export const metadata: Metadata = { title: "Logowanie – Żaneta" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense>
        <LoginContent />
      </Suspense>
    </main>
  );
}

async function LoginContent() {
  // Without a database there is nothing to sign in to.
  if (getStorageMode() !== "database" || (await getCurrentUser())) {
    redirect("/");
  }
  return <LoginForm />;
}
