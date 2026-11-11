import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { isEmailAllowed } from "./allowed-emails";

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        // Always let the user pick the account, so a wrong one can be fixed.
        prompt: "select_account",
      },
    },
    user: {
      // Nobody can create an account: only addresses from ALLOWED_EMAILS
      // get in, checked on account creation and on every Google sign-in.
      validateUserInfo: ({ user }) => {
        if (!isEmailAllowed(user.email as string | undefined)) {
          return {
            error: "not_allowed",
            errorDescription: "To konto nie ma dostępu do aplikacji.",
          };
        }
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 60, // 60 days
      updateAge: 60 * 60 * 24, // refreshed once a day while in use
    },
    plugins: [nextCookies()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

/** Better Auth instance. Only call it when the database is configured. */
export function getAuth() {
  auth ??= createAuth();
  return auth;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/**
 * The signed-in user, or null. A session whose e-mail was removed from
 * ALLOWED_EMAILS no longer counts.
 */
export async function getCurrentUser(
  requestHeaders?: Headers,
): Promise<CurrentUser | null> {
  const session = await getAuth().api.getSession({
    headers: requestHeaders ?? (await headers()),
  });
  if (!session || !isEmailAllowed(session.user.email)) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}
