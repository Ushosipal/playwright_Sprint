import { Page, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export enum AccountType {
  CHECKING = '0',
  SAVINGS = '1'
}

export class OpenAccountPage {
  constructor(public readonly page: Page) {}

  async navigate(): Promise<void> {
    Logger.info('OpenAccountPage: Navigating to /parabank/openaccount.htm');
    await this.page.goto('/parabank/openaccount.htm');
  }


  async openNewAccount(accountType: AccountType, fromAccountId: string): Promise<string> {
    const typeLabel = accountType === AccountType.SAVINGS ? 'Savings' : 'Checking';
    Logger.info(`OpenAccountPage: Opening ${typeLabel} account funded from #${fromAccountId}`);

   
    await this.page.selectOption('#type', accountType);

    await this.page.locator('#fromAccountId option').first()
      .waitFor({ state: 'attached', timeout: 10_000 });
    await this.page.selectOption('#fromAccountId', fromAccountId);


    await this.page.getByRole('button', { name: 'Open New Account' }).click();

    await expect(
      this.page.getByRole('heading', { name: 'Account Opened!' }),
      'Open-account flow should land on confirmation page'
    ).toBeVisible({ timeout: 15_000 });

    const newAccountId = (await this.page.locator('#newAccountId').innerText()).trim();
    Logger.info(`OpenAccountPage: New account created: #${newAccountId}`);
    return newAccountId;
  }
}