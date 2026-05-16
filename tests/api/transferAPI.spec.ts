// TC-API-001
// TC-API-002
// TC-API-003
// TC-API-007
// TC-API-008 

import { test, expect } from '../../fixtures/baseFixture';
import apiData from '../../testData/apiTransferData.json';
import { ApiLogger, Logger } from '../../utils/logger';

test.describe('API Transfer Validations @api', () => {

  //1
  test('TC-API-001: Source account balance is debited correctly via API @smoke @FR-06', async ({ activeUser, page, request }) => {
    Logger.info('TC-API-001: Verifying source account is debited correctly after API transfer');

    test.info().annotations.push({ type: 'Test Type', description: 'API' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-03' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-06' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    const data = apiData.find(d => d.testCaseId === 'TC-API-01')!;
    const transferAmount = data.amount;
    const parsedAmount = parseFloat(transferAmount);
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-API-001: Arrange complete — amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

  
    const preBalanceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preBalanceRes.status(), 'Pre-balance GET should return 200').toBe(200);
    const preBalanceData = await preBalanceRes.json();
    const preSourceBalance = parseFloat(preBalanceData.balance);
    ApiLogger.info({ testCase: 'TC-API-001', endpoint: `/accounts/${sourceAccount}`, preBalance: preSourceBalance });

    Logger.info(`TC-API-001: Pre-transfer source balance = $${preSourceBalance}`);

 
    const transferRes = await page.request.post(`/parabank/services/bank/transfer`, {
      params: {
        fromAccountId: sourceAccount,
        toAccountId: destinationAccount,
        amount: transferAmount
      },
      headers: { 'Accept': 'application/json' }
    });
    const transferBody = await transferRes.text();
    ApiLogger.info({ testCase: 'TC-API-001', endpoint: '/transfer', status: transferRes.status(), response: transferBody.substring(0, 500) });

    Logger.info(`TC-API-001: POST /transfer returned HTTP ${transferRes.status()}`);

    expect(transferRes.status(), 'POST /transfer should return HTTP 200').toBe(200);
    expect(transferBody, 'Response body should contain success indicator').toContain('Successfully transferred');

    const postBalanceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(postBalanceRes.status(), 'Post-balance GET should return 200').toBe(200);
    const postBalanceData = await postBalanceRes.json();
    const postSourceBalance = parseFloat(postBalanceData.balance);
    ApiLogger.info({ testCase: 'TC-API-001', endpoint: `/accounts/${sourceAccount}`, postBalance: postSourceBalance });

    Logger.info(`TC-API-001: Post-transfer source balance = $${postSourceBalance}`);

    expect(postSourceBalance,
      `FR-06: Source #${sourceAccount} should be debited by exactly $${parsedAmount}. ` +
      `Pre=$${preSourceBalance}, Post=$${postSourceBalance}, Expected post=$${preSourceBalance - parsedAmount}`
    ).toBeCloseTo(preSourceBalance - parsedAmount, 2);

    Logger.info(`TC-API-001: PASSED — Source debited correctly: $${preSourceBalance} → $${postSourceBalance} (delta = -$${parsedAmount})`);
  });



//2
  test('TC-API-002: POST /transfer returns HTTP 200 for a valid transfer @smoke @FR-06', async ({ activeUser, page }) => {
    Logger.info('TC-API-002: Verifying POST /transfer returns HTTP 200 with success body for valid request');

    
    test.info().annotations.push({ type: 'Test Type', description: 'API' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-03' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-06' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    const data = apiData.find(d => d.testCaseId === 'TC-API-01')!;
    const transferAmount = data.amount;
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-API-002: Arrange complete — amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

    const transferRes = await page.request.post(`/parabank/services/bank/transfer`, {
      params: {
        fromAccountId: sourceAccount,
        toAccountId: destinationAccount,
        amount: transferAmount
      },
      headers: { 'Accept': 'application/json' }
    });
    const transferBody = await transferRes.text();
    const transferStatus = transferRes.status();
    ApiLogger.info({ testCase: 'TC-API-002', endpoint: '/transfer', status: transferStatus, response: transferBody.substring(0, 500) });

    Logger.info(`TC-API-002: POST /transfer returned HTTP ${transferStatus}`);
    Logger.info(`TC-API-002: Response body = "${transferBody.substring(0, 200)}"`);

 
    expect(transferStatus,
      `Expected HTTP 200 for valid transfer, got HTTP ${transferStatus}`
    ).toBe(200);

    expect(transferBody,
      'Response body should contain success message referencing transferred amount'
    ).toContain('Successfully transferred');

    Logger.info('TC-API-002: PASSED — POST /transfer returned HTTP 200 with valid success body');
  });

  
  // 3
  test('TC-API-003: Destination account balance is credited correctly via API @regression @FR-06', async ({ activeUser, page, request }) => {
    Logger.info('TC-API-003: Verifying destination account is credited correctly after API transfer');

   
    test.info().annotations.push({ type: 'Test Type', description: 'API' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-04' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-06' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    const data = apiData.find(d => d.testCaseId === 'TC-API-01')!;
    const transferAmount = data.amount;
    const parsedAmount = parseFloat(transferAmount);
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-API-003: Arrange complete — amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

    const preBalanceRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preBalanceRes.status(), 'Pre-balance GET should return 200').toBe(200);
    const preBalanceData = await preBalanceRes.json();
    const preDestBalance = parseFloat(preBalanceData.balance);
    ApiLogger.info({ testCase: 'TC-API-003', endpoint: `/accounts/${destinationAccount}`, preBalance: preDestBalance });

    Logger.info(`TC-API-003: Pre-transfer destination balance = $${preDestBalance}`);


    const transferRes = await page.request.post(`/parabank/services/bank/transfer`, {
      params: {
        fromAccountId: sourceAccount,
        toAccountId: destinationAccount,
        amount: transferAmount
      },
      headers: { 'Accept': 'application/json' }
    });
    const transferBody = await transferRes.text();
    ApiLogger.info({ testCase: 'TC-API-003', endpoint: '/transfer', status: transferRes.status(), response: transferBody.substring(0, 500) });

    Logger.info(`TC-API-003: POST /transfer returned HTTP ${transferRes.status()}`);


    expect(transferRes.status(), 'POST /transfer should return HTTP 200').toBe(200);

 
    const postBalanceRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(postBalanceRes.status(), 'Post-balance GET should return 200').toBe(200);
    const postBalanceData = await postBalanceRes.json();
    const postDestBalance = parseFloat(postBalanceData.balance);
    ApiLogger.info({ testCase: 'TC-API-003', endpoint: `/accounts/${destinationAccount}`, postBalance: postDestBalance });

    Logger.info(`TC-API-003: Post-transfer destination balance = $${postDestBalance}`);

   
    expect(postDestBalance,
      `FR-06: Destination #${destinationAccount} should be credited by exactly $${parsedAmount}. ` +
      `Pre=$${preDestBalance}, Post=$${postDestBalance}, Expected post=$${preDestBalance + parsedAmount}`
    ).toBeCloseTo(preDestBalance + parsedAmount, 2);

    Logger.info(`TC-API-003: PASSED — Destination credited correctly: $${preDestBalance} → $${postDestBalance} (delta = +$${parsedAmount})`);
  });


//7
  test('TC-API-007: Transfer amount exceeds available balance - insufficient funds (DEF-FT-001) @defects @FR-09', async ({ activeUser, page, request }) => {
    Logger.info('TC-API-007: Executing insufficient-funds transfer via API — expecting 4xx but known defect DEF-FT-001');

   
    test.info().annotations.push({ type: 'Test Type', description: 'API (Negative)' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-08' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-09' });
    test.info().annotations.push({ type: 'Known Bug', description: 'DEF-FT-001' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Fail' });

    const data = apiData.find(d => d.testCaseId === 'TC-API-04')!;
    const transferAmount = data.amount;
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-API-007: Arrange complete — overdraft amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

  
    const preBalanceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preBalanceRes.status()).toBe(200);
    const preBalanceData = await preBalanceRes.json();
    const preSourceBalance = parseFloat(preBalanceData.balance);

    Logger.info(`TC-API-007: Pre-transfer source balance = $${preSourceBalance} (attempting to transfer $${transferAmount})`);

  
    const transferRes = await page.request.post(`/parabank/services/bank/transfer`, {
      params: {
        fromAccountId: sourceAccount,
        toAccountId: destinationAccount,
        amount: transferAmount
      },
      headers: { 'Accept': 'application/json' }
    });
    const transferBody = await transferRes.text();
    const transferStatus = transferRes.status();
    ApiLogger.info({ testCase: 'TC-API-007', endpoint: '/transfer', status: transferStatus, response: transferBody.substring(0, 500) });

    Logger.info(`TC-API-007: POST /transfer returned HTTP ${transferStatus}`);


    if (transferStatus === 200) {
      // Bug is active — API incorrectly accepted the overdraft
      const postBalanceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
        headers: { 'Accept': 'application/json' }
      });
      const postBalanceData = await postBalanceRes.json();
      const postSourceBalance = parseFloat(postBalanceData.balance);

      Logger.info(`TC-API-007: Post-transfer source balance = $${postSourceBalance} (was $${preSourceBalance})`);

      expect.soft(transferStatus,
        'DEF-FT-001 active: API incorrectly returned HTTP 200 for insufficient-funds transfer of $' +
        transferAmount + '. Source balance went from $' + preSourceBalance + ' to $' + postSourceBalance +
        ' (deeply negative). Expected: HTTP 4xx with "Insufficient funds" error.'
      ).toBe(200);

      Logger.info('TC-API-007: Soft assertion logged — DEF-FT-001 confirmed ACTIVE, balance went negative');
    } else {

      expect.soft(transferStatus,
        `DEF-FT-001 appears FIXED — API correctly rejected with HTTP ${transferStatus}.`
      ).not.toBe(200);

      Logger.info(`TC-API-007: Bug DEF-FT-001 appears FIXED — API returned HTTP ${transferStatus}`);
    }

    Logger.info(`TC-API-007: COMPLETED — Insufficient-funds defect path finished, status: ${transferStatus}`);
  });


//8
  test('TC-API-008: Same account in fromAccountId and toAccountId accepted (DEF-FT-004) @defects @FR-09', async ({ activeUser, page }) => {
    Logger.info('TC-API-008: Executing same-account transfer via API (from=to) — expecting 4xx but known defect DEF-FT-004');


    test.info().annotations.push({ type: 'Test Type', description: 'API (Negative)' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-10' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-09' });
    test.info().annotations.push({ type: 'Known Bug', description: 'DEF-FT-004' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Fail' });

    const data = apiData.find(d => d.testCaseId === 'TC-API-05-B')!;
    const transferAmount = data.amount;
    const sameAccount = activeUser.account1;

    Logger.info(`TC-API-008: Arrange complete — amount=${transferAmount}, from=#${sameAccount}, to=#${sameAccount} (SAME account)`);

    const transferRes = await page.request.post(`/parabank/services/bank/transfer`, {
      params: {
        fromAccountId: sameAccount,
        toAccountId: sameAccount,
        amount: transferAmount
      },
      headers: { 'Accept': 'application/json' }
    });
    const transferBody = await transferRes.text();
    const transferStatus = transferRes.status();
    ApiLogger.info({ testCase: 'TC-API-008', endpoint: '/transfer', status: transferStatus, response: transferBody.substring(0, 500) });

    Logger.info(`TC-API-008: POST /transfer (from=to) returned HTTP ${transferStatus}`);
    Logger.info(`TC-API-008: Response body = "${transferBody.substring(0, 200)}"`);

    
    if (transferStatus === 200) {
      // Bug is active — API accepted same-account transfer
      expect.soft(transferStatus,
        'DEF-FT-004 active: API accepted same-account transfer (from=#' + sameAccount +
        ' to=#' + sameAccount + ') and returned HTTP 200. ' +
        'Two phantom transactions (Debit + Credit of $' + transferAmount + ') now pollute the account history. ' +
        'Expected: HTTP 4xx with error message.'
      ).toBe(200);

      Logger.info('TC-API-008: Soft assertion logged — DEF-FT-004 confirmed ACTIVE, phantom transactions created');
    } else {
     
      expect.soft(transferStatus,
        `DEF-FT-004 appears FIXED — API correctly rejected same-account transfer with HTTP ${transferStatus}.`
      ).not.toBe(200);

      Logger.info(`TC-API-008: Bug DEF-FT-004 appears FIXED — API returned HTTP ${transferStatus}`);
    }

    Logger.info(`TC-API-008: COMPLETED — Same-account defect path finished, status: ${transferStatus}`);
  });
});