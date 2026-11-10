import { expect, type Page, test } from "@playwright/test";

async function addTask(
  page: Page,
  title: string,
  opts: { date?: string; effort?: string; unit?: "min" | "h" } = {},
) {
  await page.getByRole("button", { name: "Dodaj zadanie" }).click();
  await page.getByLabel("Tytuł").fill(title);
  if (opts.date) await page.getByLabel("Termin").fill(opts.date);
  if (opts.effort) await page.getByLabel("Nakład pracy").fill(opts.effort);
  if (opts.unit) {
    await page.getByLabel("Jednostka nakładu pracy").selectOption(opts.unit);
  }
  await page.getByRole("button", { name: "Dodaj", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

const taskTitles = (page: Page) =>
  page.getByTestId("task-item").locator("span.leading-6").allTextContents();

test("tasks persist, can be starred, sorted by date and printed", async ({
  page,
}) => {
  await page.goto("/");
  await addTask(page, "Bez daty");
  await addTask(page, "Później", {
    date: "2099-05-02",
    effort: "2",
    unit: "h",
  });
  await addTask(page, "Wcześniej", { date: "2099-05-01", effort: "45" });

  // New tasks are added on top (custom order).
  expect(await taskTitles(page)).toEqual(["Wcześniej", "Później", "Bez daty"]);
  await expect(page.getByText("łącznie 2 h 45 min")).toBeVisible();

  // Data survives a reload.
  await page.reload();
  expect(await taskTitles(page)).toEqual(["Wcześniej", "Później", "Bez daty"]);

  // Sort by date.
  await page.getByRole("button", { name: "Opcje listy" }).click();
  await page.getByRole("menuitemradio", { name: "Data" }).click();
  expect(await taskTitles(page)).toEqual(["Wcześniej", "Później", "Bez daty"]);
  await expect(
    page.getByRole("heading", { name: "Bez terminu" }),
  ).toBeVisible();

  // Star one task and open the starred view.
  await page.getByRole("button", { name: "Oznacz gwiazdką: Później" }).click();
  await page.getByRole("button", { name: /Oznaczone gwiazdką/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Oznaczone gwiazdką" }),
  ).toBeVisible();
  expect(await taskTitles(page)).toEqual(["Później"]);

  // Print the starred tasks.
  await page.getByRole("link", { name: "Drukuj zadania z gwiazdką" }).click();
  await expect(page).toHaveURL(/\/print\?view=starred/);
  await expect(page.getByTestId("print-task")).toHaveCount(1);
  await expect(page.getByTestId("print-task")).toContainText("Nakład: 2 h");
});

test("completing a task moves it to the completed section", async ({
  page,
}) => {
  await page.goto("/");
  await addTask(page, "Do zrobienia");
  await page
    .getByRole("button", { name: "Oznacz jako ukończone: Do zrobienia" })
    .click();
  await expect(
    page.getByText("Brak zadań. Dodaj pierwsze zadanie."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ukończone (1)" }).click();
  await expect(page.getByText("Do zrobienia")).toBeVisible();
});

test("lists can be created and printed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nowa lista" }).click();
  await page.getByLabel("Nazwa listy").fill("Zakupy");
  await page.getByRole("button", { name: "Utwórz" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Zakupy" }),
  ).toBeVisible();
  await addTask(page, "Chleb");
  await page.getByRole("link", { name: "Drukuj listę" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Zakupy" }),
  ).toBeVisible();
  await expect(page.getByTestId("print-task")).toHaveText(/Chleb/);
});
