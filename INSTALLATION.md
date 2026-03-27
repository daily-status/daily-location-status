# prequirements
1. install docker desktop
1.1 github login credentials
2. Bot token

## install Docker
1. please follow [the official guide](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe?utm_source=docker&utm_medium=webreferral&utm_campaign=docs-driven-download-win-amd64&_gl=1*18twbcf*_gcl_au*MTI4ODI5Mzk2OS4xNzczMjQxNDc4*_ga*MTcwNjk5NDY5NC4xNzczMjQxNDc4*_ga_XJWPQMJYHQ*czE3NzQ1ODk5NjMkbzEwJGcxJHQxNzc0NTg5OTg1JGozOCRsMCRoMA..)

2. after installation is completed, open docker Desctop to start the engine. Agree and skip sign up.
3. Now that we can see on the bottom left that docker is running we can close docker desktop.

## Get Credentials
1. Go to https://github.com/settings/tokens/new to create an access token, make sure to give packages permmisions.
2. copy the access token.

## Prepare start_app.sh
1. download the [docker compose file](https://raw.githubusercontent.com/daily-status/daily-location-status/refs/heads/main/docker-compose.yml)

1. edit the the  TELEGRAM_BOT_TOKEN 
