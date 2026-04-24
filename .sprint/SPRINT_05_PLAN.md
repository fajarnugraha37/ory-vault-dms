# sprint 05: nextjs dashboard & e2e testing

## goal

user dapat berinteraksi dengan sistem melalui web ui secara utuh.

## tasks

1. **TASK-501**: setup nextjs ssg dengan tailwind.
2. **TASK-502**: implementasi `useAuth` hook (connect to kratos whoami).
3. **TASK-503**: buat halaman dokumen (fetching dari api gateway).
4. **TASK-504**: e2e test: daftar -> login -> upload -> share.

## definition of done (dod)

- [ ] frontend berjalan di `ory-vault.test`.
- [ ] login otomatis redirect ke dashboard.
- [ ] status 401 dari proxy memicu redirect ke halaman login browser.
