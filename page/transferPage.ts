
import { Page, expect } from '@playwright/test';
import { TransferLocators } from '../locators/transferLocator';
import { Logger } from '../utils/logger';

export class TransferFundsPage {
  constructor(public readonly page: Page) {}

  async navigate(): Promise<void> {
    Logger.info('TransferFundsPage: Navigating to /parabank/transfer.htm');

    const accountsResponsePromise = this.page.waitForResponse(
      res => /\/services_proxy\/bank\/customers\/\d+\/accounts/.test(res.url())
             && res.status() === 200,
      { timeout: 15_000 }
    ).catch(() => null);

    await this.page.goto('/parabank/transfer.htm', { waitUntil: 'domcontentloaded' });
    await accountsResponsePromise;

    await this.page.locator(`${TransferLocators.fromAccountIdSelect} option`)
      .first().waitFor({ state: 'attached', timeout: 10_000 });
  }


  async performTransfer(amount: string, fromAcc: string, toAcc: string): Promise<void> {
    Logger.info(`TransferFundsPage: Transferring $${amount}: #${fromAcc} -> #${toAcc}`);

    await this.fillTransferForm(amount, fromAcc, toAcc);

    
    const transferResponse = this.page.waitForResponse(
      res => res.url().includes('/transfer') && res.request().method() === 'POST',
      { timeout: 15_000 }
    ).catch(() => null);

    await this.page.locator(TransferLocators.transferButton).click();
    await transferResponse;
  }

 
  async fillTransferForm(amount: string, fromAcc: string, toAcc: string): Promise<void> {
    await this.page.locator(TransferLocators.amountInput).fill(amount);

    await this.page.locator(TransferLocators.fromAccountIdSelect)
      .waitFor({ state: 'attached' });
    await this.page.locator(TransferLocators.toAccountIdSelect)
      .waitFor({ state: 'attached' });

    await this.page.selectOption(TransferLocators.fromAccountIdSelect, fromAcc);
    await this.page.selectOption(TransferLocators.toAccountIdSelect, toAcc);
  }


  async verifySuccess(amount: string, fromAcc: string, toAcc: string): Promise<void> {
    const formattedAmount = parseFloat(amount).toFixed(2);

    await this.page.locator(TransferLocators.successMessageTitle)
      .waitFor({ state: 'visible', timeout: 10_000 });

    await expect(
      this.page.locator(TransferLocators.successMessageTitle),
      'FR-08: Page title should read "Transfer Complete!"'
    ).toHaveText('Transfer Complete!');

    await expect(
      this.page.locator(TransferLocators.successMessageBody),
      'FR-08: Confirmation body should include amount and both account numbers'
    ).toContainText(
      `$${formattedAmount} has been transferred from account #${fromAcc} to account #${toAcc}.`
    );
  }

 
  async getConfirmationText(): Promise<string> {
    await this.page.locator(TransferLocators.successMessageBody)
      .waitFor({ state: 'visible' });
    return await this.page.locator(TransferLocators.successMessageBody).innerText();
  }


  async rapidClickTransfer(clickCount: number = 4): Promise<void> {
    Logger.info(`TransferFundsPage: Firing ${clickCount} rapid clicks on Transfer button`);

    const button = this.page.locator(TransferLocators.transferButton);
    await button.waitFor({ state: 'visible' });

    const clickPromises: Promise<void>[] = [];
    for (let i = 0; i < clickCount; i++) {
      clickPromises.push(
        button.dispatchEvent('click').catch(e => {
          Logger.warn(`TransferFundsPage: rapid click ${i + 1} failed: ${e.message}`);
        
          return undefined;
        })
      );
    }
    await Promise.all(clickPromises);
  }
}