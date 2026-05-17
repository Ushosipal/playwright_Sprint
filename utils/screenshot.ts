import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-results', 'screenshots');
export async function captureScreenshot(
  page: Page,
  testInfo: TestInfo,
  label: string = 'final'
): Promise<void> {
  if (page.isClosed()) {
    console.warn(`[screenshot] Page closed before screenshot for "${testInfo.title}"`);
    return;
  }

  try {
    const screenshot = await page.screenshot({ fullPage: true, timeout: 5_000 });

  
    await testInfo.attach(`${testInfo.title}_${label}`, {
      body: screenshot,
      contentType: 'image/png'
    });

    const safeTitle = testInfo.title
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 80);
    const filename = path.join(
      SCREENSHOT_DIR,
      `${safeTitle}_${label}_${Date.now()}.png`
    );
    fs.writeFileSync(filename, screenshot);
  } catch (err) {
    console.warn(`[screenshot] Capture failed for "${testInfo.title}": ${(err as Error).message}`);
  }
}