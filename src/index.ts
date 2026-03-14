#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getAuthenticatedClient, authenticate } from './auth.js';
import { AdSenseClient } from './client.js';
import { generateSnippet, type Framework, type AdStyle } from './snippets.js';

// --- CLI: handle "auth" subcommand ---

const args = process.argv.slice(2);

if (args[0] === 'auth') {
  try {
    await authenticate(args[1]);
    process.exit(0);
  } catch (err: any) {
    console.error('Authentication failed:', err.message);
    process.exit(1);
  }
}

// --- MCP Server ---

const server = new McpServer({
  name: 'adsense',
  version: '0.1.0',
});

let client: AdSenseClient | null = null;

async function getClient(): Promise<AdSenseClient> {
  if (!client) {
    const auth = await getAuthenticatedClient();
    client = new AdSenseClient(auth);
  }
  return client;
}

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

// --- Tool: list_accounts ---

server.tool(
  'list_accounts',
  'List all AdSense accounts associated with your Google account',
  {},
  async () => {
    try {
      const c = await getClient();
      const result = await c.listAccounts();
      return ok(result.accounts || []);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: list_ad_clients ---

server.tool(
  'list_ad_clients',
  'List ad clients (publisher IDs) for an account',
  {
    account: z.string().optional().describe('Account name (e.g., accounts/pub-XXX). Auto-detected if omitted.'),
  },
  async ({ account }) => {
    try {
      const c = await getClient();
      const result = await c.listAdClients(account);
      return ok(result.adClients || []);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: list_ad_units ---

server.tool(
  'list_ad_units',
  'List all ad units. Returns name, displayName, state, type, and size for each unit.',
  {
    adClient: z.string().optional().describe('Ad client name. Auto-detected if omitted.'),
  },
  async ({ adClient }) => {
    try {
      const c = await getClient();
      const result = await c.listAdUnits(adClient);
      return ok(result.adUnits || []);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: create_ad_unit ---

server.tool(
  'create_ad_unit',
  'Create a new ad unit. Returns the created unit with its name and slot ID.',
  {
    displayName: z.string().describe('Display name for the new ad unit (e.g., "Homepage Banner")'),
    type: z.enum(['DISPLAY', 'IN_FEED', 'IN_ARTICLE', 'MATCHED_CONTENT'])
      .default('DISPLAY')
      .describe('Ad format type'),
    adClient: z.string().optional().describe('Ad client name. Auto-detected if omitted.'),
  },
  async ({ displayName, type, adClient }) => {
    try {
      const c = await getClient();
      const unit = await c.createAdUnit(displayName, type, adClient);
      return ok({
        ...unit,
        _hint: `Use get_ad_code with adUnit="${unit.name}" to get the embed code.`,
      });
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: get_ad_code ---

server.tool(
  'get_ad_code',
  'Get the HTML/JS ad code snippet for an ad unit, ready to paste into your website',
  {
    adUnit: z.string().describe('Full ad unit name (e.g., accounts/pub-XXX/adclients/ca-pub-XXX/adunits/123)'),
  },
  async ({ adUnit }) => {
    try {
      const c = await getClient();
      const result = await c.getAdCode(adUnit);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: list_sites ---

server.tool(
  'list_sites',
  'List all sites in your AdSense account with their approval status and auto-ads setting',
  {
    account: z.string().optional().describe('Account name. Auto-detected if omitted.'),
  },
  async ({ account }) => {
    try {
      const c = await getClient();
      const result = await c.listSites(account);
      return ok(result.sites || []);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: generate_report ---

server.tool(
  'generate_report',
  'Generate an AdSense earnings report with customizable date range, metrics, and dimensions',
  {
    dateRange: z.enum([
      'TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS',
      'MONTH_TO_DATE', 'YEAR_TO_DATE', 'LAST_3_MONTHS', 'LAST_12_MONTHS',
    ]).default('LAST_7_DAYS').describe('Date range for the report'),
    metrics: z.array(z.string()).default(['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'CLICKS', 'PAGE_VIEWS_CTR'])
      .describe('Metrics to include (e.g., ESTIMATED_EARNINGS, IMPRESSIONS, CLICKS, PAGE_VIEWS_CTR, COST_PER_CLICK)'),
    dimensions: z.array(z.string()).default(['DATE'])
      .describe('Dimensions to group by (e.g., DATE, SITE_DOMAIN, AD_UNIT_NAME, COUNTRY_NAME)'),
    account: z.string().optional().describe('Account name. Auto-detected if omitted.'),
  },
  async ({ dateRange, metrics, dimensions, account }) => {
    try {
      const c = await getClient();
      const result = await c.generateReport({ dateRange, metrics, dimensions, account });
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: list_alerts ---

server.tool(
  'list_alerts',
  'List AdSense alerts and policy issues that need attention',
  {
    account: z.string().optional().describe('Account name. Auto-detected if omitted.'),
  },
  async ({ account }) => {
    try {
      const c = await getClient();
      const result = await c.listAlerts(account);
      return ok(result.alerts || []);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: list_payments ---

server.tool(
  'list_payments',
  'List payment history for your AdSense account',
  {
    account: z.string().optional().describe('Account name. Auto-detected if omitted.'),
  },
  async ({ account }) => {
    try {
      const c = await getClient();
      const result = await c.listPayments(account);
      return ok(result.payments || []);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: generate_ads_txt ---

server.tool(
  'generate_ads_txt',
  'Generate ads.txt content for your site. Place this file at your domain root (e.g., example.com/ads.txt).',
  {
    account: z.string().optional().describe('Account name. Auto-detected if omitted.'),
  },
  async ({ account }) => {
    try {
      const c = await getClient();
      const adClientName = await c.resolveAdClient();
      const publisherId = c.getPublisherId(adClientName);

      if (!publisherId) {
        return err('Could not determine publisher ID from ad client.');
      }

      const adsTxt = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;

      return ok({
        content: adsTxt,
        instructions: [
          'Save this as "ads.txt" in your website root directory.',
          `Verify it is accessible at https://yourdomain.com/ads.txt`,
          'For static site generators, place it in the public/ or static/ folder.',
          'It may take up to 24 hours for Google to crawl and verify your ads.txt.',
        ],
      });
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: verify_ads_txt ---

server.tool(
  'verify_ads_txt',
  'Check if ads.txt is correctly set up on a domain by fetching and verifying its contents',
  {
    domain: z.string().describe('Domain to check (e.g., example.com)'),
    account: z.string().optional().describe('Account name. Auto-detected if omitted.'),
  },
  async ({ domain, account }) => {
    try {
      const c = await getClient();
      const adClientName = await c.resolveAdClient();
      const publisherId = c.getPublisherId(adClientName);

      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const url = `https://${cleanDomain}/ads.txt`;

      let adsTxtContent: string;
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'AdSense-MCP-Verifier/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          return ok({
            domain: cleanDomain,
            status: 'NOT_FOUND',
            message: `ads.txt returned HTTP ${response.status}. Make sure the file exists at ${url}`,
          });
        }
        adsTxtContent = await response.text();
      } catch (fetchErr: any) {
        return ok({
          domain: cleanDomain,
          status: 'ERROR',
          message: `Could not fetch ${url}: ${fetchErr.message}`,
        });
      }

      const expectedEntry = `google.com, ${publisherId}, DIRECT`;
      const hasEntry = adsTxtContent.toLowerCase().includes(expectedEntry.toLowerCase());

      return ok({
        domain: cleanDomain,
        url,
        status: hasEntry ? 'VALID' : 'MISSING_ENTRY',
        hasGoogleEntry: hasEntry,
        expectedEntry: `${expectedEntry}, f08c47fec0942fa0`,
        adsTxtPreview: adsTxtContent.slice(0, 1000),
        ...(hasEntry ? {} : {
          action: 'Add the following line to your ads.txt:\n' +
            `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`,
        }),
      });
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Tool: get_ad_snippet ---

server.tool(
  'get_ad_snippet',
  'Generate framework-specific ad integration code (React, Next.js, Vue, Astro, Svelte, etc.)',
  {
    framework: z.enum(['html', 'react', 'nextjs', 'vue', 'nuxt', 'astro', 'svelte'])
      .describe('Target framework'),
    publisherId: z.string().describe('Publisher ID (e.g., ca-pub-1234567890123456)'),
    slotId: z.string().describe('Ad unit slot ID (e.g., 1234567890)'),
    style: z.enum(['responsive', 'in-article', 'in-feed', 'fixed'])
      .default('responsive')
      .describe('Ad placement style'),
    width: z.number().optional().describe('Width in px (only for "fixed" style)'),
    height: z.number().optional().describe('Height in px (only for "fixed" style)'),
  },
  async ({ framework, publisherId, slotId, style, width, height }) => {
    try {
      const code = generateSnippet({
        framework: framework as Framework,
        publisherId,
        slotId,
        style: style as AdStyle,
        width,
        height,
      });
      return { content: [{ type: 'text' as const, text: code }] };
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Start server ---

const transport = new StdioServerTransport();
await server.connect(transport);
