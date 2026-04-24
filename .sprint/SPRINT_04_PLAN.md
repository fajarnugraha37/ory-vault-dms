# sprint 04: hydra oauth2 & delegation

## goal

mengizinkan aplikasi pihak ketiga mengakses api dms atas nama user.

## tasks

1. **TASK-401**: setup ory hydra di docker-compose (dsn, secret, issuer).
2. **TASK-402**: implementasi 'login & consent provider' di backend go.
3. **TASK-403**: integrasi oathkeeper dengan hydra (oauth2_introspection handler).
4. **TASK-404**: buat script tools untuk pendaftaran client oauth2.

## definition of done (dod)

- [ ] postman berhasil mendapatkan access token via `authorization_code`.
- [ ] oathkeeper memvalidasi token bearer dari postman.
- [ ] user dapat memberikan 'consent' melalui ui backend go.
