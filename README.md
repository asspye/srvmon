# srvmon

Веб-дашборд для мониторинга сервера и VPN-клиентов AmneziaWG.

![Stack](https://img.shields.io/badge/Go-backend-00ADD8) ![Stack](https://img.shields.io/badge/React-frontend-61DAFB) ![Stack](https://img.shields.io/badge/Docker-deploy-2496ED)

## Возможности

- **Системные метрики** — CPU, RAM, Swap, диски, сеть (real-time графики)
- **AmneziaWG** — список клиентов, статус подключения, трафик каждого пира
- **Real-time обновление** через WebSocket каждые 2 секунды
- **Авторизация** — JWT, логин/пароль через переменные окружения
- **Docker** — мультистейдж сборка, деплой одной командой

## Скриншот

> Dashboard показывает CPU/RAM/диски/сеть и таблицу AmneziaWG пиров

## Стек

| Слой | Технология |
|------|-----------|
| Backend | Go + Gin + gorilla/websocket |
| Метрики | gopsutil |
| Frontend | React + TypeScript + Vite |
| Графики | Recharts |
| Деплой | Docker multi-stage build |

---

## Быстрый старт

### Требования

- Docker + Docker Compose на сервере
- AmneziaWG запущен в Docker (стандартная установка через приложение Amnezia VPN)

### 1. Клонировать репозиторий

```bash
git clone https://github.com/asspye/srvmon.git
cd srvmon
```

### 2. Создать файл переменных окружения

```bash
cp .env.example .env
nano .env
```

Заполнить `.env`:

```env
# Порт на котором будет доступен дашборд
PORT=8000

# Имя Docker-контейнера с AmneziaWG
# Узнать командой: sudo docker ps --format '{{.Names}}'
AWG_CONTAINER_NAME=amnezia-awg

# Секретный ключ для JWT токенов (любая длинная случайная строка)
JWT_SECRET=замени-на-длинную-случайную-строку

# Логин и пароль для входа в дашборд
ADMIN_USERNAME=admin
ADMIN_PASSWORD=замени-на-надёжный-пароль
```

### 3. Запустить

```bash
sudo docker compose up -d --build
```

Дашборд будет доступен на `http://SERVER_IP:8000`

---

## Деплой без сборки на сервере

Если собираешь образ локально (например на Mac) и передаёшь на сервер:

```bash
# Собрать образ для linux/amd64
docker build --platform linux/amd64 -t srvmon:latest .

# Передать на сервер и запустить
docker save srvmon:latest | ssh -p PORT user@SERVER "sudo docker load"
scp -P PORT docker-compose.yml .env user@SERVER:~/srvmon/
ssh -p PORT user@SERVER "cd ~/srvmon && sudo docker compose up -d"
```

---

## Конфигурация

Все настройки задаются через `.env` файл. Никогда не добавляй `.env` в git.

| Переменная | По умолчанию | Описание |
|------------|-------------|----------|
| `PORT` | `8000` | Порт дашборда |
| `AWG_CONTAINER_NAME` | `amnezia-awg` | Имя Docker контейнера с AmneziaWG |
| `JWT_SECRET` | *(обязательно сменить)* | Секрет для подписи JWT токенов |
| `ADMIN_USERNAME` | `admin` | Логин |
| `ADMIN_PASSWORD` | *(обязательно сменить)* | Пароль |

### Как узнать имя контейнера AmneziaWG

```bash
sudo docker ps --format '{{.Names}}'
```

Обычно называется `amnezia-awg` или `amnezia-awg2`.

---

## Смена пароля

Отредактировать `.env` на сервере и перезапустить:

```bash
nano ~/srvmon/.env
cd ~/srvmon && sudo docker compose restart
```

---

## Архитектура

```
srvmon/
├── backend/                # Go сервер
│   ├── main.go             # Точка входа, роутер
│   ├── collectors/
│   │   ├── system.go       # CPU, RAM, диск, сеть (gopsutil)
│   │   └── amnezia.go      # Парсинг "awg show all dump"
│   ├── handlers/
│   │   ├── auth.go         # POST /api/auth/login
│   │   ├── ws.go           # GET /api/ws (WebSocket)
│   │   └── amnezia.go      # GET /api/amnezia
│   ├── middleware/
│   │   └── auth.go         # JWT middleware
│   └── models/
│       └── types.go        # Структуры данных
├── frontend/               # React приложение
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx
│       │   └── Dashboard.tsx
│       └── components/
│           ├── CPUChart.tsx
│           ├── NetworkChart.tsx
│           ├── MetricCard.tsx
│           └── AWGPanel.tsx
├── Dockerfile              # Multi-stage: node → go → alpine
├── docker-compose.yml
└── .env.example            # Шаблон переменных окружения
```

### Как работает мониторинг AmneziaWG

Приложение запускает `docker exec <container> awg show all dump` внутри контейнера srvmon через примонтированный Docker socket (`/var/run/docker.sock`). Результат парсится каждые 10 секунд и кэшируется.

Для доступа к метрикам хоста монтируются `/proc`, `/sys`, `/etc` через переменные `HOST_PROC`, `HOST_SYS`, `HOST_ETC`.

---

## Лицензия

MIT
