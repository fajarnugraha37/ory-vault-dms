# Plan: Iteration 0003 - Automated Internal PKI (Zero Trust Hardening)

## Objective

Membangun otoritas sertifikat internal (**Step-CA**) untuk mengamankan jalur komunikasi antar-service (terutama Oathkeeper -> Kratos dan Gateway -> Oathkeeper) menggunakan sertifikat TLS yang di-rotasi secara otomatis tanpa intervensi manual.

---

## 1. Pre-flight: Repository & Environment Audit

*Instruksi untuk AI Pelaksana: Pastikan kondisi berikut terpenuhi sebelum memodifikasi file.*

- [ ] **Check Docker Network**: Pastikan nama network adalah `ory-network`. Jalankan `docker network ls`.
- [ ] **Locate Config Folders**: Pastikan direktori `./contrib/config/kratos` dan `./contrib/config/oathkeeper` dapat diakses secara *writeable*.
- [ ] **Verify Compose Version**: Pastikan versi docker compose mendukung `depends_on.condition: service_healthy`.
- [ ] **Backup**: Salin `docker-compose.yaml` saat ini menjadi `docker-compose.yaml.bak`.

---

## 2. Proposed Tasks

### Phase A: Deployment Otoritas Sertifikat (Step-CA)

**Goal**: Menjalankan server CA internal yang akan menerbitkan sertifikat.

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
- **Clock Synchronization**: TLS sangat sensitif terhadap waktu. Pastikan container tidak memiliki *time drift* lebih dari 1 menit.

> **Instruction for AI Agent**: Jika anda menemukan error `Unauthorized: Missing identity token` setelah migrasi ini, cek apakah `oathkeeper.yaml` sudah diubah URL-nya menjadi `https://`. Jika koneksi gagal total, cek apakah port internal Kratos tetap `4433` (default Kratos TLS).
