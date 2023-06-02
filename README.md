# Life tracker

This is the backend for my [telegram bot](https://github.com/DarkAbhi/life-tg-bot) that I use to track some of my personal data.

Yes, Django is a bit too much at this stage. I do plan to scale this at some point, where I think Django would better serve my purpose.

### Setup to run

Create a .env file with the following variables, replace the values inside `{}` with your values.

```
DB_NAME={db_name}
DB_USERNAME={db_username}
DB_PASSWORD={db_password}
DB_HOSTNAME={db_hostname}
DB_PORT={db_port}

ALLOWED_HOSTS={allowed_hosts}
SECRET_KEY={secret_key}

NGINX_PORT={nginx_port}
```