# Pelan: Lelaran 0004 - Pelaksanaan Ory Admin UI (Identity Management)

## Objektif

Menambah antarmuka grafik (UI) pihak ketiga untuk menguruskan identiti, sesi, dan skema dalam Ory Kratos, serta memastikan akses ke dashboard tersebut dikawal ketat oleh Ory Oathkeeper.

---

## 1. Pre-flight: Repository & Integrity Audit

*Ejen AI pelaksana MESTI menyemak perkara berikut sebelum mula:*

- [ ] **Kratos Admin Endpoint**: Pastikan `vault-kratos` mengekspos port admin (default: `4434`) di dalam network docker `ory-network`.
- [ ] **Oathkeeper Rules**: Kenal pasti lokasi file `rules.yaml` untuk menambah akses ke dashboard baru.
- [ ] **Environment Check**: Pastikan terdapat baki memori sekurang-kurangnya 256MB untuk *service* dashboard baru.
- [ ] **Backup**: Salin `docker-compose.yaml` ke `docker-compose.yaml.v5.bak`.

---

## 2. Proposed Tasks

### Fasa A: Konfigurasi Docker (Infrastructure)

**Matlamat**: Menambah *service* dashboard ke dalam stack.

1. **Pilih Imej Dashboard**: Gunakan `oryd/kratos-selfservice-ui-node` (untuk user) atau imej admin komuniti seperti `p98id/kratos-admin-ui`. Untuk pengurusan admin, kita pilih **Kratos Admin UI**.
2. **Edit `docker-compose.yaml`**:

    ```yaml
    vault-admin-ui:
      image: ghcr.io/dfoxg/kratos-admin-ui:latest
      container_name: vault-admin-ui
      environment:
        - KRATOS_ADMIN_URL=http://vault-kratos:4434
        - KRATOS_PUBLIC_URL=http://auth.ory-vault.test
      networks:
        - ory-network
      # JANGAN buka port ke host. Akses wajib melalui Gateway/Oathkeeper.
      expose:
        - 3000
    ```

### Fasa B: Kawalan Akses Zero Trust (Security)

**Matlamat**: Memastikan hanya orang yang dibenarkan boleh membuka dashboard admin.

1. **Tambah Rule di `rules.yaml`**:
    Cipta rule baru supaya Oathkeeper melindungi rute `admin.ory-vault.test`.

    ```yaml
    - id: "kratos-admin-ui-rule"
      match:
        url: "http://admin.ory-vault.test/<**>"
        methods: ["GET", "POST", "PUT", "DELETE"]
      upstream:
        url: "http://vault-admin-ui:3000"
        preserve_host: true
      authenticators:
        - handler: cookie_session
      authorizer:
        handler: allow # Nanti boleh ditukar ke Keto untuk cek role 'admin'
      mutators:
        - handler: noop
    ```

### Fasa C: Konfigurasi Gateway (Routing)

**Matlamat**: Menghalakan trafik domain ke dashboard.

1. **Update `nginx/default.conf`**:
    Tambah blok server untuk sub-domain admin.

    ```nginx
    server {
        listen 80;
        server_name admin.ory-vault.test;

        location / {
            proxy_pass http://vault-oathkeeper:4455;
            proxy_set_header Host $host;
            proxy_set_header Cookie $http_cookie;
        }
    }
    ```

---

## 3. Implementation Sequence (Langkah-demi-Langkah)

1. **Langkah 1**: Kemaskini `docker-compose.yaml` dengan service `vault-admin-ui`.
2. **Langkah 2**: Kemaskini `rules.yaml` milik Oathkeeper.
3. **Langkah 3**: Kemaskini konfigurasi Nginx.
4. **Langkah 4**: Tambahkan entry `127.0.0.1 admin.ory-vault.test` ke dalam file `hosts` Windows anda.
5. **Langkah 5**: Jalankan `docker compose up -d --build vault-admin-ui vault-oathkeeper vault-gateway`.

---

## 4. Validation Strategy (Ujian Pengesahan)

1. **Connectivity Test**:
    `docker exec vault-admin-ui wget -qO- http://vault-kratos:4434/admin/identities`
    - **Hasil**: Patut dapat respon JSON (walaupun kosong `[]`).
2. **Zero Trust Access**:
    Buka `http://admin.ory-vault.test` dalam browser **tanpa login**.
    - **Hasil**: Wajib dapat **401 Unauthorized** dari Oathkeeper.
3. **Authorized Access**:
    Login di `http://ory-vault.test`, kemudian buka `http://admin.ory-vault.test`.
    - **Hasil**: Dashboard muncul dan boleh senaraikan user yang ada.
4. **Security Audit**:
    Cuba panggil IP container `vault-admin-ui` terus dari host Windows.
    - **Hasil**: Gagal (kerana tiada port dipetakan ke host).

---

## 5. Risks & Residual Risks

- **Admin Privilege Leakage**: Pada peringkat ini, *sesiapa sahaja* yang sudah login boleh akses dashboard.
  - **Mitigasi**: Seterusnya (Lelaran 0006), kita perlu guna **Ory Keto** untuk memastikan hanya identiti dengan metadata `role: admin` sahaja dibenarkan oleh Oathkeeper.
- **Version Mismatch**: Jika versi Dashboard tidak serasi dengan versi Kratos.
  - **Mitigasi**: Sentiasa semak *compatibility matrix* di repo dashboard komuniti tersebut.

**Kesimpulan Blunt**: Pelaksanaan dashboard admin adalah keperluan operasional, tetapi ia merupakan titik serangan yang tinggi. Melindunginya di sebalik **Oathkeeper** (bukannya membuka port 3000 terus) adalah amalan **Zero Trust** yang paling kritikal dalam pelan ini.
