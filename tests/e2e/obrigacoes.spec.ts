import { test, expect } from "@playwright/test";

// These tests require an authenticated session.
// Set PLAYWRIGHT_COOKIE or use storageState in CI to inject auth cookies.
// When running locally without auth, pages redirect to /login — tests are skipped gracefully.

async function requireAuth(page: import("@playwright/test").Page) {
  await page.goto("/obrigacoes");
  if (page.url().includes("/login")) {
    test.skip();
  }
}

test.describe("Página de Obrigações (autenticado)", () => {
  test("renderiza tabela de obrigações", async ({ page }) => {
    await requireAuth(page);
    await expect(page.getByRole("heading", { name: "Obrigações" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("filtro de busca por texto mantém query na URL", async ({ page }) => {
    await requireAuth(page);
    await page.getByPlaceholder(/buscar/i).fill("teste");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/q=teste/);
  });

  test("filtro de status mantém valor selecionado", async ({ page }) => {
    await requireAuth(page);
    // Navigate directly with status param
    await page.goto("/obrigacoes?status=PENDING");
    const trigger = page.locator("[data-slot='select-trigger']");
    await expect(trigger).toContainText(/pendente/i);
  });
});
