<#
.SYNOPSIS
One-click Windows installer for the Daily Location Status system.

.DESCRIPTION
This script is aimed at non-technical users. It will:
1. Check for WSL (needed by Docker Desktop on Windows).
2. Install Docker Desktop, Node.js LTS, and Git via winget if they are missing.
3. Clone the repository and switch to the `dev` branch.
4. Write a `.env` file using the multi-line string defined at the top of this file.
5. Start the database container (`docker compose up -d db`).
6. Install backend dependencies and run the database build/update tasks.
7. Install frontend dependencies.
8. Launch the backend and frontend in separate processes.

.NOTES
- Run this script from an elevated PowerShell window (Run as Administrator) so winget
  installs and WSL setup can succeed without prompts.
- If you already cloned the repository, the script will reuse the existing folder and
  simply switch to the requested branch.
- Edit the `$EnvFileContent` block below before running so it contains your real values.
#>

Set-StrictMode -Version 3
$ErrorActionPreference = "Stop"

function New-RandomSecret {
    $bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    return [System.Convert]::ToBase64String($bytes)
}

# ---------------------------------------------------------------------------
# 1) Update this block with your real environment values before running.
#    The content will be written to `<repo>/.env`.
# ---------------------------------------------------------------------------
$GeneratedJwtSecret = New-RandomSecret
$EnvFileContent = @"
# Example .env content for local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/daily_location_status
JWT_SECRET=$GeneratedJwtSecret
VITE_API_BASE_URL=http://localhost:8000
PORT=8000
"@

param(
    # Where the repository should live. Defaults to the repo root if the script
    # is already inside the repo; otherwise falls back to ~/daily-location-status.
    [string]$InstallDir,

    # Repository details
    [string]$RepoUrl = "https://github.com/daily-status/daily-location-status.git",
    [string]$Branch = "dev",

    # Skip installing Docker/Node/Git (fails if missing).
    [switch]$SkipPrereqInstall,

    # Skip bringing up the database container.
    [switch]$SkipDockerUp,

    # Overwrite an existing .env file instead of keeping it.
    [switch]$ForceEnvOverwrite
)

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Get-RepoRoot {
    param([string]$StartPath)

    $current = [System.IO.Path]::GetFullPath($StartPath)
    while ($true) {
        if (Test-Path (Join-Path $current ".git")) {
            return $current
        }

        $parent = Split-Path $current -Parent
        if (-not $parent -or $parent -eq $current) {
            return $null
        }
        $current = $parent
    }
}

function Ensure-Winget {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "winget is required to install prerequisites. Please install winget or install Docker Desktop, Node.js, and Git manually."
    }
}

function Ensure-WSL {
    $wslCmd = Get-Command wsl.exe -ErrorAction SilentlyContinue
    if (-not $wslCmd) {
        Write-Warning "WSL was not detected. Docker Desktop can configure WSL during installation; if you prefer, run 'wsl --install' and reboot first."
        return
    }

    try {
        wsl.exe --status | Out-Null
        Write-Host "WSL detected."
    } catch {
        Write-Warning "WSL is present but not initialized. Run 'wsl --install' in an elevated shell and reboot, then rerun this script."
    }
}

function Ensure-Package {
    param(
        [string]$CommandName,
        [string]$WingetId,
        [string]$DisplayName
    )

    if (Get-Command $CommandName -ErrorAction SilentlyContinue) {
        Write-Host "$DisplayName already installed."
        return
    }

    if ($SkipPrereqInstall) {
        throw "$DisplayName is missing and --SkipPrereqInstall was set. Install it and rerun."
    }

    Ensure-Winget
    Write-Host "Installing $DisplayName via winget..."
    winget install --id $WingetId -e --accept-package-agreements --accept-source-agreements

    if ($LASTEXITCODE -ne 0) {
        throw "Automatic install failed for $DisplayName (exit code $LASTEXITCODE)."
    }

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Failed to install $DisplayName automatically. Please install it manually and rerun."
    }
}

function Ensure-Repository {
    param(
        [string]$RepoPath,
        [string]$RepoUrl,
        [string]$Branch
    )

    if (-not (Test-Path $RepoPath)) {
        New-Item -ItemType Directory -Path $RepoPath | Out-Null
    }

    $gitDir = Join-Path $RepoPath ".git"
    if (-not (Test-Path $gitDir)) {
        $existingItems = Get-ChildItem -Path $RepoPath -Force -ErrorAction SilentlyContinue
        if ($existingItems.Count -gt 0) {
            throw "Path $RepoPath exists but is not a git repository. Please point InstallDir to an empty folder."
        }

        Write-Host "Cloning repository into $RepoPath..."
        git clone $RepoUrl $RepoPath
    }

    Push-Location $RepoPath
    Write-Host "Switching to branch '$Branch'..."
    git fetch origin --prune
    git rev-parse --verify --quiet $Branch | Out-Null

    if ($LASTEXITCODE -ne 0) {
        git ls-remote --exit-code --heads origin $Branch | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Branch '$Branch' was not found on origin."
        }

        git switch -c $Branch origin/$Branch
    } else {
        git switch $Branch
        git pull --ff-only origin $Branch
    }
    Pop-Location
}

function Write-EnvFile {
    param(
        [string]$RepoPath,
        [string]$Content,
        [switch]$Force
    )

    $envPath = Join-Path $RepoPath ".env"
    if ((Test-Path $envPath) -and -not $Force) {
        Write-Host ".env already exists. Keeping existing file (use -ForceEnvOverwrite to replace)."
        return
    }

    Write-Host "Writing .env to $envPath ..."
    Set-Content -Path $envPath -Value $Content -Encoding UTF8 -Force
}

function Invoke-DockerComposeDb {
    param(
        [string]$RepoPath
    )

    if ($SkipDockerUp) {
        Write-Host "Skipping Docker DB startup (requested)."
        return
    }

    $composeFile = Get-ChildItem -Path $RepoPath -Filter "docker-compose*.yml" -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $composeFile) {
        Write-Warning "No docker-compose file found in $RepoPath. Skipping database container startup."
        return
    }

    $dockerCmd = Get-Command "docker" -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        throw "Docker CLI not found. Install Docker Desktop first."
    }

    Write-Host "Starting database container from $($composeFile.Name)..."
    if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
        & docker-compose -f $composeFile.FullName up -d db
    } else {
        & docker compose -f $composeFile.FullName up -d db
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start database container (exit code $LASTEXITCODE)."
    }
}

function Run-NpmStep {
    param(
        [string]$WorkingDirectory,
        [object[]]$Commands
    )

    if (-not (Test-Path $WorkingDirectory)) {
        Write-Warning "Directory not found: $WorkingDirectory. Skipping."
        return
    }

    Push-Location $WorkingDirectory
    foreach ($cmd in $Commands) {
        Write-Host "Running 'npm $cmd' in $WorkingDirectory ..."
        $parts = @($cmd)

        $npmProcess = Start-Process -FilePath "npm" -ArgumentList $parts -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru
        if (-not $npmProcess -or $npmProcess.ExitCode -ne 0) {
            throw "npm $cmd failed with exit code $($npmProcess.ExitCode)."
        }
    }
    Pop-Location
}

function Launch-AppProcesses {
    param(
        [string]$BackendDir,
        [string]$FrontendDir
    )

    if (Test-Path $BackendDir) {
        Write-Host "Starting backend (new window) ..."
        $script:backendProcess = Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $BackendDir -WindowStyle Normal -PassThru
        if (-not $script:backendProcess) {
            Write-Warning "Backend process did not start."
        } else {
            Write-Host "Backend running (PID $($script:backendProcess.Id))."
        }
    } else {
        Write-Warning "Backend directory not found. Cannot start backend process."
    }

    if (Test-Path $FrontendDir) {
        Write-Host "Starting frontend (new window) ..."
        $script:frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $FrontendDir -WindowStyle Normal -PassThru
        if (-not $script:frontendProcess) {
            Write-Warning "Frontend process did not start."
        } else {
            Write-Host "Frontend running (PID $($script:frontendProcess.Id))."
        }
    } else {
        Write-Warning "Frontend directory not found. Cannot start frontend process."
    }
}

# ---------------------------------------------------------------------------
# Resolve defaults and begin steps
# ---------------------------------------------------------------------------
$resolvedInstallDir = if ($InstallDir) {
    [System.IO.Path]::GetFullPath($InstallDir)
} elseif ($PSScriptRoot) {
    $repoFromScript = Get-RepoRoot $PSScriptRoot
    if ($repoFromScript) {
        $repoFromScript
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\\.."))
    }
} else {
    [System.IO.Path]::GetFullPath((Join-Path $HOME "daily-location-status"))
}
$repoPath = $resolvedInstallDir.ToString()
$backendDir = Join-Path $repoPath "backend"
$frontendDir = Join-Path $repoPath "frontend"

Write-Header "Step 1/8 - Checking WSL"
Ensure-WSL

Write-Header "Step 2/8 - Ensuring Docker Desktop"
Ensure-Package -CommandName "docker" -WingetId "Docker.DockerDesktop" -DisplayName "Docker Desktop"

Write-Header "Step 3/8 - Ensuring Node.js LTS"
Ensure-Package -CommandName "node" -WingetId "OpenJS.NodeJS.LTS" -DisplayName "Node.js (LTS)"

Write-Header "Step 4/8 - Ensuring Git"
Ensure-Package -CommandName "git" -WingetId "Git.Git" -DisplayName "Git"

Write-Header "Step 5/8 - Cloning repository and switching branch"
Ensure-Repository -RepoPath $repoPath -RepoUrl $RepoUrl -Branch $Branch

Write-Header "Step 6/8 - Creating .env"
Write-EnvFile -RepoPath $repoPath -Content $EnvFileContent -Force:$ForceEnvOverwrite

Write-Header "Step 7/8 - Starting database container"
Invoke-DockerComposeDb -RepoPath $repoPath

Write-Header "Step 8/8 - Installing dependencies and starting apps"
Run-NpmStep -WorkingDirectory $backendDir -Commands @(@("install"), @("run","build:db"), @("run","update:db"))
Run-NpmStep -WorkingDirectory $frontendDir -Commands @(@("install"))
Launch-AppProcesses -BackendDir $backendDir -FrontendDir $frontendDir

Write-Host ""
Write-Host "All steps completed. Backend and frontend processes were launched in separate windows (if available)." -ForegroundColor Green
