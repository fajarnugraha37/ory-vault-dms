# Pelan: Lelaran 0005 - Implementasi Zero Trust Backend & Otomatisasi HTTPS (Infra Hardening)

## Objektif

Mencapai postur **Zero Trust** penuh dengan mengamankan pintu masuk utama (Nginx) menggunakan HTTPS, mengaktifkan rotasi sertifikat otomatis melalui **Step-CA**, dan memastikan Backend Go memvalidasi identitas secara kriptografis menggunakan **Signed JWT (ID Token)** dari Oathkeeper.

---

## 2. Proposed Tasks

### Fasa A: Otomatisasi PKI dengan Step-CA (Infrastructure) [DONE]
**Status**: `vault-ca` aktif. Sertifikat untuk Gateway dan Kratos di-generate otomatis melalui sidecar.

### Fasa B: Hardening Nginx Reverse Proxy (HTTPS) [DONE]
**Status**: Gateway melayani HTTPS (443). Redirect HTTP ke HTTPS aktif. Masalah permission dan trust chain antar service telah diatasi. Seluruh URL aplikasi telah diperbarui ke HTTPS.

### Fasa C: Konfigurasi Oathkeeper ID_TOKEN (Security) [DONE]
**Status**: Oathkeeper menandatangani request dengan JWT (RS256). JWKS diekstrak dari file `jwks.json` yang di-generate otomatis dan diekspos melalui endpoint API internal.

### Fasa D: Middleware Zero Trust di Go Backend (Backend) [DONE]
**Status**: Backend Go memvalidasi JWT secara dinamis menggunakan `keyfunc/v3`. Trust pada plain header `X-User-Id` telah dihapus. Identitas user dijamin secara kriptografis.

---

## 4. Validation Strategy (Ujian Pengesahan) [PASSED]

1. **HTTPS Handshake**: `curl -kI https://api.ory-vault.test/health` -> `200 OK`. [PASSED]
2. **JWT Verification**: Backend log menunjukkan identity ID yang diekstrak dari JWT payload. [PASSED]
3. **Bypass Attempt**: Pengiriman `X-User-Id` manual ditolak dengan `401 Unauthorized`. [PASSED]
4. **Dynamic Rotation**: JWKS diambil via network dari Oathkeeper, memungkinkan rotasi kunci tanpa restart backend. [PASSED]

---

## 6. Retrospective & Issue Log (Post-Implementation)
*Lihat dokumen [iteration-0005-implementation-details.md](./iteration-0005-implementation-details.md) untuk detail kegagalan permission dan perbaikan syntax Go.*
