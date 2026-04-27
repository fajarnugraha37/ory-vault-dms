import { serve } from "bun";

// --- CONFIGURATION ---
const CLIENT_ID = process.env.CLIENT_ID || "PASTE_YOUR_CLIENT_ID_HERE";
const CLIENT_SECRET =
  process.env.CLIENT_SECRET || "PASTE_YOUR_CLIENT_SECRET_HERE";
const REDIRECT_URI = "http://localhost:4000/callback";

const AUTH_URL = "https://auth.ory-vault.test/oauth2/auth";
const TOKEN_URL = "https://auth.ory-vault.test/oauth2/token";
const API_URL = "https://ext-api.ory-vault.test/api/nodes";

console.log(
  "🚀 OryVault Integration Test App running on http://localhost:4000",
  CLIENT_ID,
  CLIENT_SECRET,
);

// Allow self-signed certs for local testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

serve({
  port: 4000,
  async fetch(req) {
    const url = new URL(req.url);

    // --- UI HELPER ---
    const htmlResponse = (title: string, content: string) =>
      new Response(
        `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; line-height: 1.5; background: #f8fafc; color: #0f172a; }
            .card { background: white; border: 2px solid #e2e8f0; border-radius: 1rem; padding: 2rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 800px; margin: 0 auto; }
            h1 { text-transform: uppercase; font-style: italic; font-weight: 900; letter-spacing: -0.05em; border-bottom: 4px solid #000; padding-bottom: 0.5rem; }
            .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #000; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: bold; text-transform: uppercase; margin-top: 1rem; }
            .btn-blue { background: #2563eb; }
            pre { background: #1e293b; color: #38bdf8; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.8rem; }
            .status { font-weight: bold; color: #059669; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>OryVault_Tester</h1>
            ${content}
            <br/><br/>
            <a href="/" style="color: #64748b; font-size: 0.8rem;">[ Back to Home ]</a>
          </div>
        </body>
      </html>
    `,
        { headers: { "Content-Type": "text/html" } },
      );

    // 1. HOME PAGE
    if (url.pathname === "/") {
      return htmlResponse(
        "Home",
        `
        <p>Aplikasi simulasi pihak ketiga untuk mengetes integrasi OAuth2.</p>
        
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
          <div style="border-top: 2px solid #e2e8f0; pt-1rem;">
            <h3>Flow 1: Authorization Code</h3>
            <p style="font-size: 0.9rem; color: #64748b;">Gunakan ini jika aplikasi Anda punya User Interface (Browser). Membutuhkan login user.</p>
            <a href="/login" class="btn">User Login Flow</a>
          </div>

          <div style="border-top: 2px solid #e2e8f0; pt-1rem;">
            <h3>Flow 2: Client Credentials</h3>
            <p style="font-size: 0.9rem; color: #64748b;">Gunakan ini untuk akses Machine-to-Machine (Server-side). Tanpa interaksi user.</p>
            <a href="/m2m" class="btn btn-blue">M2M Service Flow</a>
          </div>
        </div>
      `,
      );
    }

    // 2. FLOW 1: START (Redirect to Hydra)
    if (url.pathname === "/login") {
      const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&scope=openid%20offline_access%20nodes.read&redirect_uri=${REDIRECT_URI}&state=secure_state_123456`;
      return Response.redirect(authUrl);
    }

    // 3. FLOW 1: CALLBACK HANDLER
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code)
        return htmlResponse(
          "Error",
          `<p style="color:red">Error: No code received. Response: ${url.search}</p>`,
        );

      // Exchange code for token
      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      });

      const tokens = await tokenRes.json();
      if (tokens.error)
        return htmlResponse(
          "Token Error",
          `<pre>${JSON.stringify(tokens, null, 2)}</pre>`,
        );

      // Fetch Data
      const apiRes = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const data = await apiRes.json();
      console.log(data);

      return htmlResponse(
        "Success - Flow 1",
        `
        <p class="status">✅ Berhasil mendapatkan Token via Authorization Code!</p>
        <h4>Token Response:</h4>
        <pre>${JSON.stringify(tokens, null, 2)}</pre>
        <h4>Data dari Ext-API (nodes):</h4>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `,
      );
    }

    // 4. FLOW 2: CLIENT CREDENTIALS (Direct Exchange)
    if (url.pathname === "/m2m") {
      console.log("🔐 Performing M2M Token Exchange...");

      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope: "nodes.read nodes.write", // M2M butuh scope eksplisit
        }),
      });

      const tokens = await tokenRes.json();
      if (tokens.error)
        return htmlResponse(
          "M2M Error",
          `<pre>${JSON.stringify(tokens, null, 2)}</pre>`,
        );

      // Use token to call API
      const apiRes = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const data = await apiRes.json();

      return htmlResponse(
        "Success - Flow 2",
        `
        <p class="status" style="color: #2563eb;">✅ Berhasil mendapatkan Token via Client Credentials!</p>
        <p style="font-size: 0.8rem;">(Ini adalah akses service-to-service tanpa user session)</p>
        <h4>M2M Token Response:</h4>
        <pre>${JSON.stringify(tokens, null, 2)}</pre>
        <h4>Data dari Ext-API (nodes):</h4>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `,
      );
    }

    return new Response("Not Found", { status: 404 });
  },
});
