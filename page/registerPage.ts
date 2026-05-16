import { Page, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export interface RegistrationData {
  firstName?: string;
  lastName?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phoneNumber?: string;
  ssn?: string;
  username: string;
  password: string;
}

export class RegisterPage {
  constructor(public readonly page: Page) {}

  async navigate(): Promise<void> {
    Logger.info('RegisterPage: Navigating to /parabank/register.htm');
    await this.page.goto('/parabank/register.htm');
  }
  async registerDynamicUser(data: RegistrationData): Promise<void> {
    const filled: Required<RegistrationData> = {
      firstName: data.firstName ?? 'Ushosi',
      lastName: data.lastName ?? 'Pal',
      street: data.street ?? 'Haldia',
      city: data.city ?? 'Haldia',
      state: data.state ?? 'TS',
      zipCode: data.zipCode ?? '721602',
      phoneNumber: data.phoneNumber ?? '555-0199',
      ssn: data.ssn ?? `SSN-12345789`,
      username: data.username,
      password: data.password
    };

    Logger.info(`RegisterPage: Submitting registration for username=${filled.username}`);

  
    await this.page.locator('input[id="customer.firstName"]').fill(filled.firstName);
    await this.page.locator('input[id="customer.lastName"]').fill(filled.lastName);
    await this.page.locator('input[id="customer.address.street"]').fill(filled.street);
    await this.page.locator('input[id="customer.address.city"]').fill(filled.city);
    await this.page.locator('input[id="customer.address.state"]').fill(filled.state);
    await this.page.locator('input[id="customer.address.zipCode"]').fill(filled.zipCode);
    await this.page.locator('input[id="customer.phoneNumber"]').fill(filled.phoneNumber);
    await this.page.locator('input[id="customer.ssn"]').fill(filled.ssn);
    await this.page.locator('input[id="customer.username"]').fill(filled.username);

    await this.page.locator('input[id="customer.password"]').fill(filled.password);
    await this.page.locator('input[id="repeatedPassword"]').fill(filled.password);

  
    await this.page.getByRole('button', { name: 'Register' }).click();
  }
  
  async verifyRegistrationSuccess(): Promise<void> {
    await expect(this.page.locator('.title'), 'Registration should land on Welcome page')
      .toContainText('Welcome', { timeout: 15000 });
    Logger.info('RegisterPage: Registration successful (Welcome page detected)');
  }
}