.PHONY: init up down build restart migrate status clean logs logs-backend ps check

init:
	mkdir -p contrib/db contrib/nginx contrib/config/kratos contrib/config/keto contrib/config/oathkeeper contrib/config/hydra dms-backend dms-ui tools
	
up:
	docker-compose up -d

build:
	docker-compose up -d --build

# target: rebuild a specific service (e.g., make rebuild service=vault-ui)
rebuild:
	docker-compose up -d --no-deps --build $(service)

down:
	docker-compose down

restart:
	docker compose restart $(service)

restart-all:
	docker-compose restart

# target: migrasi database (jalankan setelah postgres ready)
migrate:
	docker exec -it vault-kratos kratos -c /etc/config/kratos/kratos.yaml migrate sql -e --yes
	docker exec -it vault-keto keto migrate up -y

# target: cek status kesehatan sistem
status:
	docker-compose ps
	@echo "--- CHECKING DNS ---"
	@ping -c 1 auth.ory-vault.test || echo "FAILED: add to /etc/hosts!"

# target: pembersihan total
clean:
	docker-compose down -v
	rm -rf ./pgdata

register-client:
	go run ./tools/hydra-client/main.go
	
reg-client:
	docker exec -it vault-backend go run /app/tools/register-client.go

logs:
	docker compose logs -f $(service) | Tee-Object -FilePath "$(service)"

logs-all:
	docker compose logs -f | Tee-Object -FilePath "auth-lab.log"

ps:
	docker-compose ps

check:
	docker-compose ps
	ping -c 1 auth.ory-vault.test
	curl -I http://api.ory-vault.test/health
