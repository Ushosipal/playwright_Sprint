import { test as base, expect } from '@playwright/test';
import { RegisterPage } from '../page/registerPage';
import { OpenAccountPage, AccountType } from '../page/openAccountPage';
import { AccountOverviewPage } from '../page/accountOverviewPage';
import { TransferFundsPage } from '../page/transferPage';
import { Logger } from '../utils/logger';
import { captureScreenshot } from '../utils/screenshot';

export interface ActiveUser {
  username: string;
  password: string;
  account1: string;
  account2: string;
}

type TestFixtures = {
  activeUser: ActiveUser;
  registerPage: RegisterPage;
  openAccountPage: OpenAccountPage;
  accountOverviewPage: AccountOverviewPage;
  transferPage: TransferFundsPage;

  autoScreenshot: void;
};

async function staggeredStart(): Promise<void> {
  const delayMs = Math.floor(Math.random() * 3000);
  Logger.info(`Fixture: staggered start delay = ${delayMs} ms`);
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

export const test = base.extend<TestFixtures>({


  autoScreenshot: [async ({ page }, use, testInfo) => {
    await use();
    const label = testInfo.status === 'passed' ? 'pass'
                : testInfo.status === 'failed' ? 'fail'
                : testInfo.status === 'timedOut' ? 'timeout'
                : 'end';
    await captureScreenshot(page, testInfo, label);
  }, { auto: true }],


  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  openAccountPage: async ({ page }, use) => {
    await use(new OpenAccountPage(page));
  },
  accountOverviewPage: async ({ page }, use) => {
    await use(new AccountOverviewPage(page));
  },
  transferPage: async ({ page }, use) => {
    await use(new TransferFundsPage(page));
  },

  activeUser: async (
    { registerPage, openAccountPage, accountOverviewPage },
    use
  ) => {
  
    await staggeredStart();

    
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const username = `qauser_${timestamp}`;
    const password = 'Password_123';
    Logger.info(`Fixture: starting UI registration for username=${username}`);

  
    await registerPage.navigate();
    await registerPage.registerDynamicUser({
      username,
      password,
      ssn: `SSN-123456789`,
    });
    await registerPage.verifyRegistrationSuccess();

   
    await accountOverviewPage.navigate();
    const account1 = await accountOverviewPage.getPrimaryAccountId();


    await openAccountPage.navigate();
    const account2 = await openAccountPage.openNewAccount(
      AccountType.SAVINGS,
      account1
    );

    Logger.info(
      `Fixture COMPLETE: user=${username} account1=${account1} account2=${account2}`
    );

    await use({ username, password, account1, account2 });
  }
});

test.afterEach(async ({ page }, testInfo) => {
  try {
    if (!page.isClosed()) {
      await page.close();
    }
  } catch (error) {
    Logger.warn(`Cleanup skipped: ${error}`);
  }
});

export { expect };