# Plan: Iteration 0003 - Automated Internal PKI (Zero Trust Hardening)

## Objective

Membangun otoritas sertifikat internal (**Step-CA**) untuk mengamankan jalur komunikasi antar-service (terutama Oathkeeper -> Kratos dan Gateway -> Oathkeeper) menggunakan sertifikat TLS yang di-rotasi secara otomatis tanpa intervensi manual.

---

## 1. Pre-flight: Repository & Environment Audit

*Instruksi untuk AI Pelaksana: Pastikan kondisi berikut terpenuhi sebelum memodifikasi file.*

- [x] **Check Docker Network**: Pastikan nama network adalah `ory-network`. Jalankan `docker network ls`.
- [x] **Locate Config Folders**: Pastikan direktori `./contrib/config/kratos` dan `./contrib/config/oathkeeper` dapat diakses secara *writeable*.
- [x] **Verify Compose Version**: Pastikan versi docker compose mendukung `depends_on.condition: service_healthy`.
- [x] **Backup**: Salin `docker-compose.yaml` saat ini menjadi `docker-compose.yaml.bak`.

---

## 2. Proposed Tasks

### Phase A: Deployment Otoritas Sertifikat (Step-CA) [DONE]
**Status**: `vault-ca` operasional.
**Fingerprint**: `15065e7e06e0ab4e8f63998c55f28a05f7695c1bcd9a9d8ad3800f85813d83b2`

### Phase B: Automated Certificate Sidecar [DONE]
**Status**: `vault-kratos-certs` berhasil men-generate dan me-rotasi sertifikat secara otomatis.

### Phase C: Service Hardening (Kratos & Oathkeeper) [DONE]
**Status**: Kratos menjalankan HTTPS pada port 4433, Oathkeeper mempercayai Root CA internal.

1. **Initialize Step-CA Service**: Tambahkan service `vault-ca` di `docker-compose.yaml`.

    ```yaml
    vault-ca:
      image: smallstep/step-ca:latest
      container_name: vault-ca
      environment:
        - DOCKER_STEPCA_INIT_NAME=OryVaultCA
        - DOCKER_STEPCA_INIT_PROVISIONER_NAME=admin
        - DOCKER_STEPCA_INIT_PASSWORD=vault-ca-secret-password-123
      volumes:
        - ./step-ca-data:/home/step
      networks:
        - ory-network
      healthcheck:
        test: ["CMD", "step", "ca", "health", "--ca-url", "https://localhost:9000", "--root", "/home/step/certs/root_ca.crt"]
        interval: 5s
        timeout: 5s
        retries: 3
    ```

### Phase B: Automated Certificate Sidecar

**Goal**: Mengotomatisasi pengambilan sertifikat untuk service lain agar aplikasi tidak perlu tahu cara kerja CA.

1. **Create Global Volume**: Tambahkan `internal-certs: {}` di bagian `volumes` paling bawah file compose.
2. **Add Cert-Helper Sidecar**: Tambahkan service untuk me-request sertifikat `vault-kratos`.

    ```yaml
    vault-kratos-certs:
      image: smallstep/step-cli
      container_name: vault-kratos-certs
      depends_on:
        vault-ca:
          condition: service_healthy
      networks:
        - ory-network
      volumes:
        - internal-certs:/certs
        - ./step-ca-data:/home/step:ro
      command: >
        step ca certificate "vault-kratos" /certs/kratos.crt /certs/kratos.key
        --ca-url https://vault-ca:9000
        --root /home/step/certs/root_ca.crt
        --provisioner-password-file /dev/null # Placeholder if passwordless or token used
        --force
    ```

### Phase C: Service Hardening (Kratos & Oathkeeper)

**Goal**: Mengaktifkan HTTPS pada endpoint internal.

1. **Modify `vault-kratos`**:
    - Mount volume sertifikat: `- internal-certs:/etc/config/kratos/certs:ro`.
    - Update environment:

      ```yaml
      - SERVE_PUBLIC_TLS_CERT_PATH=/etc/config/kratos/certs/kratos.crt
      - SERVE_PUBLIC_TLS_KEY_PATH=/etc/config/kratos/certs/kratos.key
      ```

2. **Modify `vault-oathkeeper`**:
    - Update `oathkeeper.yaml` (Authenticator section):

      ```yaml
      check_session_url: https://vault-kratos:4433/sessions/whoami # Ubah http ke https
      ```

    - Pastikan Oathkeeper memercayai CA internal dengan me-mount Root CA:
      `- ./step-ca-data/certs/root_ca.crt:/etc/ssl/certs/internal_root.crt:ro`.

---

## 3. Implementation Sequence (Step-by-Step)

1. **Step 1**: Jalankan hanya service CA: `docker compose up -d vault-ca`.
2. **Step 2**: Ambil *Fingerprint* CA untuk digunakan di sidecar:
    `docker exec vault-ca step certificate fingerprint certs/root_ca.crt`.
3. **Step 3**: Update konfigurasi `vault-kratos-certs` dengan fingerprint tersebut.
4. **Step 4**: Jalankan sidecar certs: `docker compose up -d vault-kratos-certs`.
5. **Step 5**: Restart full stack: `docker compose up -d`.

---

## 4. Validation Strategy (FOOLPROOF)

1. **Certificate Existence**: Pastikan file sertifikat terbuat.
    `docker run --rm -v internal-certs:/data alpine ls /data`. Harus muncul `kratos.crt` dan `kratos.key`.
2. **Internal HTTPS Handshake**: Tes koneksi dari Oathkeeper ke Kratos menggunakan HTTPS.
    `docker exec vault-oathkeeper curl -v --cacert /etc/ssl/certs/internal_root.crt https://vault-kratos:4433/sessions/whoami`.
    - **Success Condition**: HTTP 401 (Unauthorized) tapi handshake TLS berhasil.
    - **Failure Condition**: `SSL certificate problem: self signed certificate` atau `Connection refused`.
3. **Log Audit**: Periksa log Oathkeeper:
    `docker compose logs -f vault-oathkeeper | grep "TLS handshake"`
4. **Automatic Rotation Test**: Jalankan `docker compose restart vault-kratos-certs` dan pastikan timestamp pada file `.crt` berubah.

---

## 5. Risks & Trade-offs (Root Cause Awareness)

- **Circular Dependency**: Sidecar butuh CA aktif. Jika CA gagal start, seluruh stack akan stuck di `waiting for healthy`.
- **Trust Store**: Setiap container yang memanggil HTTPS internal **WAJIB** memiliki file `root_ca.crt` di dalam trust store OS-nya (atau flag `--cacert` di curl). Jika lupa di-mount, akan muncul error "Certificate Signed by Unknown Authority".
---

## 6. Retrospective & Issue Log (Post-Implementation)

### Issue 1: Step-CA Initialization Failure
- **Root Cause**: Container `vault-ca` gagal start karena variabel lingkungan `DOCKER_STEPCA_INIT_DNS_NAMES` tidak disertakan. Tanpa ini, inisialisasi otomatis `ca.json` gagal.
- **Resolution**: Menambahkan `DOCKER_STEPCA_INIT_DNS_NAMES=vault-ca,localhost` ke `docker-compose.yaml`.
- **Lesson Learned**: Dokumentasi Docker `smallstep/step-ca` mewajibkan DNS names untuk inisialisasi *headless*.

### Issue 2: Sidecar Argument Error (`too many positional arguments`)
- **Root Cause**: `step ca certificate` membutuhkan argumen yang sangat spesifik. Kesalahan terjadi karena absennya flag `--password-file` (untuk enkripsi private key) saat dijalankan secara otomatis, yang memicu prompt interaktif di lingkungan non-TTY.
- **Resolution**: Menyediakan dua file password: `--provisioner-password-file` dan `--password-file` menggunakan file sementara `/tmp/pw`.
- **Lesson Learned**: Untuk otomatisasi `step-cli`, enkripsi private key *wajib* ditangani secara non-interaktif atau menggunakan flag `--no-password` (jika didukung versi tersebut) atau menyalurkan password via file.

### Issue 3: Permission Denied pada Volume Sertifikat
- **Root Cause**: Sidecar berjalan sebagai `root`, sehingga file `.crt` dan `.key` dimiliki oleh root. Service Ory (Kratos/Oathkeeper) berjalan sebagai user `ory` (UID 100/1000) dan tidak bisa membaca file tersebut.
- **Resolution**: Menambahkan `chmod 644` pada perintah sidecar setelah sertifikat diterbitkan dan memberikan izin baca di level host Windows menggunakan `icacls`.
- **Lesson Learned**: Selalu pertimbangkan pemetaan UID/GID saat berbagi volume antara container root dan non-root di Docker.

### Issue 4: Oathkeeper TLS Verification Failure (`unknown authority`)
- **Root Cause**: Image Ory Oathkeeper (minimal/distroless) tidak memuat CA tambahan secara otomatis dari folder mount. Go runtime membutuhkan Root CA berada di bundle sistem.
- **Resolution**: Me-mount Root CA internal langsung menimpa file default CA bundle di `/etc/ssl/certs/ca-certificates.crt` dan mengatur variabel `SSL_CERT_FILE`.
- **Lesson Learned**: Pada container distroless, injeksi sertifikat paling aman adalah dengan menimpa bundle standar OS.

### Issue 5: Kratos Invalid Configuration (`trusted_proxies`)
- **Root Cause**: Skema YAML Kratos v1.1 menolak `trusted_proxies` jika diletakkan di bawah `serve.public` atau di level root (tergantung strict validation).
- **Resolution**: Memindahkan konfigurasi ke variabel lingkungan `SERVE_TRUSTED_PROXIES` di `docker-compose.yaml` untuk menghindari masalah parsing skema YAML.
- **Lesson Learned**: Gunakan Environment Variables untuk properti yang sering berubah atau memiliki validasi skema YAML yang ketat antar versi.

---

## 7. Strategic Pivot: Iteration 0005 Acceleration
Mengingat ketidakstabilan protokol (campuran HTTP dan HTTPS) menyebabkan masalah CSRF dan sinkronisasi session, tim memutuskan untuk mempercepat **Iterasi 0005 (Full Nginx HTTPS)** sebelum melanjutkan ke fitur admin. Zero Trust sejati membutuhkan enkripsi dari sisi client (browser).
