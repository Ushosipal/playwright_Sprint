import { Page, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export class AccountOverviewPage {
  constructor(public readonly page: Page) {}

  async navigate(): Promise<void> {
    Logger.info('AccountOverviewPage: Clicking "Accounts Overview" nav link');
    await this.page.getByRole('link', { name: 'Accounts Overview' }).click();
    await expect(this.page).toHaveURL(/.*overview\.htm.*/, { timeout: 10_000 });
  }

  async getPrimaryAccountId(): Promise<string> {
    const firstAccountLink = this.page.locator('#accountTable tbody tr td a').first();
    await firstAccountLink.waitFor({ state: 'visible', timeout: 10_000 });
    const accountId = (await firstAccountLink.innerText()).trim();
    Logger.info(`AccountOverviewPage: Primary account captured: #${accountId}`);
    return accountId;
  }

  
  async getAllAccountIds(): Promise<string[]> {
    const links = this.page.locator('#accountTable tbody tr td a');
    await links.first().waitFor({ state: 'visible' });
    const ids = await links.allInnerTexts();
    return ids.map(s => s.trim());
  }
}