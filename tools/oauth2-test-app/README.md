# OryVault OAuth2 Test App (Bun.js)

Aplikasi simulasi pihak ketiga (Third-Party) untuk menguji integrasi OAuth2 pada arsitektur **ORY-VAULT**.

## Fitur Utama

- **Flow 1 (Authorization Code)**: Simulasi aplikasi web dengan UI yang membutuhkan persetujuan user (Login -> Consent).
- **Flow 2 (Client Credentials)**: Simulasi Machine-to-Machine (M2M) service-to-service tanpa interaksi user.
- **Neo-Brutalist UI**: Tampilan minimalis yang senada dengan dashboard utama.

## Prasyarat

- [Bun runtime](https://bun.sh) terpasang di sistem lokal.
- Server **ORY-VAULT** sedang berjalan (`docker compose up`).
- Anda sudah meregistrasi aplikasi di `https://ory-vault.test/dashboard/apps`.

## Persiapan Client

1. Buka [Dashboard Apps](https://ory-vault.test/dashboard/apps).
2. Klik **CREATE_CLIENT**.
3. Pastikan memasukkan Redirect URI: `http://localhost:4000/callback`.
4. Catat **CLIENT_ID** dan **CLIENT_SECRET** yang muncul.

## Cara Menjalankan

Disarankan menggunakan Environment Variables agar kredensial Anda tidak tertulis permanen di kode.

### Di Windows (PowerShell)

```powershell
$env:CLIENT_ID="isi-client-id-anda"; $env:CLIENT_SECRET="isi-secret-anda"; bun run index.ts
```

### Di Linux/macOS

```bash
CLIENT_ID="isi-client-id-anda" CLIENT_SECRET="isi-secret-anda" bun run index.ts
```

Setelah aplikasi berjalan, buka [http://localhost:4000](http://localhost:4000).

## Detail Teknis

- **Internal Domain**: Menggunakan `https://auth.ory-vault.test` untuk exchange token.
- **Resource Domain**: Menggunakan `https://ext-api.ory-vault.test` untuk memanggil API resource (Zero Trust).
- **SSL Bypass**: Aplikasi ini dikonfigurasi dengan `NODE_TLS_REJECT_UNAUTHORIZED=0` agar bisa berkomunikasi dengan server lokal yang menggunakan Self-Signed Certificate (Step-CA).

## Troubleshooting

- **Error: No CSRF value**: Pastikan Anda menghapus cookie browser untuk domain `ory-vault.test` atau gunakan mode Incognito.
- **Error: Redirect URI Mismatch**: Pastikan URI `http://localhost:4000/callback` sudah terdaftar di daftar "Authorized_Redirects" pada UI Manage Apps.
- **Error: Insufficient Scope**: Pastikan saat registrasi atau saat request `/login`, scope yang diminta adalah `nodes.read`.

## Cheat Sheet (Internal Ops)

Berikut adalah kumpulan perintah berguna untuk debug dan manajemen client langsung via CLI:

### 1. Reset Client Secret secara Manual

Gunakan ini jika Anda lupa secret dan ingin meresetnya tanpa menghapus client:

```bash
docker exec vault-hydra hydra update client <CLIENT_ID> --secret temporary-secret-12345 --endpoint http://localhost:4445
```

### 2. Cek Detail Client (JSON)

Gunakan ini untuk melihat scopes, redirect URIs, dan konfigurasi grant types:

```bash
docker exec vault-hydra hydra get client <CLIENT_ID> --endpoint http://localhost:4445 --format json
```

### 3. Menjalankan Test App (PowerShell)

Cara tercepat untuk running test app dengan kredensial:

```powershell
$env:CLIENT_ID="<CLIENT_ID>"; $env:CLIENT_SECRET="temporary-secret-12345"; bun run index.ts
```

### 4. Menjalankan Test App (Linux/Bash)

```bash
CLIENT_ID="049725a8-55e1-43f8-90a6-16545917fa6a" CLIENT_SECRET="temporary-secret-12345" bun run index.ts
```
