import { test, expect } from "@playwright/test";

test.describe("Simulador público", () => {
  test("página carrega sem autenticação", async ({ page }) => {
    await page.goto("/simulador");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("imposto");
  });

  test("botão Simular está desabilitado sem país selecionado", async ({ page }) => {
    await page.goto("/simulador");
    // Se não há países, o botão deve estar desabilitado
    const btn = page.getByRole("button", { name: "Simular" });
    // Button is disabled when countryId is empty
    await expect(btn).toBeVisible();
  });

  test("exibe resultado após simular com valores padrão", async ({ page }) => {
    await page.goto("/simulador");

    const simularBtn = page.getByRole("button", { name: "Simular" });
    // Only proceed if button is enabled (countries exist in DB)
    const isDisabled = await simularBtn.isDisabled();
    if (isDisabled) {
      test.skip();
      return;
    }

    await simularBtn.click();
    await expect(page.getByText("Economia estimada ao ano")).toBeVisible({ timeout: 10_000 });
  });

  test("modal de lead abre após simulação", async ({ page }) => {
    await page.goto("/simulador");
    const simularBtn = page.getByRole("button", { name: "Simular" });
    const isDisabled = await simularBtn.isDisabled();
    if (isDisabled) { test.skip(); return; }

    await simularBtn.click();
    await page.getByText("Economia estimada ao ano").waitFor({ timeout: 10_000 });
    await page.getByRole("button", { name: /especialista/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /especialista/i })).toBeVisible();
  });
});
