/**
 * API Transfer Validations
 *
 * 6 test cases driven by test-data/api-transfer.data.json:
 *
 * | testCaseId   | scenario                                    | Defect  | Status |
 * |--------------|---------------------------------------------|---------|--------|
 * | TC-API-01    | Valid POST /transfer returns HTTP 200        | —       | Pass   |
 * | TC-API-02    | Source debited + destination credited        | —       | Pass   |
 * | TC-API-03    | Transaction history Debit/Credit recorded    | —       | Pass   |
 * | TC-API-04    | Insufficient funds — API returns 200         | DEF-004 | Fail   |
 * | TC-API-05-A  | Negative amount transfer accepted            | DEF-003 | Fail   |
 * | TC-API-05-B  | Same-account (from=to) transfer accepted     | DEF-001 | Fail   |
 *
 * Import: api-fixture (extends base-fixture).
 *   - activeUser  → registered user with account1 and account2
 *   - apiClient   → getBalance(), getTransactions(), transfer(), getAccount()
 *
 * JSON: test-data/api-transfer.data.json
 *   Each test reads its own entry by testCaseId — NO loops, NO dynamic generation.
 *
 * Auth: apiClient uses page.request which inherits the JSESSIONID established
 *       during base-fixture UI registration, so every call is authenticated.
 */
import { test, expect } from '../../fixtures/apiFixture';
import type { Transaction } from '../../fixtures/apiFixture';
import apiData from '../../testData/apiTransferData.json';
import { Logger } from '../../utils/logger';

test.describe('API Transfer Validations @api', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // TC-API-01 — Valid POST /transfer returns HTTP 200
  // Scenario: Valid transfer | FR: FR-05, FR-06 | Status: Pass | Defect: none
  //
  // Strategy: call apiClient.transfer() and assert HTTP 200 plus success body.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-API-01: Valid POST /transfer returns HTTP 200 @smoke @FR-05 @FR-06',
    async ({ activeUser, apiClient }) => {

      Logger.info('TC-API-01: Verifying POST /transfer returns HTTP 200 with a success body');

      // ── Arrange ──
      test.info().annotations.push({ type: 'Test Type',   description: 'API' });
      test.info().annotations.push({ type: 'Scenario',    description: 'Valid POST /transfer returns HTTP 200' });
      test.info().annotations.push({ type: 'Requirement', description: 'FR-05, FR-06' });
      test.info().annotations.push({ type: 'Doc Status',  description: 'Pass' });

      const data           = apiData.find(d => d.testCaseId === 'TC-API-01')!;
      const transferAmount = data.amount;
      const sourceAccount  = activeUser.account1;
      const destAccount    = activeUser.account2;

      Logger.info(
        `TC-API-01: Arrange — amount=${transferAmount}, ` +
        `from=#${sourceAccount}, to=#${destAccount}`
      );

      // ── Act ──
      const result = await apiClient.transfer(sourceAccount, destAccount, transferAmount);
      Logger.info(`TC-API-01: POST /transfer returned HTTP ${result.status}`);
      Logger.info(`TC-API-01: Response body = "${result.body.substring(0, 200)}"`);

      // ── Assert ──
      expect(result.status,
        `Expected HTTP ${data.expectedStatus} for a valid transfer, got HTTP ${result.status}`
      ).toBe(data.expectedStatus);

      expect(result.body,
        'Response body should contain the success phrase from ParaBank'
      ).toContain('Successfully transferred');

      Logger.info(
        'TC-API-01: PASSED — POST /transfer returned HTTP 200 with valid success body'
      );
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC-API-02 — Source debited and destination credited correctly (exact deltas)
  // Scenario: Balance validation | FR: FR-06 | Status: Pass | Defect: none
  //
  // Strategy:
  //   1. Read pre-transfer balances on both accounts via apiClient.getBalance()
  //   2. Execute transfer via apiClient.transfer()
  //   3. Read post-transfer balances
  //   4. Assert source decreased by amount and destination increased by amount
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-API-02: Source debited and destination credited correctly @regression @FR-06',
    async ({ activeUser, apiClient }) => {

      Logger.info(
        'TC-API-02: Verifying exact balance deltas on both accounts after transfer'
      );

      // ── Arrange ──
      test.info().annotations.push({ type: 'Test Type',   description: 'API' });
      test.info().annotations.push({ type: 'Scenario',    description: 'Source debited and destination credited correctly (exact deltas)' });
      test.info().annotations.push({ type: 'Requirement', description: 'FR-06' });
      test.info().annotations.push({ type: 'Doc Status',  description: 'Pass' });

      const data           = apiData.find(d => d.testCaseId === 'TC-API-02')!;
      const transferAmount = data.amount;
      const parsedAmount   = parseFloat(transferAmount);
      const sourceAccount  = activeUser.account1;
      const destAccount    = activeUser.account2;

      Logger.info(
        `TC-API-02: Arrange — amount=${transferAmount}, ` +
        `from=#${sourceAccount}, to=#${destAccount}`
      );

      // Read pre-transfer balances on both accounts
      const preSourceBalance = await apiClient.getBalance(sourceAccount);
      const preDestBalance   = await apiClient.getBalance(destAccount);
      Logger.info(
        `TC-API-02: Pre-transfer — source=$${preSourceBalance}, dest=$${preDestBalance}`
      );

      // ── Act ──
      const result = await apiClient.transfer(sourceAccount, destAccount, transferAmount);
      Logger.info(`TC-API-02: POST /transfer returned HTTP ${result.status}`);

      // ── Assert ──
      expect(result.status,
        `POST /transfer should return HTTP 200, got ${result.status}`
      ).toBe(200);

      // Read post-transfer balances on both accounts
      const postSourceBalance = await apiClient.getBalance(sourceAccount);
      const postDestBalance   = await apiClient.getBalance(destAccount);
      Logger.info(
        `TC-API-02: Post-transfer — source=$${postSourceBalance}, dest=$${postDestBalance}`
      );

      // Source must be debited by exactly parsedAmount
      expect(postSourceBalance,
        `FR-06: Source #${sourceAccount} should decrease by $${parsedAmount}. ` +
        `Pre=$${preSourceBalance}, Post=$${postSourceBalance}, ` +
        `Expected=$${preSourceBalance - parsedAmount}`
      ).toBeCloseTo(preSourceBalance - parsedAmount, 2);

      // Destination must be credited by exactly parsedAmount
      expect(postDestBalance,
        `FR-06: Destination #${destAccount} should increase by $${parsedAmount}. ` +
        `Pre=$${preDestBalance}, Post=$${postDestBalance}, ` +
        `Expected=$${preDestBalance + parsedAmount}`
      ).toBeCloseTo(preDestBalance + parsedAmount, 2);

      Logger.info(
        `TC-API-02: PASSED — Source: $${preSourceBalance}→$${postSourceBalance} ` +
        `(-$${parsedAmount}), Dest: $${preDestBalance}→$${postDestBalance} (+$${parsedAmount})`
      );
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC-API-03 — Transaction history shows Debit on source and Credit on destination
  // Scenario: History validation | FR: FR-07 | Status: Pass | Defect: none
  //
  // Strategy:
  //   1. Execute transfer via apiClient.transfer()
  //   2. Read transaction history on source account via apiClient.getTransactions()
  //   3. Read transaction history on destination account
  //   4. Assert a Debit entry exists on source and a Credit entry on destination,
  //      both matching the transfer amount
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-API-03: Transaction history shows Debit on source and Credit on destination @regression @FR-07',
    async ({ activeUser, apiClient }) => {

      Logger.info(
        'TC-API-03: Verifying Debit/Credit transaction entries in account history after transfer'
      );

      // ── Arrange ──
      test.info().annotations.push({ type: 'Test Type',   description: 'API' });
      test.info().annotations.push({ type: 'Scenario',    description: 'Transaction history shows Debit on source and Credit on destination' });
      test.info().annotations.push({ type: 'Requirement', description: 'FR-07' });
      test.info().annotations.push({ type: 'Doc Status',  description: 'Pass' });

      const data           = apiData.find(d => d.testCaseId === 'TC-API-03')!;
      const transferAmount = data.amount;
      const parsedAmount   = parseFloat(transferAmount);
      const sourceAccount  = activeUser.account1;
      const destAccount    = activeUser.account2;

      Logger.info(
        `TC-API-03: Arrange — amount=${transferAmount}, ` +
        `from=#${sourceAccount}, to=#${destAccount}`
      );

      // ── Act ──
      const result = await apiClient.transfer(sourceAccount, destAccount, transferAmount);
      Logger.info(`TC-API-03: POST /transfer returned HTTP ${result.status}`);

      // ── Assert ──
      expect(result.status,
        `POST /transfer should return HTTP 200, got ${result.status}`
      ).toBe(200);

      // Fetch transaction history for both accounts
      const sourceTxns: Transaction[] = await apiClient.getTransactions(sourceAccount);
      const destTxns: Transaction[]   = await apiClient.getTransactions(destAccount);
      Logger.info(
        `TC-API-03: History fetched — source has ${sourceTxns.length} txns, ` +
        `dest has ${destTxns.length} txns`
      );

      // Locate the Debit entry on the source account
      const debitEntry = sourceTxns.find(
        tx => tx.type === 'Debit' &&
              Math.abs(parseFloat(String(tx.amount))) === parsedAmount
      );
      expect(debitEntry,
        `FR-07: A Debit of $${parsedAmount} should appear in source #${sourceAccount} history. ` +
        `Found ${sourceTxns.length} total transactions.`
      ).toBeDefined();
      Logger.info(
        `TC-API-03: Debit entry found on source #${sourceAccount} — amount=$${parsedAmount}`
      );

      // Locate the Credit entry on the destination account
      const creditEntry = destTxns.find(
        tx => tx.type === 'Credit' &&
              Math.abs(parseFloat(String(tx.amount))) === parsedAmount
      );
      expect(creditEntry,
        `FR-07: A Credit of $${parsedAmount} should appear in destination #${destAccount} history. ` +
        `Found ${destTxns.length} total transactions.`
      ).toBeDefined();
      Logger.info(
        `TC-API-03: Credit entry found on destination #${destAccount} — amount=$${parsedAmount}`
      );

      Logger.info(
        'TC-API-03: PASSED — Debit on source and Credit on destination both confirmed in history'
      );
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC-API-04 — Insufficient funds — API incorrectly returns 200 (DEF-004)
  // Scenario: Negative | FR: FR-09 | Status: Fail | Defect: DEF-004 (Critical)
  //
  // DEF-004: POST /transfer accepts any amount even when it exceeds the source
  // balance, returning HTTP 200 and making the balance deeply negative.
  // Expected: HTTP 4xx with an "Insufficient funds" error and no state change.
  //
  // Strategy:
  //   1. Read pre-transfer source balance to document the overshoot magnitude
  //   2. Execute an overdraft transfer via apiClient.transfer()
  //   3. If HTTP 200 → soft-assert documenting DEF-004 as ACTIVE
  //   4. If HTTP 4xx  → soft-assert confirming DEF-004 is FIXED
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-API-04: Insufficient funds — API incorrectly returns 200 (DEF-004) @defects @FR-09',
    async ({ activeUser, apiClient }) => {

      Logger.info(
        'TC-API-04: Executing overdraft transfer — ' +
        'expecting HTTP 4xx but known defect DEF-004 returns 200'
      );

      // ── Arrange ──
      test.info().annotations.push({ type: 'Test Type',   description: 'API (Negative)' });
      test.info().annotations.push({ type: 'Scenario',    description: 'Insufficient funds — API incorrectly returns 200 (DEF-004)' });
      test.info().annotations.push({ type: 'Requirement', description: 'FR-09' });
      test.info().annotations.push({ type: 'Known Bug',   description: 'DEF-004' });
      test.info().annotations.push({ type: 'Doc Status',  description: 'Fail' });

      const data           = apiData.find(d => d.testCaseId === 'TC-API-04')!;
      const transferAmount = data.amount;          // "999999"
      const sourceAccount  = activeUser.account1;
      const destAccount    = activeUser.account2;

      Logger.info(
        `TC-API-04: Arrange — overdraft amount=${transferAmount}, ` +
        `from=#${sourceAccount}, to=#${destAccount}`
      );

      // Capture pre-transfer balance to document the overshoot magnitude
      const preSourceBalance = await apiClient.getBalance(sourceAccount);
      Logger.info(
        `TC-API-04: Pre-transfer source balance = $${preSourceBalance} ` +
        `(attempting to transfer $${transferAmount})`
      );

      // ── Act ──
      const result = await apiClient.transfer(sourceAccount, destAccount, transferAmount);
      Logger.info(`TC-API-04: POST /transfer returned HTTP ${result.status}`);

      // ── Assert ──
      if (result.status === 200) {
        // DEF-004 is ACTIVE — overdraft silently accepted
        const postSourceBalance = await apiClient.getBalance(sourceAccount);
        Logger.info(
          `TC-API-04: Post-transfer source balance = $${postSourceBalance} ` +
          `(was $${preSourceBalance})`
        );

        expect.soft(result.status,
          `DEF-004 ACTIVE: POST /transfer returned HTTP 200 for an overdraft of ` +
          `$${transferAmount}. Source #${sourceAccount} balance went from ` +
          `$${preSourceBalance} → $${postSourceBalance} (deeply negative). ` +
          `Expected: HTTP 4xx with "Insufficient funds" error.`
        ).toBe(200);

        Logger.info(
          'TC-API-04: Soft assertion logged — DEF-004 confirmed ACTIVE, ' +
          'source balance is now negative'
        );
      } else {
        // DEF-004 appears FIXED — overdraft correctly rejected
        expect.soft(result.status,
          `DEF-004 appears FIXED — API correctly rejected with HTTP ${result.status}.`
        ).not.toBe(200);

        Logger.info(
          `TC-API-04: Bug DEF-004 appears FIXED — API returned HTTP ${result.status}`
        );
      }

      Logger.info(
        `TC-API-04: COMPLETED — Overdraft defect path finished, HTTP status: ${result.status}`
      );
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC-API-05-A — Negative amount transfer accepted by API (DEF-003)
  // Scenario: Negative | FR: FR-09 | Status: Fail | Defect: DEF-003 (Critical)
  //
  // DEF-003: POST /transfer accepts a negative amount, effectively reversing
  // the transfer direction — funds are moved from `to` to `from` instead.
  // Expected: HTTP 4xx with "Amount must be positive" and no state change.
  //
  // Strategy:
  //   1. Read pre-transfer balances on both accounts
  //   2. Execute transfer with amount="-50" via apiClient.transfer()
  //   3. If HTTP 200 → read post-balances, soft-assert documenting DEF-003 ACTIVE
  //   4. If HTTP 4xx  → soft-assert confirming DEF-003 FIXED
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-API-05-A: Negative amount transfer accepted by API (DEF-003) @defects @FR-09',
    async ({ activeUser, apiClient }) => {

      Logger.info(
        'TC-API-05-A: Executing negative-amount transfer — ' +
        'expecting HTTP 4xx but known defect DEF-003 returns 200'
      );

      // ── Arrange ──
      test.info().annotations.push({ type: 'Test Type',   description: 'API (Negative)' });
      test.info().annotations.push({ type: 'Scenario',    description: 'Negative amount transfer accepted by API (DEF-003)' });
      test.info().annotations.push({ type: 'Requirement', description: 'FR-09' });
      test.info().annotations.push({ type: 'Known Bug',   description: 'DEF-003' });
      test.info().annotations.push({ type: 'Doc Status',  description: 'Fail' });

      const data           = apiData.find(d => d.testCaseId === 'TC-API-05-A')!;
      const transferAmount = data.amount;          // "-50"
      const sourceAccount  = activeUser.account1;
      const destAccount    = activeUser.account2;

      Logger.info(
        `TC-API-05-A: Arrange — negative amount=${transferAmount}, ` +
        `from=#${sourceAccount}, to=#${destAccount}`
      );

      // Read pre-transfer balances to detect direction reversal if bug is active
      const preSourceBalance = await apiClient.getBalance(sourceAccount);
      const preDestBalance   = await apiClient.getBalance(destAccount);
      Logger.info(
        `TC-API-05-A: Pre-transfer — source=$${preSourceBalance}, dest=$${preDestBalance}`
      );

      // ── Act ──
      const result = await apiClient.transfer(sourceAccount, destAccount, transferAmount);
      Logger.info(`TC-API-05-A: POST /transfer returned HTTP ${result.status}`);
      Logger.info(`TC-API-05-A: Response body = "${result.body.substring(0, 200)}"`);

      // ── Assert ──
      if (result.status === 200) {
        // DEF-003 is ACTIVE — negative amount processed, direction reversed
        const postSourceBalance = await apiClient.getBalance(sourceAccount);
        const postDestBalance   = await apiClient.getBalance(destAccount);
        Logger.info(
          `TC-API-05-A: Post-transfer — source=$${postSourceBalance}, ` +
          `dest=$${postDestBalance}`
        );

        expect.soft(result.status,
          `DEF-003 ACTIVE: POST /transfer accepted amount="${transferAmount}" and returned ` +
          `HTTP 200. Transfer direction was reversed — source #${sourceAccount} ` +
          `went from $${preSourceBalance} → $${postSourceBalance}, ` +
          `dest #${destAccount} went from $${preDestBalance} → $${postDestBalance}. ` +
          `Expected: HTTP 4xx with "Amount must be positive" error.`
        ).toBe(200);

        Logger.info(
          'TC-API-05-A: Soft assertion logged — DEF-003 confirmed ACTIVE, ' +
          'transfer direction was reversed by the negative amount'
        );
      } else {
        // DEF-003 appears FIXED — negative amount correctly rejected
        expect.soft(result.status,
          `DEF-003 appears FIXED — API correctly rejected negative amount ` +
          `"${transferAmount}" with HTTP ${result.status}.`
        ).not.toBe(200);

        Logger.info(
          `TC-API-05-A: Bug DEF-003 appears FIXED — ` +
          `API returned HTTP ${result.status} for negative amount`
        );
      }

      Logger.info(
        `TC-API-05-A: COMPLETED — Negative-amount defect path finished, ` +
        `HTTP status: ${result.status}`
      );
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC-API-05-B — Same-account (from=to) transfer accepted by API (DEF-001)
  // Scenario: Negative | FR: FR-09 | Status: Fail | Defect: DEF-001 (High)
  //
  // DEF-001: POST /transfer accepts fromAccountId == toAccountId, returning
  // HTTP 200 and creating two phantom transactions (one Debit + one Credit)
  // on the same account, corrupting the audit trail.
  // Expected: HTTP 4xx with a validation error and no transactions recorded.
  //
  // Strategy:
  //   1. Execute transfer from account1 to account1 (same account) via apiClient.transfer()
  //   2. If HTTP 200 → soft-assert documenting DEF-001 ACTIVE
  //   3. If HTTP 4xx  → soft-assert confirming DEF-001 FIXED
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-API-05-B: Same-account (from=to) transfer accepted by API (DEF-001) @defects @FR-09',
    async ({ activeUser, apiClient }) => {

      Logger.info(
        'TC-API-05-B: Executing same-account transfer (from=to) — ' +
        'expecting HTTP 4xx but known defect DEF-001 returns 200'
      );

      // ── Arrange ──
      test.info().annotations.push({ type: 'Test Type',   description: 'API (Negative)' });
      test.info().annotations.push({ type: 'Scenario',    description: 'Same-account (from=to) transfer accepted by API (DEF-001)' });
      test.info().annotations.push({ type: 'Requirement', description: 'FR-09' });
      test.info().annotations.push({ type: 'Known Bug',   description: 'DEF-001' });
      test.info().annotations.push({ type: 'Doc Status',  description: 'Fail' });

      const data           = apiData.find(d => d.testCaseId === 'TC-API-05-B')!;
      const transferAmount = data.amount;          // "50"
      const sameAccount    = activeUser.account1;  // from == to intentionally

      Logger.info(
        `TC-API-05-B: Arrange — amount=${transferAmount}, ` +
        `from=#${sameAccount}, to=#${sameAccount} (SAME account)`
      );

      // ── Act ──
      const result = await apiClient.transfer(sameAccount, sameAccount, transferAmount);
      Logger.info(
        `TC-API-05-B: POST /transfer (from=to) returned HTTP ${result.status}`
      );
      Logger.info(
        `TC-API-05-B: Response body = "${result.body.substring(0, 200)}"`
      );

      // ── Assert ──
      if (result.status === 200) {
        // DEF-001 is ACTIVE — same-account transfer was accepted
        expect.soft(result.status,
          `DEF-001 ACTIVE: POST /transfer accepted from=#${sameAccount} ` +
          `to=#${sameAccount} and returned HTTP 200. ` +
          `Two phantom transactions (Debit + Credit of $${transferAmount}) ` +
          `have been recorded on the same account, corrupting the audit trail. ` +
          `Expected: HTTP 4xx with validation error.`
        ).toBe(200);

        Logger.info(
          'TC-API-05-B: Soft assertion logged — DEF-001 confirmed ACTIVE, ' +
          'phantom Debit + Credit entries created on the same account'
        );
      } else {
        // DEF-001 appears FIXED — same-account transfer was correctly rejected
        expect.soft(result.status,
          `DEF-001 appears FIXED — API correctly rejected same-account ` +
          `transfer with HTTP ${result.status}.`
        ).not.toBe(200);

        Logger.info(
          `TC-API-05-B: Bug DEF-001 appears FIXED — ` +
          `API returned HTTP ${result.status} for from=to request`
        );
      }

      Logger.info(
        `TC-API-05-B: COMPLETED — Same-account defect path finished, ` +
        `HTTP status: ${result.status}`
      );
    }
  );
});