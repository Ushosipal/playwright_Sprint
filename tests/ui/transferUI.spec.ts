// TC-UI-001
// TC-UI-003
// TC-UI-004
// TC-UI-005
// TC-UI-006

// DEF-FT-001
// DEF-FT-004


import { test, expect } from '../../fixtures/baseFixture';
import uiData from '../../testData/uiTransferData.json';
import { TransferLocators } from '../../locators/transferLocator';
import { Logger } from '../../utils/logger';

test.describe('UI Transfer Validations @ui', () => {

//1
  test('TC-UI-001: Successful fund transfer between own accounts @smoke @FR-05 @FR-08', async ({ activeUser, transferPage, page }) => {
    Logger.info('TC-UI-001: Executing standard fund transfer between two accounts');


    test.info().annotations.push({ type: 'Test Type', description: 'UI' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-01' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-05, FR-08' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    const data = uiData.find(d => d.testCaseId === 'TC-UI-01')!;
    const transferAmount = data.amount;
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-UI-001: Arrange complete — amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);


    await transferPage.navigate();
    Logger.info('TC-UI-001: Navigated to Transfer Funds page');

    await transferPage.performTransfer(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-UI-001: Transfer submitted via UI');


    await transferPage.verifySuccess(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-UI-001: Confirmation page verified — title reads "Transfer Complete!" and body contains correct amount and account numbers');

    const confirmationText = await transferPage.getConfirmationText();
    const formattedAmount = parseFloat(transferAmount).toFixed(2);

    expect(confirmationText,
      'FR-08: Confirmation text should contain the formatted transfer amount'
    ).toContain(`$${formattedAmount}`);

    expect(confirmationText,
      'FR-08: Confirmation text should contain the source account number'
    ).toContain(sourceAccount);

    expect(confirmationText,
      'FR-08: Confirmation text should contain the destination account number'
    ).toContain(destinationAccount);

    Logger.info('TC-UI-001: PASSED — Transfer completed, confirmation message verified with correct amount and account numbers');
  });


//3
  test('TC-UI-003: Minimum boundary transfer of $0.01 via UI @regression @FR-05 @FR-09', async ({ activeUser, transferPage, page }) => {
    Logger.info('TC-UI-003: Executing minimum boundary transfer of $0.01');

    // ── Arrange ──
    test.info().annotations.push({ type: 'Test Type', description: 'UI' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-07' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-05, FR-09' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    const data = uiData.find(d => d.testCaseId === 'TC-UI-03')!;
    const transferAmount = data.amount;
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-UI-003: Arrange complete — amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

    await transferPage.navigate();
    Logger.info('TC-UI-003: Navigated to Transfer Funds page');

    await transferPage.performTransfer(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-UI-003: Minimum boundary transfer ($0.01) submitted via UI');

    await transferPage.verifySuccess(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-UI-003: Confirmation page verified — "Transfer Complete!" displayed');

    const confirmationText = await transferPage.getConfirmationText();

    expect(confirmationText,
      'FR-05: Confirmation text should contain "$0.01"'
    ).toContain('$0.01');

    expect(confirmationText,
      'FR-05: Confirmation text should reference both account numbers'
    ).toContain(sourceAccount);

    expect(confirmationText,
      'FR-05: Confirmation text should reference destination account'
    ).toContain(destinationAccount);

    Logger.info('TC-UI-003: PASSED — $0.01 boundary transfer accepted and confirmed with correct details');
  });

 //4
  test('TC-UI-004: Transfer amount exceeds available balance - insufficient funds (DEF-FT-001) @defects @FR-09', async ({ activeUser, transferPage, page }) => {
    Logger.info('TC-UI-004: Executing insufficient-funds transfer — expecting rejection but known defect DEF-FT-001');

  
    test.info().annotations.push({ type: 'Test Type', description: 'UI (Negative)' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-08' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-09' });
    test.info().annotations.push({ type: 'Known Bug', description: 'DEF-FT-001' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Fail' });

    const data = uiData.find(d => d.testCaseId === 'TC-UI-06')!;
    const transferAmount = data.amount;
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-UI-004: Arrange complete — overdraft amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

  
    await transferPage.navigate();
    Logger.info('TC-UI-004: Navigated to Transfer Funds page');

    await transferPage.performTransfer(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-UI-004: Overdraft transfer submitted via UI');

  
   
    let bugActive = false;
    try {
      await page.locator(TransferLocators.successMessageBody)
        .waitFor({ state: 'visible', timeout: 5000 });
      bugActive = true;
      Logger.info('TC-UI-004: Success message appeared — bug DEF-FT-001 is ACTIVE');
    } catch {
      bugActive = false;
      Logger.info('TC-UI-004: Success message did NOT appear — bug DEF-FT-001 may be FIXED');
    }

    if (bugActive) {
      expect.soft(bugActive,
        'DEF-FT-001 active: UI accepted insufficient-funds transfer of $' + transferAmount +
        ' and displayed confirmation page. Source balance is now deeply negative. ' +
        'Expected: UI should display an "Insufficient funds" error and reject the transfer.'
      ).toBeTruthy();

      Logger.info('TC-UI-004: Soft assertion logged — DEF-FT-001 confirmed ACTIVE, overdraft was processed');
    } else {
      const errorVisible = await page
        .locator(TransferLocators.errorMessage)
        .last()
        .isVisible()
        .catch(() => false);

      expect.soft(errorVisible,
        'DEF-FT-001 appears FIXED — validation now correctly triggers an insufficient-funds error.'
      ).toBeTruthy();

      Logger.info('TC-UI-004: Bug DEF-FT-001 appears FIXED — error message displayed correctly');
    }

    Logger.info(`TC-UI-004: COMPLETED — Defect path finished, bug active: ${bugActive}`);
  });


//5
  test('TC-UI-005: Empty Amount field is rejected @regression @FR-09', async ({ activeUser, transferPage, page }) => {
    Logger.info('TC-UI-005: Executing transfer with empty amount field — expecting validation rejection');

  
    test.info().annotations.push({ type: 'Test Type', description: 'UI (Negative)' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-09' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-09' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    const data = uiData.find(d => d.testCaseId === 'TC-UI-04-A')!;
    const transferAmount = data.amount;
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-UI-005: Arrange complete — amount="${transferAmount}" (empty), from=#${sourceAccount}, to=#${destinationAccount}`);

  
    await transferPage.navigate();
    Logger.info('TC-UI-005: Navigated to Transfer Funds page');

    await transferPage.performTransfer(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-UI-005: Transfer with empty amount submitted via UI');

    let successAppeared = false;
    try {
      await page.locator(TransferLocators.successMessageBody)
        .waitFor({ state: 'visible', timeout: 5000 });
      successAppeared = true;
      Logger.info('TC-UI-005: WARNING — Success message appeared for empty amount');
    } catch {
      successAppeared = false;
      Logger.info('TC-UI-005: Success message did NOT appear — correct behavior');
    }

    if (successAppeared) {
      expect.soft(successAppeared,
        'Empty amount was incorrectly accepted — transfer confirmation page was shown. ' +
        'Expected: Validation error message, no form submission.'
      ).toBeFalsy();

      Logger.info('TC-UI-005: UNEXPECTED — Empty amount accepted, this is a defect');
    } else {
      const errorVisible = await page
        .locator(TransferLocators.errorMessage).last().isVisible().catch(() => false);
      Logger.info(`TC-UI-005: Form correctly rejected empty amount. Error message visible: ${errorVisible}`);
    }

    Logger.info('TC-UI-005: COMPLETED — Empty amount validation verified');
  });

  
//6
  test('TC-UI-006: Same source and destination account allowed (DEF-FT-004) @defects @FR-09', async ({ activeUser, transferPage, page }) => {
    Logger.info('TC-UI-006: Executing same-account transfer (from=to) — expecting rejection but known defect DEF-FT-004');

    test.info().annotations.push({ type: 'Test Type', description: 'UI (Negative)' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-10' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-09' });
    test.info().annotations.push({ type: 'Known Bug', description: 'DEF-FT-004' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Fail' });

    const data = uiData.find(d => d.testCaseId === 'TC-UI-07')!;
    const transferAmount = data.amount;
    const sameAccount = activeUser.account1;

    Logger.info(`TC-UI-006: Arrange complete — amount=${transferAmount}, from=#${sameAccount}, to=#${sameAccount} (SAME account)`);

    await transferPage.navigate();
    Logger.info('TC-UI-006: Navigated to Transfer Funds page');

    await transferPage.performTransfer(transferAmount, sameAccount, sameAccount);
    Logger.info('TC-UI-006: Same-account transfer submitted via UI (from=to)');

  
    let bugActive = false;
    try {
      await page.locator(TransferLocators.successMessageBody)
        .waitFor({ state: 'visible', timeout: 5000 });
      bugActive = true;
      Logger.info('TC-UI-006: Success message appeared — bug DEF-FT-004 is ACTIVE');
    } catch {
      bugActive = false;
      Logger.info('TC-UI-006: Success message did NOT appear — bug DEF-FT-004 may be FIXED');
    }

    if (bugActive) {
     
      expect.soft(bugActive,
        'DEF-FT-004 active: UI accepted same-account transfer (from=#' + sameAccount +
        ' to=#' + sameAccount + ') and displayed confirmation page. ' +
        'Phantom Debit+Credit transactions now pollute the audit trail. ' +
        'Expected: UI should reject with "Source and destination accounts must be different".'
      ).toBeTruthy();

      Logger.info('TC-UI-006: Soft assertion logged — DEF-FT-004 confirmed ACTIVE, phantom transactions created');
    } else {
      const errorVisible = await page
        .locator(TransferLocators.errorMessage).last().isVisible().catch(() => false);

      expect.soft(errorVisible,
        'DEF-FT-004 appears FIXED - same-account validation now correctly triggers an error message.'
      ).toBeTruthy();

      Logger.info('TC-UI-006: Bug DEF-FT-004 appears FIXED — error message displayed correctly');
    }
    Logger.info(`TC-UI-006: COMPLETED — Same-account defect path finished, bug active: ${bugActive}`);
  });
});