import { expect, type Page, test } from "@playwright/test";

// Phone layout: one list at a time.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const viewTitle = (page: Page) => page.getByRole("heading", { level: 1 });

async function swipe(page: Page, dx: number) {
  await page.locator("main").evaluate((main, dx) => {
    const rect = main.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + 200;
    const touch = (clientX: number) =>
      new Touch({ identifier: 1, target: main, clientX, clientY: y });
    main.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        touches: [touch(x)],
        changedTouches: [touch(x)],
      }),
    );
    main.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        touches: [],
        changedTouches: [touch(x + dx)],
      }),
    );
  }, dx);
}

test("demo data button resets to sample data after confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(viewTitle(page)).toHaveText("Inbox");
  await page.getByRole("button", { name: "Dodaj zadanie" }).click();
  await page.getByLabel("Tytuł").fill("Do usunięcia");
  await page.getByRole("button", { name: "Dodaj", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "Dane testowe" }).click();
  await page.getByRole("button", { name: "Anuluj" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Do usunięcia")).toBeVisible();

  await page.getByRole("button", { name: "Dane testowe" }).click();
  await page.getByRole("button", { name: "Wczytaj dane testowe" }).click();
  await expect(viewTitle(page)).toHaveText("Inbox");
  await expect(page.getByText("Do usunięcia")).toHaveCount(0);
  await expect(page.getByTestId("task-item").first()).toBeVisible();
});

test("swiping switches between lists", async ({ page }) => {
  await page.goto("/");
  await expect(viewTitle(page)).toHaveText("Inbox");

  await swipe(page, -150);
  await expect(viewTitle(page)).toHaveText("Zadania");
  await swipe(page, 150);
  await expect(viewTitle(page)).toHaveText("Inbox");
  await swipe(page, 150);
  await expect(viewTitle(page)).toHaveText("Oznaczone gwiazdką");
  // A short movement is not a swipe.
  await swipe(page, -20);
  await expect(viewTitle(page)).toHaveText("Oznaczone gwiazdką");
});

test("list order can be changed on a phone", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kolejność list" }).click();
  await page.getByRole("button", { name: "Przenieś niżej: Inbox" }).click();
  await page.getByRole("button", { name: "Gotowe" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Swiping follows the new order: starred, Zadania, Inbox, ...
  await page.getByRole("button", { name: /^Zadania/ }).click();
  await swipe(page, -150);
  await expect(viewTitle(page)).toHaveText("Inbox");
});
