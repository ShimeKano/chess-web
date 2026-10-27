import { test, expect } from 'playwright/test';

test('Stockfish loads in Chromium and finds a move from the initial position', async ({ page }) => {
  const pageErrors = [];
  const failedEngineRequests = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    if (/stockfish|\.wasm/i.test(request.url())) {
      failedEngineRequests.push(request.url() + ': ' + (request.failure()?.errorText || 'request failed'));
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Chess Web/i })).toBeVisible();
  await page.getByRole('button', { name: /Phân tích vị trí/ }).first().click();

  const result = page.locator('.suggestionOutput');
  await expect(result).toContainText(/\([a-h][1-8][a-h][1-8][qrbn]?\)/, { timeout: 45000 });
  await expect(page.locator('.error')).toHaveCount(0);
  expect(pageErrors, 'browser JavaScript errors').toEqual([]);
  expect(failedEngineRequests, 'failed Stockfish/WASM requests').toEqual([]);
});
