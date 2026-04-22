import { test, expect } from "@playwright/test";

test.describe("Autenticação", () => {
  test("redireciona /dashboard para /login quando não autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redireciona /clientes para /login quando não autenticado", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redireciona /admin para /login quando não autenticado", async ({ page }) => {
    await page.goto("/admin/jurisdicoes");
    await expect(page).toHaveURL(/\/login/);
  });

  test("página de login renderiza formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test("login com credenciais inválidas exibe erro", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/email/i).fill("invalido@teste.com");
    await page.getByLabel(/senha/i).fill("senhaerrada123");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByText(/credenciais|inválid|erro/i)).toBeVisible({ timeout: 8_000 });
  });
});
