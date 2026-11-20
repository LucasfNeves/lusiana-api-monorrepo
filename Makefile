COMPOSE = docker compose -f docker/compose.yml --env-file .env
NAME ?=

.DEFAULT_GOAL := help
.PHONY: help install dev build typecheck lint test test-watch validate \
	up down stop logs ps psql \
	generate migrate migrate-status studio

help: ## Lista os comandos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# App
install: ## Instala as dependências
	pnpm install

dev: ## Sobe a API em modo watch
	pnpm dev

build: ## Gera o build de produção
	pnpm build

typecheck: ## Roda o tsc sem emitir arquivos
	pnpm typecheck

lint: ## Roda o ESLint
	pnpm lint

test: ## Roda os testes
	pnpm test

test-watch: ## Roda os testes em modo watch
	pnpm test:watch

validate: ## Lint + typecheck + testes (o mesmo do pre-commit)
	pnpm validate

# Banco (Docker)
up: ## Sobe o container do Postgres
	$(COMPOSE) up -d

down: ## Derruba o container (mantém o volume)
	$(COMPOSE) down

stop: ## Para o container sem removê-lo
	$(COMPOSE) stop

logs: ## Acompanha os logs do Postgres
	$(COMPOSE) logs -f database

ps: ## Mostra o status do container
	$(COMPOSE) ps

psql: ## Abre o psql dentro do container
	$(COMPOSE) exec database sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# Prisma
generate: ## Gera o Prisma Client
	pnpm exec prisma generate

migrate: ## Cria e aplica uma migration: make migrate NAME=initial_migration
	@test -n "$(NAME)" || (echo 'Informe o nome: make migrate NAME=initial_migration' && exit 1)
	pnpm exec prisma migrate dev --name $(NAME)

migrate-status: ## Mostra o status das migrations
	pnpm exec prisma migrate status

studio: ## Abre o Prisma Studio
	pnpm exec prisma studio
