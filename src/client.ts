import { OAuth2Client } from 'google-auth-library';

const BASE_URL = 'https://adsense.googleapis.com/v2';

export interface Account {
  name: string;
  displayName: string;
  state: string;
  premium: boolean;
  timeZone: { id: string };
  createTime: string;
}

export interface AdClient {
  name: string;
  productCode: string;
  reportingDimensionId: string;
  state: string;
}

export interface AdUnit {
  name: string;
  reportingDimensionId: string;
  displayName: string;
  state: string;
  contentAdsSettings: {
    type: string;
    size: string;
  };
}

export interface Site {
  name: string;
  domain: string;
  state: string;
  autoAdsEnabled: boolean;
}

export class AdSenseClient {
  private cachedAccount: string | null = null;
  private cachedAdClient: string | null = null;

  constructor(private auth: OAuth2Client) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const { token } = await this.auth.getAccessToken();
    if (!token) throw new Error('Failed to get access token. Try re-authenticating with "adsense-mcp auth".');

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = (body as any)?.error?.message || `HTTP ${response.status}`;
      throw new Error(`AdSense API error: ${message}`);
    }

    return response.json() as Promise<T>;
  }

  // --- Account resolution ---

  async resolveAccount(account?: string): Promise<string> {
    if (account) return account;
    if (this.cachedAccount) return this.cachedAccount;

    const { accounts } = await this.listAccounts();
    if (!accounts?.length) throw new Error('No AdSense accounts found.');
    this.cachedAccount = accounts[0].name;
    return this.cachedAccount;
  }

  async resolveAdClient(adClient?: string): Promise<string> {
    if (adClient) return adClient;
    if (this.cachedAdClient) return this.cachedAdClient;

    const account = await this.resolveAccount();
    const { adClients } = await this.listAdClients(account);
    if (!adClients?.length) throw new Error('No ad clients found.');
    this.cachedAdClient = adClients[0].name;
    return this.cachedAdClient;
  }

  getPublisherId(adClientName: string): string {
    // adclient name: accounts/pub-XXX/adclients/ca-pub-XXX
    const match = adClientName.match(/adclients\/(ca-pub-\d+)/);
    return match ? match[1] : '';
  }

  // --- Accounts ---

  async listAccounts(): Promise<{ accounts: Account[] }> {
    return this.request('/accounts');
  }

  // --- Ad Clients ---

  async listAdClients(account?: string): Promise<{ adClients: AdClient[] }> {
    const acc = await this.resolveAccount(account);
    return this.request(`/${acc}/adclients`);
  }

  // --- Ad Units ---

  async listAdUnits(adClient?: string): Promise<{ adUnits: AdUnit[] }> {
    const ac = await this.resolveAdClient(adClient);
    return this.request(`/${ac}/adunits`);
  }

  async createAdUnit(
    displayName: string,
    type: string = 'DISPLAY',
    adClient?: string
  ): Promise<AdUnit> {
    const ac = await this.resolveAdClient(adClient);
    return this.request(`/${ac}/adunits`, {
      method: 'POST',
      body: JSON.stringify({
        displayName,
        contentAdsSettings: {
          type,
          size: 'RESPONSIVE',
        },
      }),
    });
  }

  async getAdCode(adUnitName: string): Promise<{ adCode: string }> {
    return this.request(`/${adUnitName}/adcode`);
  }

  async patchAdUnit(
    adUnitName: string,
    updates: { displayName?: string; contentAdsSettings?: { type?: string; size?: string } }
  ): Promise<AdUnit> {
    const fields: string[] = [];
    if (updates.displayName) fields.push('displayName');
    if (updates.contentAdsSettings) fields.push('contentAdsSettings');

    return this.request(`/${adUnitName}?updateMask=${fields.join(',')}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // --- Sites ---

  async listSites(account?: string): Promise<{ sites: Site[] }> {
    const acc = await this.resolveAccount(account);
    return this.request(`/${acc}/sites`);
  }

  // --- Reports ---

  async generateReport(options: {
    dateRange?: string;
    metrics?: string[];
    dimensions?: string[];
    account?: string;
  }): Promise<any> {
    const acc = await this.resolveAccount(options.account);
    const params = new URLSearchParams();

    params.set('dateRange', options.dateRange || 'LAST_7_DAYS');

    for (const m of options.metrics || ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'CLICKS', 'PAGE_VIEWS_CTR']) {
      params.append('metrics', m);
    }
    for (const d of options.dimensions || ['DATE']) {
      params.append('dimensions', d);
    }

    return this.request(`/${acc}/reports:generate?${params.toString()}`);
  }

  // --- Alerts ---

  async listAlerts(account?: string): Promise<{ alerts: any[] }> {
    const acc = await this.resolveAccount(account);
    return this.request(`/${acc}/alerts`);
  }

  // --- Payments ---

  async listPayments(account?: string): Promise<{ payments: any[] }> {
    const acc = await this.resolveAccount(account);
    return this.request(`/${acc}/payments`);
  }
}
