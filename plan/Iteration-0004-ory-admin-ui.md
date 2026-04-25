# Pelan: Lelaran 0004 - Zero Trust Admin API & Dashboard (Identity Management)

## Objektif

Membangun kapabilitas manajemen identitas (Admin UI) yang 100% mematuhi prinsip **Zero Trust**. Seluruh tindakan admin melewati Oathkeeper (JWT), divalidasi oleh Go Backend (Audit/Authz), sebelum diteruskan secara internal ke Kratos Admin API.

---

## 1. Pre-flight: Repository & Integrity Audit [DONE]

- [x] **Kratos Admin Endpoint**: Port `4434` ditutup dari host (Internal Only).
- [x] **Routing Fix**: Menggunakan prefix unik `/admin-api/` dan Nginx location `/admin-api/` untuk menghindari ambiguitas rule.
- [x] **Edge Security**: Oathkeeper mengamankan rute admin dengan `cookie_session` dan mutasi ke `id_token`.

---

## 2. Proposed Tasks

### Fasa A: MVP Admin (Core Logic) [DONE]
- [x] List Identities (GET `/admin-api/identities`)
- [x] Delete Identity (DELETE `/admin-api/identities/{id}`)
- [x] UI Tabel di Next.js (`/dashboard/admin/users`)

### Fasa B: Account Lifecycle & State Management [DONE]
- [x] **State Toggle**: Update identity state (`active` <-> `inactive`) via `PATCH`.
- [x] **Session Revocation**: Fitur "Logout dari semua perangkat" (DELETE `/admin-api/identities/{id}/sessions`).
- [x] **Identity Detail View**: Sidebar detail untuk melihat `traits` dan status user.

### Fasa C: Identity Details Extension & Trait Editor [DONE]
- [x] **Manual Recovery**: Generate recovery link bagi admin (POST `/admin-api/identities/{id}/recovery`).
- [x] **Trait Editor**: Form untuk mengubah nama, divisi user (PATCH `/admin-api/identities/{id}/traits`).
- [x] **Manual Verification**: Tombol untuk menandai email user sebagai "Verified" secara manual (POST `/admin-api/identities/{id}/verify`).
- [x] **Self-Service Support**: Implementasi halaman `/auth/settings` dan `/auth/recovery` di UI.

### Fasa D: Security Audit & Future RBAC [DONE]
- [x] **Active Sessions List**: Melihat detail device/browser (IP, User Agent) yang sedang login.
- [x] **Security Posture Audit**: Tampilkan status Email Verification secara visual.
- [x] **Infrastructure Hardening**: Penambahan worker **Kratos Courier** untuk pengiriman email asinkron. [DONE]

---

## 3. Implementation Details (Backend Wrapper)

Setiap fitur baru di atas akan diimplementasikan sebagai endpoint di `dms-backend` yang memanggil Kratos Admin API internal:
- **State Change**: `PATCH /admin/identities/{id}` (JSON Patch RFC 6902) [DONE]
- **Trait Editor**: `PATCH /admin/identities/{id}` (JSON Patch RFC 6902) [DONE]
- **Recovery**: `POST /admin/recovery/link` [DONE]
- **Verify**: `PATCH /admin/identities/{id}` (Update verifiable_addresses) [DONE]
- **Audit**: Log `stdout` mencatat setiap aksi admin. [DONE]

---

## 4. Validation Strategy [PASSED]

1. **Access Control**: Pastikan hanya user dengan email `@ory-vault.*` yang bisa memanggil endpoint `/admin-api/*`. [PASSED]
2. **Audit Logging**: Setiap tindakan administratif (State change, Revoke, Edit) mencatat log ke stdout backend. [PASSED]
3. **Zero Trust Integrity**: Pastikan backend memvalidasi JWT Signature sebelum melakukan request ke Kratos Admin port. [PASSED]
4. **Email Delivery**: Recovery email berhasil diterima di Mailpit. [PASSED]

---

## 6. Retrospective & Issue Log (Iteration 0004)

### Issue 6: Missing Self-Service Entry Point
- **Root Cause**: Halaman login tidak memiliki navigasi ke flow recovery.
- **Resolution**: Tambahkan link "Forgot your password?" di halaman login.

### Issue 7: Courier Worker Missing
- **Root Cause**: Email tertahan di database (courier queue) karena service `kratos courier watch` tidak dijalankan.
- **Resolution**: Tambahkan service `vault-kratos-courier` di Docker Compose.

### Issue 8: SMTP STARTTLS Failure
- **Root Cause**: Mailpit tidak mendukung STARTTLS secara default pada port 1025.
- **Resolution**: Tambahkan `disable_starttls=true` pada DSN SMTP di `kratos.yaml`.
