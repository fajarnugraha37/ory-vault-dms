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
- [x] **State Toggle**: Update identity state (`active` <-> `inactive`) via `PUT`.
- [x] **Session Revocation**: Fitur "Logout dari semua perangkat" untuk user tertentu (DELETE `/admin-api/identities/{id}/sessions`).
- [x] **Identity Detail View**: Sidebar detail untuk melihat `traits` dan status user.

### Fasa C: Identity Details Extension & Trait Editor [IN PROGRESS]
- [ ] **Manual Recovery**: Trigger password reset email atau generate recovery link bagi admin.
- [ ] **Trait Editor**: Form untuk mengubah nama, divisi, atau metadata user dari Admin UI.
- [ ] **Manual Verification**: Tombol untuk menandai email user sebagai "Verified" secara manual.

### Fasa D: Security Audit & Future RBAC [TODO]
- [ ] **Active Sessions List**: Melihat detail device/browser yang sedang login.
- [ ] **Security Posture Audit**: Tampilkan status 2FA (TOTP/WebAuthn).
- [ ] **Audit Timeline**: Tampilkan daftar tindakan admin (siapa mengubah apa).

---

## 3. Implementation Details (Backend Wrapper)

Setiap fitur baru di atas akan diimplementasikan sebagai endpoint di `dms-backend` yang memanggil Kratos Admin API internal:
- **State Change**: `PUT /admin/identities/{id}` (fetch full body first, then update state field) [DONE]
- **Revoke**: `DELETE /admin/identities/{id}/sessions` [DONE]
- **Sessions**: `GET /admin/identities/{id}/sessions` [DONE]

---

## 4. Validation Strategy [ONGOING]

1. **Access Control**: Pastikan hanya user dengan email `@ory-vault.*` yang bisa memanggil endpoint `/admin-api/*`. [PASSED]
2. **Audit Logging**: Setiap tindakan administratif (State change, Revoke, Edit) mencatat log ke stdout backend. [PASSED]
3. **Zero Trust Integrity**: Backend memvalidasi JWT Signature sebelum melakukan request ke Kratos Admin port. [PASSED]
