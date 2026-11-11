"use client";

import { ListTodoIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: "To konto Google nie ma dostępu do aplikacji.",
};

export function LoginForm() {
  const error = useSearchParams().get("error");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signIn = async () => {
    setPending(true);
    setFailed(false);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login",
    });
    if (result.error) {
      setPending(false);
      setFailed(true);
    }
  };

  const message = failed
    ? "Nie udało się rozpocząć logowania. Spróbuj ponownie."
    : error
      ? (ERROR_MESSAGES[error] ?? "Logowanie nie powiodło się.")
      : null;

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white">
        <ListTodoIcon className="size-7" />
      </span>
      <h1 className="text-2xl font-semibold">Żaneta</h1>
      <Button size="lg" className="w-full" onClick={signIn} disabled={pending}>
        {pending ? "Przekierowuję…" : "Zaloguj się przez Google"}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
