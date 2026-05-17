/**
 * API Fixture — extends base-fixture.ts
 *
 * Provides an `apiClient` fixture that wraps page.request so every API call
 * automatically inherits the JSESSIONID cookie established during UI
 * registration. All five API test cases import from this fixture instead of
 * base-fixture, giving them access to both the high-level API client and all
 * UI page objects (transferPage, registerPage, etc.).
 *
 * Architectural decisions:
 *  1. Extends base-fixture rather than replacing it — activeUser, transferPage
 *     and all other base fixtures remain available in every API spec.
 *  2. page.request is used as the underlying context so JSESSIONID propagates
 *     automatically without manual cookie management.
 *  3. withRetry absorbs transient ParaBank 500 errors without masking real
 *     failures — maximum two attempts, 800 ms back-off.
 *  4. transfer() never throws — it returns a TransferResult so defect tests
 *     (TC-API-007, TC-API-008) can inspect status codes without try/catch.
 *  5. All other methods throw on non-200 to catch infrastructure problems early.
 *
 * Usage in specs:
 *   import { test, expect } from '../../fixtures/api-fixture';
 *   test('...', async ({ apiClient, activeUser }) => {
 *     const balance = await apiClient.getBalance(activeUser.account1);
 *   });
 */
import { test as baseTest, expect } from './baseFixture';
import { APIRequestContext, APIResponse } from '@playwright/test';
import { ApiLogger, Logger } from '../utils/logger';

// ─── Public types re-exported so specs can type-annotate without extra imports ─

export interface Transaction {
  id: number;
  accountId: number;
  type: 'Debit' | 'Credit';
  amount: number | string;
  description?: string;
  date?: string;
}

export interface TransferResult {
  /** Raw HTTP status returned by POST /transfer */
  status: number;
  /** Full response body text */
  body: string;
  /** Convenience flag: true when status === 200 */
  ok: boolean;
}

export interface Account {
  id: number;
  customerId?: number;
  type?: string;
  balance: number;
}

/**
 * High-level API client. Methods that must succeed (balance reads, transaction
 * history) throw on non-200 to surface infrastructure problems immediately.
 * The transfer() method never throws — callers inspect TransferResult directly.
 */
export interface ApiClient {
  /**
   * GET /accounts/{accountId}
   * Returns the account balance as a plain number. Throws if HTTP ≠ 200.
   */
  getBalance(accountId: string): Promise<number>;

  /**
   * GET /accounts/{accountId}/transactions
   * Returns the full transaction array. Throws if HTTP ≠ 200.
   */
  getTransactions(accountId: string): Promise<Transaction[]>;

  /**
   * POST /transfer?fromAccountId=…&toAccountId=…&amount=…
   * Never throws. Returns { status, body, ok } so defect tests can assert
   * on unexpected 200s without wrapping in try/catch.
   */
  transfer(from: string, to: string, amount: string): Promise<TransferResult>;

  /**
   * GET /accounts/{accountId}
   * Returns the full account object (id, type, balance, …). Throws if HTTP ≠ 200.
   */
  getAccount(accountId: string): Promise<Account>;

  /** Escape hatch — direct access to the underlying Playwright request context. */
  readonly raw: APIRequestContext;
}

// ─── Internal helper ───────────────────────────────────────────────────────────

/**
 * Wraps a single API call with a retry on transient 5xx errors.
 * ParaBank occasionally returns HTTP 500 under parallel load; one retry
 * with an 800 ms back-off clears it in practice.
 *
 * Genuine 4xx responses pass through immediately — they are not transient.
 */
async function withRetry(
  fn: () => Promise<APIResponse>,
  label: string,
  maxAttempts = 2
): Promise<APIResponse> {
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fn();

      if (res.status() >= 500 && attempt < maxAttempts) {
        Logger.warn(
          `apiClient: ${label} returned HTTP ${res.status()} — ` +
          `transient 5xx, retry ${attempt}/${maxAttempts}`
        );
        await new Promise(r => setTimeout(r, 800 * attempt));
        continue;
      }

      return res;
    } catch (err) {
      lastErr = err as Error;
      if (attempt < maxAttempts) {
        Logger.warn(
          `apiClient: ${label} threw "${lastErr.message}" — ` +
          `retry ${attempt}/${maxAttempts}`
        );
        await new Promise(r => setTimeout(r, 800 * attempt));
      }
    }
  }

  throw lastErr ?? new Error(`apiClient: ${label} failed after ${maxAttempts} attempts`);
}

// ─── Fixture extension ─────────────────────────────────────────────────────────

type ApiFixtures = {
  apiClient: ApiClient;
};

export const test = baseTest.extend<ApiFixtures>({

  /**
   * Builds and injects the ApiClient for the duration of one test.
   *
   * The client uses page.request as its underlying context — this is the same
   * context that holds the JSESSIONID cookie set during base-fixture's UI
   * registration flow, so every API call is automatically authenticated.
   */
  apiClient: async ({ page }, use) => {
    const ctx: APIRequestContext = page.request;

    const client: ApiClient = {

      raw: ctx,

      // ── GET /accounts/{id} ── balance only ──────────────────────────────
      async getBalance(accountId: string): Promise<number> {
        const res = await withRetry(
          () => ctx.get(`/parabank/services/bank/accounts/${accountId}`, {
            headers: { Accept: 'application/json' }
          }),
          `GET /accounts/${accountId}`
        );

        if (res.status() !== 200) {
          throw new Error(
            `apiClient.getBalance(${accountId}) received HTTP ${res.status()}`
          );
        }

        const data = await res.json();
        const balance = parseFloat(data.balance);
        ApiLogger.info({ op: 'getBalance', accountId, balance });
        return balance;
      },

      // ── GET /accounts/{id}/transactions ─────────────────────────────────
      async getTransactions(accountId: string): Promise<Transaction[]> {
        const res = await withRetry(
          () => ctx.get(`/parabank/services/bank/accounts/${accountId}/transactions`, {
            headers: { Accept: 'application/json' }
          }),
          `GET /accounts/${accountId}/transactions`
        );

        if (res.status() !== 200) {
          throw new Error(
            `apiClient.getTransactions(${accountId}) received HTTP ${res.status()}`
          );
        }

        const txns: Transaction[] = await res.json();
        ApiLogger.info({ op: 'getTransactions', accountId, count: txns.length });
        return txns;
      },

      // ── POST /transfer ───────────────────────────────────────────────────
      async transfer(from: string, to: string, amount: string): Promise<TransferResult> {
        const res = await withRetry(
          () => ctx.post(`/parabank/services/bank/transfer`, {
            params: { fromAccountId: from, toAccountId: to, amount },
            headers: { Accept: 'application/json' }
          }),
          `POST /transfer from=${from} to=${to} amount=${amount}`
        );

        const body = await res.text();
        const result: TransferResult = {
          status: res.status(),
          body,
          ok: res.status() === 200
        };

        ApiLogger.info({
          op: 'transfer',
          from,
          to,
          amount,
          status: result.status,
          ok: result.ok,
          bodySnippet: body.substring(0, 300)
        });

        return result;
      },

      // ── GET /accounts/{id} ── full object ────────────────────────────────
      async getAccount(accountId: string): Promise<Account> {
        const res = await withRetry(
          () => ctx.get(`/parabank/services/bank/accounts/${accountId}`, {
            headers: { Accept: 'application/json' }
          }),
          `GET /accounts/${accountId} (full object)`
        );

        if (res.status() !== 200) {
          throw new Error(
            `apiClient.getAccount(${accountId}) received HTTP ${res.status()}`
          );
        }

        const account: Account = await res.json();
        ApiLogger.info({ op: 'getAccount', accountId, balance: account.balance });
        return account;
      }
    };

    await use(client);
  }
});

export { expect };