import { expect, test } from "@playwright/test";

test("home page shows the inbox", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
});
