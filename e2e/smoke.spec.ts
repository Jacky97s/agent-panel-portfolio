import { expect, test } from '@playwright/test';

test('mock peer updates the preview from a selected section and a question card', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('作品集產生器')).toBeVisible();
  const preview = page.frameLocator('iframe[title="作品集預覽"]');
  await expect(preview.getByRole('heading', { name: 'Jacky Tan' })).toBeVisible();
  await expect(page.getByText('額外 API 費用 $0')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '匯出靜態 HTML' })).toHaveCSS('background-color', 'rgb(244, 239, 230)');

  await page.getByRole('button', { name: '關於', exact: true }).click();
  await page.locator('.ap-toggle').click();
  await expect(page.getByRole('complementary', { name: 'Agent panel' })).toBeVisible();

  await page.getByLabel('Message').fill('這段寫得更像 SDET 主管');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: '允許寫入' }).click();
  await expect(preview.getByText('我帶 SDET 團隊看整條交付鏈')).toBeVisible();
  await expect(preview.getByText('全端工程師')).toBeVisible();

  await page.getByLabel('Message').fill('請先詢問語氣、語言，以及要放上首頁的專案');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('先確認作品集的語氣、語言，以及要放上首頁的專案。')).toBeVisible();
  await page.getByRole('radio', { name: '親切敘事' }).check();
  await page.getByRole('radio', { name: 'English' }).check();
  await page.getByRole('radio', { name: /ShutUpBot/ }).check();
  await page.getByRole('button', { name: 'Send answers' }).click();
  await page.getByRole('button', { name: '允許寫入' }).click();
  await expect(preview.getByRole('heading', { name: 'ShutUpBot' })).toBeVisible();
  await expect(preview.getByText('small on purpose')).toBeVisible();
});
