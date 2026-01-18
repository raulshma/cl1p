param(
  [Parameter(Mandatory=$true)]
  [string]$DockerHubUser,

  [Parameter(Mandatory=$true)]
  [string]$Version,

  [string]$ImageName = "live-clipboard",
  [string]$AppName = "Live Clipboard",
  [string]$AppUrl = "https://example.com",
  [string]$EnableAnalytics = "false",
  [string]$EnableErrorTracking = "false",
  [string]$MaxPeerConnections = "10",
  [string]$PeerConnectionTimeout = "30000",
  [string]$MaxFileSize = "6442450944",
  [string]$ChunkSize = "16384",
  [string]$ClipboardSyncInterval = "1000",
  [string]$MaxClipboardSize = "1048576",
  [string]$GaId = "",
  [string]$PosthogKey = ""
)

$ErrorActionPreference = "Stop"

$fullImage = "$DockerHubUser/$ImageName"

Write-Host "Logging in to Docker Hub..."
docker login

Write-Host "Building multi-arch image..."
$buildArgs = @(
  "--build-arg", "NEXT_PUBLIC_APP_NAME=$AppName",
  "--build-arg", "NEXT_PUBLIC_APP_URL=$AppUrl",
  "--build-arg", "NEXT_PUBLIC_ENABLE_ANALYTICS=$EnableAnalytics",
  "--build-arg", "NEXT_PUBLIC_ENABLE_ERROR_TRACKING=$EnableErrorTracking",
  "--build-arg", "NEXT_PUBLIC_MAX_PEER_CONNECTIONS=$MaxPeerConnections",
  "--build-arg", "NEXT_PUBLIC_PEER_CONNECTION_TIMEOUT=$PeerConnectionTimeout",
  "--build-arg", "NEXT_PUBLIC_MAX_FILE_SIZE=$MaxFileSize",
  "--build-arg", "NEXT_PUBLIC_CHUNK_SIZE=$ChunkSize",
  "--build-arg", "NEXT_PUBLIC_CLIPBOARD_SYNC_INTERVAL=$ClipboardSyncInterval",
  "--build-arg", "NEXT_PUBLIC_MAX_CLIPBOARD_SIZE=$MaxClipboardSize",
  "--build-arg", "NEXT_PUBLIC_GA_ID=$GaId",
  "--build-arg", "NEXT_PUBLIC_POSTHOG_KEY=$PosthogKey"
)

$tags = @(
  "--tag", "${fullImage}:latest",
  "--tag", "${fullImage}:${Version}"
)

$platforms = "linux/amd64,linux/arm64"

$cmd = @(
  "buildx", "build",
  "--platform", $platforms,
  "--push",
  "--file", "Dockerfile"
) + $buildArgs + $tags + @(".")

& docker @cmd

Write-Host "Published: $fullImage (latest, $Version)"