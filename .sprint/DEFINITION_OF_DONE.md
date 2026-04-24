# DEFINITION OF DONE (DOD)

## 1. ARCHITECTURAL COMPLIANCE

- [ ] DSN mengandung `search_path`.
- [ ] Komunikasi ke Keto menggunakan gRPC port 4466/4467.
- [ ] Rahasia (secret) menggunakan variabel lingkungan, bukan hardcode.

## 2. DOCKER & NETWORK

- [ ] Service menggunakan network `ory-network`.
- [ ] Perintah `docker-compose up` berjalan tanpa error "Restarting".

## 3. SECURITY

- [ ] Backend Go tidak melakukan autentikasi manual (percaya pada Oathkeeper).
- [ ] Endpoint `/health` tersedia untuk setiap service.

## 4. VERIFICATION DOCUMENTS

- [ ] Sertakan log output dari `docker-compose logs [service]`.
- [ ] Sertakan satu contoh perintah `curl` untuk validasi fitur.
