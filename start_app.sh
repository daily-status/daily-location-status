# Define variables at the beginning
password=""
username=""

# Use the variables for Docker login
echo "$password" | docker login ghcr.io -u "$username" --password-stdin

docker compose up -d