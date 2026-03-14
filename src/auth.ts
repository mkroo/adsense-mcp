import { OAuth2Client } from 'google-auth-library';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { AddressInfo } from 'node:net';
import open from 'open';

const CONFIG_DIR = path.join(process.env.HOME || '~', '.adsense-mcp');
const CREDENTIALS_PATH = path.join(CONFIG_DIR, 'credentials.json');
const TOKEN_PATH = path.join(CONFIG_DIR, 'tokens.json');

const SCOPES = ['https://www.googleapis.com/auth/adsense'];

interface Credentials {
  client_id: string;
  client_secret: string;
}

function loadCredentials(): Credentials {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      'OAuth credentials not found. Run "adsense-mcp auth <path-to-credentials.json>" first.\n' +
      'To get credentials:\n' +
      '1. Go to https://console.cloud.google.com/apis/credentials\n' +
      '2. Create OAuth 2.0 Client ID (Desktop app type)\n' +
      '3. Download the JSON file'
    );
  }

  const raw = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const creds = raw.installed || raw.web;

  if (!creds?.client_id || !creds?.client_secret) {
    throw new Error('Invalid credentials file format.');
  }

  return { client_id: creds.client_id, client_secret: creds.client_secret };
}

export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const { client_id, client_secret } = loadCredentials();

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Not authenticated. Run "adsense-mcp auth" first.');
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  const oauth2Client = new OAuth2Client(client_id, client_secret);
  oauth2Client.setCredentials(tokens);

  // Auto-save refreshed tokens
  oauth2Client.on('tokens', (newTokens) => {
    try {
      const existing = fs.existsSync(TOKEN_PATH)
        ? JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
        : {};
      fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, ...newTokens }, null, 2));
    } catch {
      // Silently ignore token save errors during MCP operation
    }
  });

  return oauth2Client;
}

export async function authenticate(credentialsPath?: string): Promise<void> {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  if (credentialsPath) {
    const resolved = path.resolve(credentialsPath);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    fs.copyFileSync(resolved, CREDENTIALS_PATH);
    console.log(`Credentials saved to ${CREDENTIALS_PATH}`);
  }

  const { client_id, client_secret } = loadCredentials();

  // Start local server on a random available port
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const redirectUri = `http://127.0.0.1:${port}`;

  const oauth2Client = new OAuth2Client(client_id, client_secret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  return new Promise((resolve, reject) => {
    server.on('request', async (req, res) => {
      try {
        const url = new URL(req.url!, `http://127.0.0.1:${port}`);

        if (url.pathname !== '/') {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Authentication failed</h1><p>${error}</p>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400);
          res.end('Missing authorization code');
          return;
        }

        const { tokens } = await oauth2Client.getToken(code);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<h1>Authentication successful!</h1>' +
          '<p>You can close this window and return to the terminal.</p>'
        );

        server.close();
        console.log('Authentication successful! Tokens saved.');
        resolve();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Authentication failed');
        server.close();
        reject(err);
      }
    });

    console.log(`\nOpening browser for Google OAuth consent...\n`);
    console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);
    open(authUrl).catch(() => {
      // Browser open failed - user can copy the URL
    });
  });
}
