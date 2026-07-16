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
DB_SSLMODE={db_sslmode}

BOT_API_KEY={telegram_bot_api_key}
```

Run the production version using

```
make deploy
```

## Project structure

```
life-backend/
├── docker-compose.dev.yml
├── docker-compose.yml
├── Dockerfile (per-service in subfolders)
├── LICENSE
├── Makefile
├── README.md
├── go-backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   ├── Makefile
│   ├── cmd/
│   │   └── main.go
│   ├── internal/
│   │   ├── db/
│   │   │   ├── migrations.go
│   │   │   └── postgres.go
│   │   └── handlers/
│   │       ├── api.go
│   │       ├── auth.go
│   │       ├── auth_test.go
│   │       ├── dates.go
│   │       ├── fuel.go
│   │       ├── gym_exercises.go
│   │       ├── gym_reminders.go
│   │       ├── gym_visits.go
│   │       ├── handlers.go
│   │       ├── handlers_test.go
│   │       ├── health.go
│   │       ├── helpers.go
│   │       ├── next_month_purchases.go
│   │       ├── notifications.go
│   │       ├── profile.go
│   │       ├── vehicle_air_fills.go
│   │       └── vehicle_history.go
│   ├── migrations/
│   │   ├── 00001_init.down.sql
│   │   ├── 00001_init.up.sql
│   │   ├── 00002_auth.down.sql
│   │   ├── 00002_auth.up.sql
│   │   ├── 00003_user_profiles.down.sql
│   │   ├── 00003_user_profiles.up.sql
│   │   ├── 00004_gym_exercises.down.sql
│   │   ├── 00004_gym_exercises.up.sql
│   │   ├── 00005_notifications.down.sql
│   │   ├── 00005_notifications.up.sql
│   │   ├── 00006_vehicle_air_fills.down.sql
│   │   ├── 00006_vehicle_air_fills.up.sql
│   │   ├── 00007_vehicle_fuel.down.sql
│   │   ├── 00007_vehicle_fuel.up.sql
│   │   ├── 00008_next_month_purchases.down.sql
│   │   ├── 00008_next_month_purchases.up.sql
│   │   ├── 00009_gym_reminders.down.sql
│   │   └── 00009_gym_reminders.up.sql
│   └── tmp/
│       ├── build-errors
│       └── main
├── life-tracker-frontend/
│   ├── Dockerfile
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── README.md
│   ├── tsconfig.json
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── components/
│   │   │   ├── fuel-form.tsx
│   │   │   └── notification-list.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── garage/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── gym-visits/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── next-month/
│   │   │   └── page.tsx
│   │   └── notifications/
│   │       └── page.tsx
│   └── public/
├── telegram-bot/
│   ├── Dockerfile
│   ├── api_constants.py
│   ├── constants.py
│   ├── main.py
│   ├── requirements.txt
│   └── utils.py
```
