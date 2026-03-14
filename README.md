# adsense-mcp

MCP (Model Context Protocol) server for Google AdSense management. Create ad units, generate framework-specific ad code, manage earnings reports, and automate ads.txt — all from your AI assistant.

Built for solo developers who build websites with AI agents and want to monetize them without leaving the terminal.

## Features

- **Ad Unit CRUD** — Create and manage ad units via AdSense Management API v2
- **Ad Code Retrieval** — Get ready-to-paste HTML/JS embed code for any ad unit
- **Framework Snippets** — Generate ad integration code for React, Next.js, Vue, Nuxt, Astro, Svelte
- **ads.txt Automation** — Generate and remotely verify ads.txt for your domains
- **Earnings Reports** — Query revenue, page views, clicks with flexible date ranges and dimensions
- **Alerts & Payments** — Monitor policy issues and payment history
- **Auto-detection** — Automatically resolves your account and ad client, so most parameters are optional
- **Lightweight** — Uses direct REST calls instead of the heavy `googleapis` package

## Prerequisites

1. **Active Google AdSense account** (already approved)
2. **Node.js 18+**
3. **Google Cloud OAuth credentials** (see [Setup](#setup) below)

## Setup

### 1. Create Google Cloud OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **AdSense Management API**:
   - Navigate to **APIs & Services > Library**
   - Search for "AdSense Management API"
   - Click **Enable**
4. Create OAuth credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Choose **Desktop app** as the application type
   - Download the JSON file
5. Configure the OAuth consent screen:
   - Go to **APIs & Services > OAuth consent screen**
   - Keep the publishing status as **Testing**
   - Add your Google account as a **Test user**

> **Note**: While in "Testing" mode, only test users you add can authenticate. This is fine for personal use — no Google review required.

### 2. Install

```bash
npm install -g adsense-mcp
```

### 3. Authenticate

```bash
adsense-mcp auth /path/to/downloaded-credentials.json
```

This will:
- Save your OAuth credentials to `~/.adsense-mcp/credentials.json`
- Open your browser for Google OAuth consent
- Save access/refresh tokens to `~/.adsense-mcp/tokens.json`

You only need to do this once. Tokens auto-refresh on subsequent use.

### 4. Configure Your AI Tool

#### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "adsense": {
      "command": "npx",
      "args": ["-y", "adsense-mcp"]
    }
  }
}
```

Or add globally in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "adsense": {
      "command": "npx",
      "args": ["-y", "adsense-mcp"]
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "adsense": {
      "command": "npx",
      "args": ["-y", "adsense-mcp"]
    }
  }
}
```

#### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "adsense": {
      "command": "npx",
      "args": ["-y", "adsense-mcp"]
    }
  }
}
```

## Tools Reference

### Account & Configuration

#### `list_accounts`

List all AdSense accounts linked to your Google account.

```
Parameters: (none)
```

**Example prompt**: "Show me my AdSense accounts"

---

#### `list_ad_clients`

List ad clients (publisher IDs like `ca-pub-XXXX`) for an account.

```
Parameters:
  account  (optional)  Account name. Auto-detected if omitted.
```

**Example prompt**: "What's my AdSense publisher ID?"

---

#### `list_sites`

List all sites with their approval status and auto-ads setting.

```
Parameters:
  account  (optional)  Account name. Auto-detected if omitted.
```

**Example prompt**: "Which sites are approved in my AdSense?"

---

### Ad Unit Management

#### `create_ad_unit`

Create a new ad unit. Returns the unit name, slot ID, and state.

```
Parameters:
  displayName  (required)  Human-readable name (e.g., "Homepage Banner")
  type         (optional)  DISPLAY | IN_FEED | IN_ARTICLE | MATCHED_CONTENT (default: DISPLAY)
  adClient     (optional)  Ad client name. Auto-detected if omitted.
```

**Example prompt**: "Create a display ad unit called 'Sidebar Ad' for my blog"

---

#### `list_ad_units`

List all ad units with their name, display name, state, type, and size.

```
Parameters:
  adClient  (optional)  Ad client name. Auto-detected if omitted.
```

**Example prompt**: "List all my ad units"

---

#### `get_ad_code`

Get the raw HTML/JS ad code for a specific ad unit, as provided by Google.

```
Parameters:
  adUnit  (required)  Full ad unit name (e.g., accounts/pub-XXX/adclients/ca-pub-XXX/adunits/123)
```

**Example prompt**: "Get the embed code for my sidebar ad unit"

---

#### `get_ad_snippet`

Generate framework-specific ad component code, ready to drop into your project.

```
Parameters:
  framework    (required)  html | react | nextjs | vue | nuxt | astro | svelte
  publisherId  (required)  Publisher ID (e.g., ca-pub-1234567890123456)
  slotId       (required)  Ad unit slot ID (e.g., 1234567890)
  style        (optional)  responsive | in-article | in-feed | fixed (default: responsive)
  width        (optional)  Width in px (only for "fixed" style)
  height       (optional)  Height in px (only for "fixed" style)
```

**Example prompt**: "Generate a Next.js component for my ad unit slot 9876543210"

Supported frameworks and what gets generated:

| Framework | Output |
|-----------|--------|
| `html` | Standard `<ins>` tag with inline script |
| `react` | `AdUnit` component with `useEffect` push |
| `nextjs` | Layout with `next/script` + `AdUnit` component |
| `vue` | SFC with `onMounted` push |
| `nuxt` | `nuxt.config.ts` head config + Vue SFC |
| `astro` | `.astro` component with `is:inline` script |
| `svelte` | Component with `onMount` push |

---

### ads.txt

#### `generate_ads_txt`

Generate the correct `ads.txt` content for your AdSense account.

```
Parameters:
  account  (optional)  Account name. Auto-detected if omitted.
```

**Example prompt**: "Generate ads.txt for my site"

Returns the entry line and instructions for where to place the file in various project types.

---

#### `verify_ads_txt`

Fetch a domain's `/ads.txt` and check if it contains your publisher entry.

```
Parameters:
  domain   (required)  Domain to check (e.g., example.com)
  account  (optional)  Account name. Auto-detected if omitted.
```

**Example prompt**: "Check if ads.txt is set up correctly on myblog.com"

---

### Analytics

#### `generate_report`

Generate an earnings report with customizable date range, metrics, and dimensions.

```
Parameters:
  dateRange   (optional)  TODAY | YESTERDAY | LAST_7_DAYS | LAST_30_DAYS |
                          MONTH_TO_DATE | YEAR_TO_DATE | LAST_3_MONTHS | LAST_12_MONTHS
                          (default: LAST_7_DAYS)
  metrics     (optional)  Array of metrics (default: [ESTIMATED_EARNINGS, PAGE_VIEWS, CLICKS, PAGE_VIEWS_CTR])
  dimensions  (optional)  Array of dimensions (default: [DATE])
  account     (optional)  Account name. Auto-detected if omitted.
```

Available metrics: `ESTIMATED_EARNINGS`, `PAGE_VIEWS`, `IMPRESSIONS`, `CLICKS`, `PAGE_VIEWS_CTR`, `COST_PER_CLICK`, `PAGE_VIEWS_RPM`, `AD_REQUESTS`, `AD_REQUESTS_CTR`

Available dimensions: `DATE`, `WEEK`, `MONTH`, `SITE_DOMAIN`, `AD_UNIT_NAME`, `COUNTRY_NAME`, `PLATFORM_TYPE`

**Example prompt**: "Show my earnings for the last 30 days broken down by site"

---

#### `list_alerts`

List policy alerts and issues that need attention.

```
Parameters:
  account  (optional)  Account name. Auto-detected if omitted.
```

**Example prompt**: "Are there any AdSense policy issues I should know about?"

---

#### `list_payments`

List payment history.

```
Parameters:
  account  (optional)  Account name. Auto-detected if omitted.
```

**Example prompt**: "Show my AdSense payment history"

---

## Usage Examples

### Full workflow: Add ads to a new Next.js site

```
You:  "I just deployed myblog.com with Next.js. Set up AdSense ads for it."

AI:   1. Calls list_accounts → gets your account
      2. Calls list_sites → confirms myblog.com is approved
      3. Calls create_ad_unit → creates "myblog-header" (DISPLAY)
      4. Calls create_ad_unit → creates "myblog-article" (IN_ARTICLE)
      5. Calls get_ad_snippet (nextjs) → generates Next.js components
      6. Calls generate_ads_txt → generates ads.txt content
      7. Inserts ad components into your layout and article pages
      8. Creates public/ads.txt
      9. Calls verify_ads_txt → confirms setup after deploy
```

### Quick report

```
You:  "How are my ads performing this month?"

AI:   Calls generate_report with dateRange=MONTH_TO_DATE,
      dimensions=[DATE, SITE_DOMAIN]
      → Shows earnings trend by site
```

### Ad placement for existing units

```
You:  "Add my existing ad units to this Astro blog"

AI:   1. Calls list_ad_units → gets your units and slot IDs
      2. Calls get_ad_snippet (astro) for each unit
      3. Inserts components into your Astro layouts
```

## Troubleshooting

### "Not authenticated" error

Re-run the auth flow:

```bash
adsense-mcp auth
```

If tokens exist but are invalid, delete them and re-authenticate:

```bash
rm ~/.adsense-mcp/tokens.json
adsense-mcp auth
```

### "AdSense Management API has not been used" error

Enable the API in Google Cloud Console:

1. Go to **APIs & Services > Library**
2. Search "AdSense Management API"
3. Click **Enable**

### "Access Not Configured" or 403 errors

Make sure:
- Your Google account is added as a test user in the OAuth consent screen
- The AdSense Management API is enabled in your GCP project
- Your AdSense account is active and approved

### Token refresh failures

Delete the saved tokens and re-authenticate:

```bash
rm ~/.adsense-mcp/tokens.json
adsense-mcp auth
```

## Security

- OAuth tokens are stored in `~/.adsense-mcp/tokens.json` (file permission: user-only recommended)
- Credentials are stored in `~/.adsense-mcp/credentials.json`
- The server uses `https://www.googleapis.com/auth/adsense` scope (full read/write)
- No data is sent to any third party — all API calls go directly to Google
- Auth callback runs on `127.0.0.1` with a randomly assigned port

To restrict to read-only access, modify the `SCOPES` array in `src/auth.ts` to:

```typescript
const SCOPES = ['https://www.googleapis.com/auth/adsense.readonly'];
```

## License

MIT
