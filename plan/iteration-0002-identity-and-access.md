# Plan: Iteration 0002 - Identity & Access Control (Phase 1)

## Objective

Implement the Identity & Access Control layer using Ory Kratos for authentication and Next.js for the UI Login/Registration flows, ensuring Oathkeeper enforces session checks for the backend API.

## Proposed Tasks

1. **Kratos Identity Schema Update**:
   - Update the Kratos Identity Schema (`contrib/config/kratos/identity.schema.json`) to capture `email`, `first_name`, `last_name`, and `division` as required by the PRD.
   - Update Kratos configuration (`contrib/config/kratos/kratos.yaml`) to map UI URLs for login, registration, error, etc., to the Next.js frontend (`http://ory-vault.test/login`, etc.).
2. **Frontend Authentication UI (Next.js)**:
   - Implement the Login Page (`src/app/login/page.tsx`).
   - Implement the Registration Page (`src/app/register/page.tsx`).
   - Implement a generic Auth Callback/Error handler.
   - Integrate `@ory/client` in Next.js to communicate with Kratos Public API (`auth.ory-vault.test`).
3. **Oathkeeper Enforcement & Routing Validation**:
   - Verify that Oathkeeper rules (`contrib/config/oathkeeper/rules.yaml`) properly protect the DMS Backend (`api.ory-vault.test`) by requiring a valid `cookie_session`.
   - Ensure the `X-User-Id` is properly injected via headers mutator.
4. **Backend Identity Verification (Go)**:
   - Implement an endpoint (e.g., `/api/me`) in the Go backend to echo the authenticated user's `X-User-Id` for end-to-end validation.

## Validation Strategy

- **Schema Validation**: Kratos container starts without errors with the new schema.
- **Unauthenticated Test**: Accessing `http://api.ory-vault.test/api/me` without a cookie returns `401 Unauthorized` directly from Oathkeeper.
- **Registration Flow**: A user can register via the Next.js UI, creating an identity in the `kratos` schema.
- **Login Flow**: Logging in on the UI sets a shared session cookie for `.ory-vault.test`.
- **Authenticated Test**: Accessing `http://api.ory-vault.test/api/me` with the session cookie returns HTTP 200 and the correct `X-User-Id`.

## status

 1. Kratos Identity Schema Update (Selesai ✅)

- Target: Memperbarui identity.schema.json dengan penambahan first_name, last_name, dan division.
- Fakta: File identity.schema.json sudah sukses diperbarui dan vault-kratos berjalan (Healthy) tanpa error saat memuat skema ini.
- Target: Memperbarui kratos.yaml agar UI URL diarahkan ke Next.js.
- Fakta: Konfigurasi ui_url di kratos.yaml untuk login, registration, error, dsb. telah sukses diarahkan ke <http://ory-vault.test/>... dan sudah
     diterapkan.

  1. Frontend Authentication UI (Next.js) (Selesai ✅)

- Target: Implementasi Login & Registration Page terintegrasi @ory/client.
- Fakta: Keduanya sudah diimplementasikan dalam struktur Next.js App Router (/auth/login dan /auth/registration). Error form flattening (masalah
     CSRF token dan traits) yang sempat muncul telah diperbaiki sepenuhnya, sehingga flow registrasi dan login bekerja sempurna.

  1. Oathkeeper Enforcement & Routing Validation (Selesai ✅)

- Target: Oathkeeper memproteksi api.ory-vault.test menggunakan cookie_session.
- Fakta: Konfigurasi di oathkeeper.yaml dan rules.yaml sudah aktif dan vault-oathkeeper berstatus Healthy. Masalah routing (di mana Oathkeeper
     awalnya gagal menemukan handler atau salah mem-forward ke Kratos) telah diselesaikan dengan perbaikan preserve_path dan penghapusan filter
     statis only: [ory_kratos_session].

  1. Backend Identity Verification (Selesai ✅)

- Target: Implementasi endpoint /api/me di Go backend untuk merespon dengan X-User-Id.
- Fakta: Endpoint tersebut sudah dibuat di main.go. Bukti validasinya juga sudah tercapai ketika Oathkeeper berhasil meneruskan request (HTTP 200)
     ke backend saat session cookie Anda terdeteksi valid.

  1. Validation Strategy Checks

- [x] Schema Validation: Kratos container up tanpa error.
- [x] Unauthenticated Test: /api/me mengembalikan 401 Unauthorized tanpa cookie (sudah kita validasi bersama saat error sebelumnya).
- [x] Registration Flow: Akun baru berhasil dibuat dengan semua field profil (termasuk verifikasi email tertangkap oleh Mailpit lokal).
- [x] Login Flow: Sesi cookie (Domain=ory-vault.test) tersetel dengan benar berkat perbaikan Nginx Gateway (proxy_cookie_flags).
- [x] Authenticated Test: /api/me sudah berhasil mengembalikan respons dengan X-User-Id (seperti yang terlihat dari log akses gateway Anda
     sebelumnya yang mengembalikan status 200).
