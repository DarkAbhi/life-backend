# Life tracker

This is the backend that I use to track some of my personal data using a telegram bot.

Yes, Django is a bit too much at this stage. I do plan to scale this at some point, where I think Django would better serve my purpose.

### Setup to run

Create a .env file with the following variables, replace the values inside `{}` with your values.

```
APP_ENV=production|development

DB_NAME={db_name}
DB_USERNAME={db_username}
DB_PASSWORD={db_password}
DB_HOSTNAME={db_hostname}
DB_PORT={db_port}

BOT_API_KEY={telegram_bot_api_key}
```

Run the production version using
```
make deploy
```

## Project structure

```
life-backend/
├── docker-compose.prod.yml
├── docker-compose.yml
├── go-backend/
│   ├── cmd/
│   │   └── main.go
│   ├── coverage.out
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   ├── internal/
│   │   ├── db/
│   │   │   ├── migrations.go
│   │   │   └── postgres.go
│   │   └── handlers/
│   │       ├── api.go
│   │       ├── dates.go
│   │       ├── handlers.go
│   │       ├── handlers_test.go
│   │       ├── health.go
│   │       └── helpers.go
│   ├── Makefile
│   ├── migrations/
│   │   ├── 00001_init.down.sql
│   │   └── 00001_init.up.sql
│   └── tmp/
│       ├── build-errors
│       ├── build-errors.log
│       └── main
├── LICENSE
├── life-tracker-frontend/
│   └── app
├── Makefile
├── README.md
└── telegram-bot/
```