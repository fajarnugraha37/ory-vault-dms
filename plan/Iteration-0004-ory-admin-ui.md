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

### Fasa B: Account Lifecycle & State Management [IN PROGRESS]
- [ ] **State Toggle**: Update identity state (`active` <-> `inactive`) via `PATCH`.
- [ ] **Manual Recovery**: Trigger password reset email atau generate recovery link bagi admin.
- [ ] **Impersonation**: Generate login session khusus untuk bantuan teknis (securely).

### Fasa C: Identity Details & Trait Editor [TODO]
- [ ] **Identity Detail View**: Halaman/Modal detail untuk melihat `traits`, `metadata`, dan audit log per user.
- [ ] **Trait Editor**: Form untuk mengubah nama, divisi, atau metadata user dari Admin UI.
- [ ] **Manual Verification**: Tombol untuk menandai email user sebagai "Verified" secara manual.

### Fasa D: Security Audit & Session Management [TODO]
- [ ] **Active Sessions**: Melihat daftar device/browser yang sedang login untuk identitas tertentu.
- [ ] **Session Revocation**: Fitur "Logout dari semua perangkat" (Revoke all sessions) untuk user tertentu.
- [ ] **Security Posture Audit**: Tampilkan status 2FA (TOTP/WebAuthn) dan riwayat login terakhir di UI detail.

### Fasa E: Compliance & Bulk Operations [TODO]
- [ ] **Audit Timeline**: Tampilkan daftar tindakan admin (siapa mengubah apa) berdasarkan log backend.
- [ ] **Bulk Actions**: Fitur import/export user via CSV (Internal Lab Purpose).

---

## 3. Implementation Details (Backend Wrapper)

Setiap fitur baru di atas akan diimplementasikan sebagai endpoint di `dms-backend` yang memanggil Kratos Admin API internal:
- **State Change**: `PUT /admin/identities/{id}` (mengubah field `state`)
- **Recovery**: `POST /admin/recovery/code` atau `POST /admin/recovery/link`
- **Sessions**: `GET /admin/identities/{id}/sessions`
- **Revoke**: `DELETE /admin/identities/{id}/sessions`

---

## 4. Validation Strategy [ONGOING]

1. **Access Control**: Pastikan hanya user dengan email `@ory-vault.*` yang bisa memanggil endpoint `/admin-api/*`. [PASSED]
2. **Audit Logging**: Setiap tindakan administratif (State change, Revoke, Edit) wajib mencatat log ke stdout. [ONGOING]
3. **Zero Trust Integrity**: Pastikan backend memvalidasi JWT Signature sebelum melakukan request ke Kratos Admin port. [PASSED]
