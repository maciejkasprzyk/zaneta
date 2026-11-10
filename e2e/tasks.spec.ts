import { expect, type Locator, type Page, test } from "@playwright/test";

async function addTask(
  page: Page,
  title: string,
  opts: {
    date?: string;
    effort?: string;
    unit?: "min" | "h";
    repeat?: "day" | "week";
    scope?: Locator;
  } = {},
) {
  await (opts.scope ?? page)
    .getByRole("button", { name: "Dodaj zadanie" })
    .click();
  await page.getByLabel("Tytuł").fill(title);
  if (opts.date) await page.getByLabel("Termin").fill(opts.date);
  if (opts.effort) await page.getByLabel("Nakład pracy").fill(opts.effort);
  if (opts.unit) {
    await page.getByLabel("Jednostka nakładu pracy").selectOption(opts.unit);
  }
  if (opts.repeat)
    await page.getByLabel("Powtarzanie").selectOption(opts.repeat);
  await page.getByRole("button", { name: "Dodaj", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

const taskTitles = (page: Page | Locator) =>
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
  const column = page.getByRole("region", { name: "Zakupy" });
  await expect(column).toBeVisible();
  await addTask(page, "Chleb", { scope: column });
  await column.getByRole("link", { name: "Drukuj listę" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Zakupy" }),
  ).toBeVisible();
  await expect(page.getByTestId("print-task")).toHaveText(/Chleb/);
});

test("desktop shows all lists side by side and can hide one", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nowa lista" }).click();
  await page.getByLabel("Nazwa listy").fill("Zakupy");
  await page.getByRole("button", { name: "Utwórz" }).click();

  const mine = page.getByRole("region", { name: "Moje zadania" });
  const shopping = page.getByRole("region", { name: "Zakupy" });
  await expect(mine).toBeVisible();
  await expect(shopping).toBeVisible();
  const [a, b] = await Promise.all([
    mine.boundingBox(),
    shopping.boundingBox(),
  ]);
  expect(b?.x).toBeGreaterThan((a?.x ?? 0) + (a?.width ?? 0));

  await page
    .getByRole("checkbox", { name: "Pokaż listę Moje zadania" })
    .uncheck();
  await expect(mine).toBeHidden();
  await expect(shopping).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Moje zadania" })).toBeHidden();
});

test("starred tasks can be reordered by dragging", async ({ page }) => {
  await page.goto("/");
  for (const title of ["Pierwsze", "Drugie", "Trzecie"]) {
    await addTask(page, title);
    await page
      .getByRole("button", { name: `Oznacz gwiazdką: ${title}` })
      .click();
  }
  await page.getByRole("button", { name: /Oznaczone gwiazdką/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Oznaczone gwiazdką" }),
  ).toBeVisible();
  // Most recently starred first.
  expect(await taskTitles(page)).toEqual(["Trzecie", "Drugie", "Pierwsze"]);

  // Keyboard drag: move "Pierwsze" to the top.
  await page
    .getByRole("button", { name: "Przeciągnij zadanie Pierwsze" })
    .focus();
  // dnd-kit measures positions between key presses, so give it a moment.
  for (const key of ["Space", "ArrowUp", "ArrowUp", "Space"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
  }
  await expect
    .poll(() => taskTitles(page))
    .toEqual(["Pierwsze", "Trzecie", "Drugie"]);

  await page.reload();
  expect(await taskTitles(page)).toEqual(["Pierwsze", "Trzecie", "Drugie"]);
});

test("completing a repeating task schedules the next one", async ({ page }) => {
  await page.goto("/");
  await addTask(page, "Podlać kwiaty", { date: "2099-05-01", repeat: "week" });
  await expect(page.getByText("Co tydzień")).toBeVisible();

  await page
    .getByRole("button", { name: "Oznacz jako ukończone: Podlać kwiaty" })
    .click();
  // The next occurrence is a week later and still repeats.
  const item = page
    .getByTestId("task-item")
    .filter({ hasText: "Podlać kwiaty" });
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("8 maj 2099");
  await expect(item).toContainText("Co tydzień");
  await expect(
    page.getByRole("button", { name: "Ukończone (1)" }),
  ).toBeVisible();
});
