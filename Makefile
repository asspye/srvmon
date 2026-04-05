.PHONY: build push deploy

IMAGE ?= srvmon
TAG   ?= latest

## Build the Docker image locally
build:
	docker build -t $(IMAGE):$(TAG) .

## Build and push to a registry (set IMAGE=registry/name)
push: build
	docker push $(IMAGE):$(TAG)

## Deploy to remote server via SSH
## Usage: make deploy HOST=user@1.2.3.4
deploy: build
	@if [ -z "$(HOST)" ]; then echo "Usage: make deploy HOST=user@server"; exit 1; fi
	docker save $(IMAGE):$(TAG) | ssh $(HOST) "docker load"
	ssh $(HOST) "mkdir -p ~/srvmon"
	scp docker-compose.yml $(HOST):~/srvmon/docker-compose.yml
	@if [ -f .env ]; then scp .env $(HOST):~/srvmon/.env; fi
	ssh $(HOST) "cd ~/srvmon && docker compose up -d --remove-orphans"
	@echo "Deployed to $(HOST):8000"
