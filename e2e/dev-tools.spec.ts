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

test("demo data button resets to sample lists after confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nowa lista" }).click();
  await page.getByLabel("Nazwa listy").fill("Do usunięcia");
  await page.getByRole("button", { name: "Utwórz" }).click();

  await page.getByRole("button", { name: "Dane testowe" }).click();
  await page.getByRole("button", { name: "Anuluj" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(viewTitle(page)).toHaveText("Do usunięcia");

  await page.getByRole("button", { name: "Dane testowe" }).click();
  await page.getByRole("button", { name: "Wczytaj dane testowe" }).click();
  await expect(viewTitle(page)).toHaveText("Moje zadania");
  await expect(page.getByRole("button", { name: /Do usunięcia/ })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /^Praca/ })).toBeVisible();
  await expect(page.getByTestId("task-item").first()).toBeVisible();
});

test("swiping switches between lists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dane testowe" }).click();
  await page.getByRole("button", { name: "Wczytaj dane testowe" }).click();
  await expect(viewTitle(page)).toHaveText("Moje zadania");

  await swipe(page, -150);
  await expect(viewTitle(page)).toHaveText("Praca");
  await swipe(page, 150);
  await expect(viewTitle(page)).toHaveText("Moje zadania");
  await swipe(page, 150);
  await expect(viewTitle(page)).toHaveText("Oznaczone gwiazdką");
  // A short movement is not a swipe.
  await swipe(page, -20);
  await expect(viewTitle(page)).toHaveText("Oznaczone gwiazdką");
});
