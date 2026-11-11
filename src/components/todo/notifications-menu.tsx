"use client";

import { BellIcon, BellOffIcon, SendIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  disablePush,
  enablePush,
  getPushStatus,
  type PushStatus,
  sendTestPush,
} from "@/lib/push/client";

const STATUS_TEXT: Record<PushStatus, string> = {
  unsupported: "Ta przeglądarka nie obsługuje powiadomień.",
  "not-configured": "Powiadomienia nie są skonfigurowane na serwerze.",
  denied:
    "Powiadomienia są zablokowane. Zezwól na nie w ustawieniach strony w przeglądarce.",
  off: "Powiadomienia są wyłączone na tym urządzeniu.",
  on: "Powiadomienia są włączone na tym urządzeniu.",
};

/** Turns push notifications for reminders on/off on this device. */
export function NotificationsMenu() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPushStatus().then(setStatus, () => setStatus("unsupported"));
  }, []);

  const run = async (action: () => Promise<PushStatus>) => {
    setMessage(null);
    try {
      setStatus(await action());
    } catch (error) {
      console.error(error);
      setMessage("Coś poszło nie tak. Spróbuj ponownie.");
    }
  };

  const on = status === "on";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Powiadomienia"
            title="Powiadomienia"
          />
        }
      >
        {on ? <BellIcon /> : <BellOffIcon />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal whitespace-normal">
            {message ?? (status ? STATUS_TEXT[status] : "Sprawdzam…")}
          </DropdownMenuLabel>
          {status === "off" && (
            <DropdownMenuItem onClick={() => run(enablePush)}>
              <BellIcon />
              Włącz powiadomienia
            </DropdownMenuItem>
          )}
          {on && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  run(async () => {
                    await sendTestPush();
                    return "on";
                  })
                }
              >
                <SendIcon />
                Wyślij powiadomienie testowe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run(disablePush)}>
                <BellOffIcon />
                Wyłącz na tym urządzeniu
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
