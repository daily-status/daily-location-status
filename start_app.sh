#!/usr/bin/env bash
# Cross-platform startup script for the project.

set -euo pipefail

# Default values
MODE=""
INSTALL_DEPS="false"

# Directories
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Functions
print_help() {
  cat <<EOF
Usage: ./start_app.sh [options]

Options:
  --native              Run the project natively using Node.js.
  --docker              Run the project using Docker Compose.
  --install-deps        Install dependencies for the selected mode.
  --help                Show this help message.

Examples:
  ./start_app.sh --native --install-deps
  ./start_app.sh --docker
EOF
}

install_native_deps() {
  echo "Installing dependencies for native setup..."
  cd "$BACKEND_DIR"
  npm install
  cd "$FRONTEND_DIR"
  npm install
}

install_docker_deps() {
  echo "Checking Docker and Docker Compose installation..."
  if ! command -v docker &>/dev/null; then
    echo "Error: Docker is not installed. Please install Docker."
    exit 1
  fi
  if ! command -v docker-compose &>/dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose."
    exit 1
  fi
  echo "Docker and Docker Compose are installed."
}

run_native() {
  echo "Starting the project natively..."
  cd "$BACKEND_DIR"
  npm run dev &
  BACKEND_PID=$!
  cd "$FRONTEND_DIR"
  npm run dev &
  FRONTEND_PID=$!
  echo "Backend and Frontend are running. Press Ctrl+C to stop."
  wait $BACKEND_PID $FRONTEND_PID
}

run_docker() {
  echo "Starting the project with Docker Compose..."
  docker-compose up
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --native)
      MODE="native"
      shift
      ;;
    --docker)
      MODE="docker"
      shift
      ;;
    --install-deps)
      INSTALL_DEPS="true"
      shift
      ;;
    --help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      print_help
      exit 1
      ;;
  esac
done

# Validate mode
if [[ -z "$MODE" ]]; then
  echo "Error: No mode specified. Use --native or --docker."
  print_help
  exit 1
fi

# Install dependencies if requested
if [[ "$INSTALL_DEPS" == "true" ]]; then
  if [[ "$MODE" == "native" ]]; then
    install_native_deps
  elif [[ "$MODE" == "docker" ]]; then
    install_docker_deps
  fi
fi

# Run the selected mode
if [[ "$MODE" == "native" ]]; then
  run_native
elif [[ "$MODE" == "docker" ]]; then
  run_docker
fi
