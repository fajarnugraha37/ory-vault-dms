# Iteration 0003: Automated Internal PKI Implementation Plan

## 1. Goal
Implementasi Otoritas Sertifikat (CA) internal menggunakan `step-ca` untuk mengamankan komunikasi antar-service dengan TLS (Zero Trust). Fokus utama: Gateway -> Oathkeeper -> Kratos.

## 2. Pre-flight & Audit
- [ ] Backup `docker-compose.yaml` ke `docker-compose.yaml.bak`.
- [ ] Verifikasi direktori konfigurasi `./contrib/config/kratos` dan `./contrib/config/oathkeeper`.
- [ ] Pastikan tidak ada konflik port pada 9000 (port internal Step-CA).

## 3. Implementation Steps

### Phase 1: Step-CA Setup
- [x] Tambahkan service `vault-ca` ke `docker-compose.yaml`.
- [x] Gunakan volume `step-ca-data` untuk persistensi CA.
- [x] Jalankan `vault-ca` dan ekstrak Root CA fingerprint.

### Phase 2: Sidecar & Certificate Generation
- [x] Definisikan volume global `internal-certs`.
- [x] Tambahkan service sidecar `vault-kratos-certs` untuk generate sertifikat secara otomatis.
- [x] Perbaiki issue permission denied dan parsing argumen pada sidecar.

### Phase 3: Service Hardening
- [x] **Kratos**:
    - [x] Mount `internal-certs` ke container Kratos.
    - [x] Konfigurasi environment variables untuk TLS (`SERVE_PUBLIC_TLS_*`).
    - [x] Verifikasi Kratos start dengan HTTPS (port 4433).
- [x] **Oathkeeper**:
    - [x] Mount Root CA agar Oathkeeper mempercayai sertifikat yang diterbitkan Step-CA.
    - [x] Update `oathkeeper.yaml` agar `check_session_url` menggunakan `https://vault-kratos:4433`.

## 4. Validation Plan
- [x] Cek keberadaan file sertifikat di volume `internal-certs`.
- [x] Verifikasi TLS handshake antar service (melalui log atau curl sidecar).
- [x] Pastikan flow login tetap berjalan normal setelah pengaktifan TLS internal.


## 5. Rollback Strategy
- [ ] Kembalikan `docker-compose.yaml` dari backup.
- [ ] Hapus volume `step-ca-data` dan `internal-certs` jika terjadi kegagalan total.
- [ ] Kembalikan konfigurasi `oathkeeper.yaml` ke HTTP.
