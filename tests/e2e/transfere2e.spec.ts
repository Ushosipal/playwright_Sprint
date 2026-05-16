// TC-E2E-001
// TC-E2E-003
// TC-E2E-004

import { test, expect } from '../../fixtures/baseFixture';
import e2eData from '../../testData/e2eTransferData.json';
import { ApiLogger, Logger } from '../../utils/logger';


test.describe('E2E Hybrid Transfer Validations @e2e', () => {


//1
  test('TC-E2E-001: UI transfer + API before/after balance delta verification @smoke @FR-07', async ({ activeUser, transferPage, page, request }) => {
    Logger.info('TC-E2E-001: Executing hybrid test — UI transfer with API balance delta verification');

    test.info().annotations.push({ type: 'Test Type', description: 'E2E Hybrid' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-06' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-07' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    // Assuming e2eData is imported or available in your scope
    const data = e2eData.find(d => d.testCaseId === 'TC-E2E-01')!;
    const transferAmount = data.amount!;
    const parsedAmount = parseFloat(transferAmount);
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-E2E-001: Arrange complete — amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

    // --- 1. GET PRE-TRANSFER BALANCES ---
    const preSourceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preSourceRes.status(), 'Pre-balance source GET should return 200').toBe(200);
    const preSourceData = await preSourceRes.json();
    const preSourceBalance = parseFloat(preSourceData.balance);
    ApiLogger.info({ testCase: 'TC-E2E-001', endpoint: `/accounts/${sourceAccount}`, preBalance: preSourceBalance });

    Logger.info(`TC-E2E-001: Pre-transfer source balance = $${preSourceBalance}`);

    const preDestRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preDestRes.status(), 'Pre-balance destination GET should return 200').toBe(200);
    const preDestData = await preDestRes.json();
    const preDestBalance = parseFloat(preDestData.balance);
    ApiLogger.info({ testCase: 'TC-E2E-001', endpoint: `/accounts/${destinationAccount}`, preBalance: preDestBalance });

    Logger.info(`TC-E2E-001: Pre-transfer destination balance = $${preDestBalance}`);


    // --- 2. PERFORM UI TRANSFER ---
    await transferPage.navigate();
    Logger.info('TC-E2E-001: Navigated to Transfer Funds page');

    await transferPage.performTransfer(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-E2E-001: Transfer submitted via UI');

    await transferPage.verifySuccess(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-E2E-001: UI confirmation page verified — "Transfer Complete!" displayed');


    // --- 3. RESILIENT POST-TRANSFER BALANCE VERIFICATION (POLLING) ---
    Logger.info('TC-E2E-001: Polling API for updated post-transfer source balance...');
    await expect.poll(async () => {
      const postSourceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (postSourceRes.status() !== 200) return null;
      const postSourceData = await postSourceRes.json();
      return parseFloat(postSourceData.balance);
    }, {
      message: `FR-07: Waiting for Source #${sourceAccount} to be debited by $${parsedAmount}. Pre=$${preSourceBalance}`,
      timeout: 6000,
      intervals: [500, 1000]
    }).toBeCloseTo(preSourceBalance - parsedAmount, 2);

    Logger.info('TC-E2E-001: Polling API for updated post-transfer destination balance...');
    await expect.poll(async () => {
      const postDestRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (postDestRes.status() !== 200) return null;
      const postDestData = await postDestRes.json();
      return parseFloat(postDestData.balance);
    }, {
      message: `FR-07: Waiting for Destination #${destinationAccount} to be credited by $${parsedAmount}. Pre=$${preDestBalance}`,
      timeout: 6000,
      intervals: [500, 1000]
    }).toBeCloseTo(preDestBalance + parsedAmount, 2);

    Logger.info(`TC-E2E-001: Balance deltas verified — source delta=-$${parsedAmount}, dest delta=+$${parsedAmount}`);


    // --- 4. RESILIENT TRANSACTION HISTORY VERIFICATION (POLLING) ---
    Logger.info('TC-E2E-001: Polling API for source debit transaction history entry...');
    await expect.poll(async () => {
      const sourceTxnRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}/transactions`, { 
        headers: { 'Accept': 'application/json' } 
      });
      if (sourceTxnRes.status() !== 200) return null;
      
      const sourceTxns = await sourceTxnRes.json();
      return sourceTxns.find((tx: any) =>
        tx.type === 'Debit' && Math.abs(parseFloat(String(tx.amount))) === parsedAmount
      );
    }, {
      message: `FR-07: Waiting for Debit of $${parsedAmount} to appear in source #${sourceAccount} transaction history`,
      timeout: 6000,
      intervals: [500, 1000]
    }).toBeDefined();

    Logger.info(`TC-E2E-001: Debit transaction of $${parsedAmount} found in source history`);

    Logger.info('TC-E2E-001: Polling API for destination credit transaction history entry...');
    await expect.poll(async () => {
      const destTxnRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}/transactions`, { 
        headers: { 'Accept': 'application/json' } 
      });
      if (destTxnRes.status() !== 200) return null;
      
      const destTxns = await destTxnRes.json();
      return destTxns.find((tx: any) =>
        tx.type === 'Credit' && Math.abs(parseFloat(String(tx.amount))) === parsedAmount
      );
    }, {
      message: `FR-07: Waiting for Credit of $${parsedAmount} to appear in destination #${destinationAccount} transaction history`,
      timeout: 6000,
      intervals: [500, 1000]
    }).toBeDefined();

    Logger.info(`TC-E2E-001: Credit transaction of $${parsedAmount} found in destination history`);
    Logger.info('TC-E2E-001: PASSED - UI transfer confirmed, API balance deltas verified, transaction history entries validated');
});

//3
  test('TC-E2E-003: Minimum boundary ($0.01) UI transfer + API balance verification @regression @FR-06', async ({ activeUser, transferPage, page, request }) => {
    Logger.info('TC-E2E-003: Executing hybrid minimum boundary test — $0.01 transfer with API balance verification');

    
    test.info().annotations.push({ type: 'Test Type', description: 'E2E Hybrid' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-07' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-06' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    const data = e2eData.find(d => d.testCaseId === 'TC-E2E-03')!;
    const transferAmount = data.amount!;
    const parsedAmount = parseFloat(transferAmount);
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-E2E-003: Arrange complete — amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

    const preSourceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preSourceRes.status(), 'Pre-balance source GET should return 200').toBe(200);
    const preSourceData = await preSourceRes.json();
    const preSourceBalance = parseFloat(preSourceData.balance);

    Logger.info(`TC-E2E-003: Pre-transfer source balance = $${preSourceBalance}`);

    const preDestRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preDestRes.status(), 'Pre-balance destination GET should return 200').toBe(200);
    const preDestData = await preDestRes.json();
    const preDestBalance = parseFloat(preDestData.balance);

    Logger.info(`TC-E2E-003: Pre-transfer destination balance = $${preDestBalance}`);

 
    await transferPage.navigate();
    Logger.info('TC-E2E-003: Navigated to Transfer Funds page');

    await transferPage.performTransfer(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-E2E-003: Minimum boundary transfer ($0.01) submitted via UI');

    await transferPage.verifySuccess(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-E2E-003: UI confirmation page verified — "$0.01" transfer confirmed');


    const postSourceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(postSourceRes.status(), 'Post-balance source GET should return 200').toBe(200);
    const postSourceData = await postSourceRes.json();
    const postSourceBalance = parseFloat(postSourceData.balance);

    Logger.info(`TC-E2E-003: Post-transfer source balance = $${postSourceBalance}`);


    const postDestRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(postDestRes.status(), 'Post-balance destination GET should return 200').toBe(200);
    const postDestData = await postDestRes.json();
    const postDestBalance = parseFloat(postDestData.balance);

    Logger.info(`TC-E2E-003: Post-transfer destination balance = $${postDestBalance}`);


    expect(postSourceBalance,
      `FR-06: Source #${sourceAccount} should be debited by exactly $${parsedAmount}. ` +
      `Pre=$${preSourceBalance}, Post=$${postSourceBalance}`
    ).toBeCloseTo(preSourceBalance - parsedAmount, 2);

 
    expect(postDestBalance,
      `FR-06: Destination #${destinationAccount} should be credited by exactly $${parsedAmount}. ` +
      `Pre=$${preDestBalance}, Post=$${postDestBalance}`
    ).toBeCloseTo(preDestBalance + parsedAmount, 2);

    Logger.info(`TC-E2E-003: PASSED — $0.01 boundary correctly reflected: source -$${parsedAmount}, destination +$${parsedAmount}`);
  });
 

//4
  test('TC-E2E-004: Full E2E - login, UI transfer, API balance + history verification @smoke @FR-05 @FR-06 @FR-07 @FR-08', async ({ activeUser, transferPage, page, request }) => {
    Logger.info('TC-E2E-004: Executing full end-to-end flow - login, UI transfer, API balance and history verification');

 
    test.info().annotations.push({ type: 'Test Type', description: 'E2E' });
    test.info().annotations.push({ type: 'Scenario', description: 'TS-FT-11' });
    test.info().annotations.push({ type: 'Requirement', description: 'FR-05, FR-06, FR-07, FR-08' });
    test.info().annotations.push({ type: 'Doc Status', description: 'Pass' });

    const data = e2eData.find(d => d.testCaseId === 'TC-E2E-08')!;
    const transferAmount = data.amount!;
    const parsedAmount = parseFloat(transferAmount);
    const sourceAccount = activeUser.account1;
    const destinationAccount = activeUser.account2;

    Logger.info(`TC-E2E-004: Arrange complete — user=${activeUser.username}, amount=${transferAmount}, from=#${sourceAccount}, to=#${destinationAccount}`);

    Logger.info(`TC-E2E-004: Step 1 — User "${activeUser.username}" logged in via base fixture with JSESSIONID`);


    const preSourceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preSourceRes.status(), 'Pre-balance source GET should return 200').toBe(200);
    const preSourceData = await preSourceRes.json();
    const preSourceBalance = parseFloat(preSourceData.balance);

    Logger.info(`TC-E2E-004: Step 2a — Pre-transfer source balance = $${preSourceBalance}`);


    const preDestRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(preDestRes.status(), 'Pre-balance destination GET should return 200').toBe(200);
    const preDestData = await preDestRes.json();
    const preDestBalance = parseFloat(preDestData.balance);

    Logger.info(`TC-E2E-004: Step 2b — Pre-transfer destination balance = $${preDestBalance}`);

    await transferPage.navigate();
    Logger.info('TC-E2E-004: Step 3a — Navigated to Transfer Funds page');

    await transferPage.performTransfer(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-E2E-004: Step 3b — Transfer of $' + transferAmount + ' submitted via UI');


    await transferPage.verifySuccess(transferAmount, sourceAccount, destinationAccount);
    Logger.info('TC-E2E-004: Step 4a - UI confirmation page verified — "Transfer Complete!" displayed');

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

    Logger.info(`TC-E2E-004: Step 4b - Confirmation text verified: contains $${formattedAmount}, #${sourceAccount}, #${destinationAccount}`);


    const postSourceRes = await request.get(`/parabank/services/bank/accounts/${sourceAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(postSourceRes.status(), 'Post-balance source GET should return 200').toBe(200);
    const postSourceData = await postSourceRes.json();
    const postSourceBalance = parseFloat(postSourceData.balance);

    Logger.info(`TC-E2E-004: Step 5a - Post-transfer source balance = $${postSourceBalance}`);

    const postDestRes = await request.get(`/parabank/services/bank/accounts/${destinationAccount}`, {
      headers: { 'Accept': 'application/json' }
    });
    expect(postDestRes.status(), 'Post-balance destination GET should return 200').toBe(200);
    const postDestData = await postDestRes.json();
    const postDestBalance = parseFloat(postDestData.balance);

    Logger.info(`TC-E2E-004: Step 5b — Post-transfer destination balance = $${postDestBalance}`);

    expect(postSourceBalance,
      `FR-06: Source #${sourceAccount} should be debited by exactly $${parsedAmount}. ` +
      `Pre=$${preSourceBalance}, Post=$${postSourceBalance}`
    ).toBeCloseTo(preSourceBalance - parsedAmount, 2);

    expect(postDestBalance,
      `FR-06: Destination #${destinationAccount} should be credited by exactly $${parsedAmount}. ` +
      `Pre=$${preDestBalance}, Post=$${postDestBalance}`
    ).toBeCloseTo(preDestBalance + parsedAmount, 2);

    Logger.info(`TC-E2E-004: Step 5c - Balance deltas verified: source -$${parsedAmount}, dest +$${parsedAmount}`);


    const sourceTxnRes = await request.get(
      `/parabank/services/bank/accounts/${sourceAccount}/transactions`,
      { headers: { 'Accept': 'application/json' } }
    );
    expect(sourceTxnRes.status(), 'Source transactions GET should return 200').toBe(200);
    const sourceTxns = await sourceTxnRes.json();

    const debitEntry = sourceTxns.find((tx: any) =>
      tx.type === 'Debit' && Math.abs(parseFloat(String(tx.amount))) === parsedAmount
    );
    expect(debitEntry,
      `FR-07: Debit transaction of $${parsedAmount} should appear in source #${sourceAccount} history. ` +
      `Found ${sourceTxns.length} total transactions.`
    ).toBeDefined();

    Logger.info(`TC-E2E-004: Step 6a — Debit transaction of $${parsedAmount} found in source history`);

  
    const destTxnRes = await request.get(
      `/parabank/services/bank/accounts/${destinationAccount}/transactions`,
      { headers: { 'Accept': 'application/json' } }
    );
    expect(destTxnRes.status(), 'Destination transactions GET should return 200').toBe(200);
    const destTxns = await destTxnRes.json();

    const creditEntry = destTxns.find((tx: any) =>
      tx.type === 'Credit' && Math.abs(parseFloat(String(tx.amount))) === parsedAmount
    );
    expect(creditEntry,
      `FR-07: Credit transaction of $${parsedAmount} should appear in destination #${destinationAccount} history. ` +
      `Found ${destTxns.length} total transactions.`
    ).toBeDefined();

    Logger.info(`TC-E2E-004: Step 7a — Credit transaction of $${parsedAmount} found in destination history`);
    Logger.info('TC-E2E-004: PASSED — Full E2E flow verified: login , UI transfer , confirmation message , balance deltas , transaction history ');
  });
});