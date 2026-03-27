# prequirements
1. install docker desktop
2. github login credentials
3. Bot token

## install Docker
1. please follow [the official guide](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe?utm_source=docker&utm_medium=webreferral&utm_campaign=docs-driven-download-win-amd64&_gl=1*18twbcf*_gcl_au*MTI4ODI5Mzk2OS4xNzczMjQxNDc4*_ga*MTcwNjk5NDY5NC4xNzczMjQxNDc4*_ga_XJWPQMJYHQ*czE3NzQ1ODk5NjMkbzEwJGcxJHQxNzc0NTg5OTg1JGozOCRsMCRoMA..)

2. after installation is completed, open docker Desctop to start the engine. Agree and skip sign up.
3. Now that we can see on the bottom left that docker is running we can close docker desktop.

## Get Credentials
1. Go to https://github.com/settings/tokens/new to create an access token, make sure to give packages permmisions.
2. copy the access token.

## Bot Token
please see the pdf manual in the repo.

# Getting Started
1. download [`docker-compose.yml`](https://raw.githubusercontent.com/daily-status/daily-location-status/refs/heads/main/docker-compose.yml)
2. download [`start_app.sh`](https://raw.githubusercontent.com/daily-status/daily-location-status/refs/heads/main/start_app.sh)
3. make sure they are in the same folder
4. edit in the docker-compose.yml, the TELEGRAM_BOT_TOKEN value to your token.
5. edit in the start_app.sh, username must be a member of the github organization, and the password will be the `ACCESS_TOKEN` created at Prequirements .2
6. you may run start_app.sh, the app will be visible at http://localhost:80/
