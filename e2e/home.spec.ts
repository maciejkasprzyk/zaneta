import { expect, test } from "@playwright/test";

test("home page shows the default list", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Moje zadania" }),
  ).toBeVisible();
});
