# Live Clipboard

![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.2-black.svg)
![React](https://img.shields.io/badge/React-19.2.3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)

A decentralized peer-to-peer (P2P) clipboard sharing application built with modern web technologies. Share your clipboard, files, and messages across devices in real-time without a central server using WebRTC.

## Features

- **Real-time P2P Clipboard Sync**: Share clipboard content instantly across devices
- **File Transfer**: Seamlessly transfer files between peers using WebRTC
- **Room-based Connections**: Create or join rooms with connection strings
- **End-to-End Encryption**: Optional password protection for secure sharing
- **Auto-Reconnection**: Automatically handles connection drops and reconnects
- **Cross-platform**: Works on any modern browser with WebRTC support
- **PWA Support**: Install as a progressive web app for native-like experience
- **Dark Mode**: Built-in dark/light theme support
- **Keyboard Shortcuts**: Efficient workflow with global keyboard shortcuts
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [State Management](#state-management)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Tech Stack

### Core Framework
- **Next.js 16.1.2** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript 5.7.2** - Type-safe JavaScript (strict mode)

### Styling & UI
- **Tailwind CSS 4.0.0** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Framer Motion 12.26.2** - Animation library
- **Lucide React** - Beautiful icon components
- **Heroicons** - Additional icon set

### State Management & Data
- **Zustand 5.0.10** - Lightweight state management
- **Crypto-JS 4.2.0** - Encryption for secure connections

### P2P Communication
- **Simple Peer 9.11.1** - WebRTC wrapper for P2P connections
- **WebRTC API** - Real-time peer-to-peer communication

### Utilities
- **UUID 13.0.0** - Unique ID generation
- **React Hot Toast 2.6.0** - Toast notifications
- **React Dropzone 14.3.8** - File drop zone component

### Development Tools
- **ESLint** - Code linting
- **Prettier 3.4.2** - Code formatting
- **Playwright 1.57.0** - End-to-end testing
- **TypeScript** - Static type checking

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │ Components   │  │    Hooks     │      │
│  │              │  │              │  │              │      │
│  │  - page.tsx  │  │ - RoomForm   │  │ - useWebRTC  │      │
│  │  - layout.tsx│  │ - PeerList   │  │ - useClipboard│     │
│  │  - demo/*    │  │ - Dropzone   │  │ - useRoom    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Zustand Store │                        │
│                    │                │                        │
│                    │ - roomStore    │                        │
│                    │ - peerStore    │                        │
│                    │ - clipboardStore│                       │
│                    │ - uiStore      │                        │
│                    └───────┬────────┘                        │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  WebRTC Layer  │                        │
│                    │                │                        │
│                    │ - PeerManager  │                        │
│                    │ - MessageBroker│                        │
│                    │ - Encryption   │                        │
│                    └───────┬────────┘                        │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Browser P2P   │
                    │                 │
                    │  WebRTC Data    │
                    │     Channels    │
                    └─────────────────┘
```

### Key Architectural Decisions

1. **Serverless Architecture**: No central server required; all communication happens directly between peers using WebRTC
2. **State Management**: Zustand provides a simple, performant state management solution without boilerplate
3. **Type Safety**: Comprehensive TypeScript definitions with strict mode enabled for better development experience
4. **Modular Design**: Clear separation of concerns with dedicated directories for components, hooks, lib, and stores
5. **Progressive Enhancement**: Core functionality works without JavaScript, with enhancements when enabled

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 22.21.1 or higher
- **npm** 10.9.4 or higher

Check your versions:
```bash
node --version
npm --version
```

### Installation

1. **Clone the repository** (if not already cloned):
```bash
git clone <repository-url>
cd live-clipboard
```

2. **Install dependencies**:
```bash
npm install --ignore-scripts
```

> **Note**: `--ignore-scripts` is used to avoid issues with optional dependencies on Windows.

3. **Set up environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your environment (see [Environment Variables](#environment-variables)).

4. **Run the development server**:
```bash
npm run dev
```

5. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file in the root directory (use `.env.example` as a template):

### Application Configuration

```bash
# Application
NEXT_PUBLIC_APP_NAME=Live Clipboard
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### Analytics (Optional)

```bash
# Google Analytics
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# PostHog Analytics
# NEXT_PUBLIC_POSTHOG_KEY=phc_
```

### Feature Flags

```bash
# Analytics & Error Tracking
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=false
```

### WebRTC Configuration

```bash
# Maximum number of peer connections
NEXT_PUBLIC_MAX_PEER_CONNECTIONS=10

# Peer connection timeout (milliseconds)
NEXT_PUBLIC_PEER_CONNECTION_TIMEOUT=30000
```

### File Transfer Configuration

```bash
# Maximum file size for transfer (bytes) - default: 100MB
NEXT_PUBLIC_MAX_FILE_SIZE=104857600

# Chunk size for file transfer (bytes) - default: 16KB
NEXT_PUBLIC_CHUNK_SIZE=16384
```

### Clipboard Configuration

```bash
# Clipboard sync interval (milliseconds)
NEXT_PUBLIC_CLIPBOARD_SYNC_INTERVAL=1000

# Maximum clipboard size (bytes) - default: 1MB
NEXT_PUBLIC_MAX_CLIPBOARD_SIZE=1048576
```

### Production Environment

For production, use `.env.production.example` as a template:

```bash
# Update the production URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Enable analytics (optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## Available Scripts

### Development

```bash
npm run dev
```
Start the development server with hot-reload enabled.

### Build

```bash
npm run build
```
Create an optimized production build.

```bash
npm run build:analyze
```
Build with bundle analysis enabled.

```bash
npm run build:production
```
Build for production and run verification scripts.

### Production

```bash
npm run start
```
Start the production server.

```bash
npm run start:production
```
Start production server with production environment variables.

### Code Quality

```bash
npm run lint
```
Run ESLint to check code quality.

```bash
npm run lint:fix
```
Automatically fix ESLint issues.

```bash
npm run format
```
Format code with Prettier.

```bash
npm run format:check
```
Check if code is formatted correctly.

```bash
npm run type-check
```
Run TypeScript type checking without emitting files.

### Testing

```bash
npm run test
```
Run Playwright tests.

```bash
npm run test:ui
```
Run tests with Playwright UI mode.

### Maintenance

```bash
npm run clean
```
Remove build artifacts (`.next`, `out`, `dist`).

```bash
npm run clean:all
```
Remove build artifacts and `node_modules`.

## Project Structure

```
live-clipboard/
├── public/                     # Static assets
│   ├── icon.svg
│   ├── apple-touch-icon.png
│   └── favicon.ico
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── globals.css         # Global styles
│   │   └── demo/               # Demo pages
│   ├── components/             # React components
│   │   ├── animated/           # Animated components
│   │   ├── layout/             # Layout components
│   │   ├── skeletons/          # Loading skeletons
│   │   ├── ClipboardSyncControl.tsx
│   │   ├── ConnectionStatusIndicator.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── FileDropzone.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── PeerList.tsx
│   │   ├── RoomCreationForm.tsx
│   │   └── ServiceWorkerRegister.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useClipboard.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useOfflineDetection.ts
│   │   ├── useTheme.ts
│   │   └── useWebRTC.ts
│   ├── lib/                    # Utility libraries
│   │   ├── animations/         # Animation variants
│   │   ├── clipboard/          # Clipboard utilities
│   │   ├── crypto/             # Encryption utilities
│   │   ├── service-worker/     # PWA service worker
│   │   ├── utils/              # General utilities
│   │   ├── webrtc/             # WebRTC utilities
│   │   ├── shadcn-utils.ts     # shadcn/ui utilities
│   │   └── utils.ts            # General utility functions
│   ├── store/                  # Zustand state management
│   │   ├── clipboardStore.ts   # Clipboard state
│   │   ├── messageStore.ts     # Message state
│   │   ├── peerStore.ts        # Peer state
│   │   ├── roomStore.ts        # Room state
│   │   ├── uiStore.ts          # UI state
│   │   └── index.ts            # Store exports
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts            # Central type definitions
│   └── ...
├── tests/                      # Playwright tests
├── docs/                       # Additional documentation
├── .env.example                # Environment variables template
├── .env.production.example     # Production environment template
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── playwright.config.ts        # Playwright test configuration
├── components.json             # shadcn/ui configuration
└── package.json                # Project dependencies
```

## Key Components

### Core Components

#### `RoomCreationForm`
Handles room creation and joining with connection string generation.

**Features:**
- Create new rooms with unique IDs
- Join existing rooms via connection strings
- Shareable room URLs
- Connection string format: `live-clipboard://room-id`

**Usage:**
```tsx
import { RoomCreationForm } from '@/components/RoomCreationForm';

<RoomCreationForm isLoading={false} />
```

#### `PeerList`
Displays connected peers with status indicators and metadata.

**Features:**
- Real-time peer status
- Connection state indicators
- Peer metadata display
- Responsive grid layout

**Usage:**
```tsx
import { PeerList } from '@/components/PeerList';

<PeerList peers={peers} localPeerId={localPeerId} />
```

#### `ConnectionStatusIndicator`
Visual indicator for connection state.

**States:**
- `disconnected` - Not connected
- `connecting` - Establishing connection
- `connected` - Successfully connected
- `reconnecting` - Attempting to reconnect
- `failed` - Connection failed

**Usage:**
```tsx
import { ConnectionStatusIndicator } from '@/components/ConnectionStatusIndicator';

<ConnectionStatusIndicator state="connected" size="lg" showLabel={true} />
```

#### `ClipboardSyncControl`
Toggle and manage clipboard synchronization.

**Features:**
- Enable/disable clipboard sync
- Display current clipboard content
- Sync status indicator
- History of synced items

**Usage:**
```tsx
import { ClipboardSyncControl } from '@/components/ClipboardSyncControl';

<ClipboardSyncControl />
```

#### `FileDropzone`
Drag-and-drop file transfer component.

**Features:**
- Drag and drop support
- File validation (size, type)
- Progress tracking
- Multiple file support

**Usage:**
```tsx
import { FileDropzone } from '@/components/FileDropzone';

<FileDropzone
  onFilesDrop={handleFilesDrop}
  maxSize={104857600}
  allowedTypes={['image/*', 'application/pdf']}
/>
```

### Animated Components

#### `AnimatedSection`, `AnimatedCard`, `AnimatedButton`, `AnimatedList`
Framer Motion wrappers with predefined animations for smooth UI transitions.

**Usage:**
```tsx
import { AnimatedSection, AnimatedCard } from '@/components/animated';

<AnimatedSection delay={0.1}>
  <AnimatedCard>
    Content here
  </AnimatedCard>
</AnimatedSection>
```

## State Management

The application uses **Zustand** for state management. Stores are organized by domain:

### Room Store (`roomStore`)

Manages room state and connections.

```typescript
interface RoomStore {
  // State
  currentRoom: Room | null;
  connectionString: string;
  shareUrl: string;
  error: string | null;
  connectionState: ConnectionState;

  // Actions
  createRoom: (roomId: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  setConnectionString: (str: string) => void;
}

// Usage
const { createRoom, currentRoom, connectionState } = useRoomStore();
```

### Peer Store (`peerStore`)

Manages connected peers.

```typescript
interface PeerStore {
  // State
  peers: Map<string, Peer>;
  localPeerId: string | null;
  selectedPeerId: string | null;

  // Actions
  setLocalPeerId: (id: string) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (id: string) => void;
  updatePeer: (id: string, updates: Partial<Peer>) => void;
  getAllPeers: () => Peer[];
}

// Usage
const { peers, addPeer, removePeer } = usePeerStore();
```

### Clipboard Store (`clipboardStore`)

Manages clipboard synchronization.

```typescript
interface ClipboardStore {
  // State
  items: ClipboardItem[];
  currentClipboard: string | null;
  syncEnabled: boolean;
  lastSync: Date | null;

  // Actions
  setCurrentClipboard: (content: string) => void;
  addClipboardItem: (item: ClipboardItem) => void;
  setSyncEnabled: (enabled: boolean) => void;
  clearHistory: () => void;
}

// Usage
const { currentClipboard, syncEnabled, setSyncEnabled } = useClipboardStore();
```

### UI Store (`uiStore`)

Manages UI state (theme, toasts, modals, etc.).

```typescript
interface UIStore {
  // State
  isLoading: boolean;
  theme: Theme;
  toasts: Toast[];
  sidebarOpen: boolean;

  // Actions
  setLoading: (loading: boolean) => void;
  setTheme: (theme: Theme) => void;
  addToast: (toast: Toast) => void;
  toggleSidebar: () => void;
}

// Usage
const { theme, setTheme, addToast } = useUIStore();
```

### Message Store (`messageStore`)

Manages message history and typing indicators.

```typescript
interface MessageStore {
  // State
  messages: Message[];
  typingIndicators: Map<string, TypingIndicator>;

  // Actions
  addMessage: (message: Message) => void;
  setTypingIndicator: (peerId: string, isTyping: boolean) => void;
  clearMessages: () => void;
}

// Usage
const { messages, addMessage } = useMessageStore();
```

## API Reference

### Custom Hooks

#### `useWebRTC`

Manages WebRTC peer connections.

```typescript
const {
  localPeerId,
  peers,
  connectionState,
  createRoom,
  joinRoom,
  leaveRoom,
  sendMessage,
  sendFile,
} = useWebRTC();
```

#### `useClipboard`

Manages clipboard operations with sync.

```typescript
const {
  clipboard,
  syncEnabled,
  setSyncEnabled,
  copyToClipboard,
  clearClipboard,
} = useClipboard();
```

#### `useTheme`

Manages application theme.

```typescript
const { theme, setTheme } = useTheme();

// Theme values: 'light' | 'dark' | 'system'
```

#### `useKeyboardShortcuts`

Registers global keyboard shortcuts.

```typescript
useKeyboardShortcuts({
  'Ctrl+K': () => console.log('Command palette'),
  'Ctrl+C': () => console.log('Copy'),
});
```

#### `useOfflineDetection`

Detects online/offline status.

```typescript
const { isOnline, offlineSince } = useOfflineDetection();
```

### Utility Functions

#### `generateRoomId()`

Generates a unique room ID.

```typescript
import { generateRoomId } from '@/lib/utils/room-id-generator';

const roomId = generateRoomId(); // e.g., 'abc-123-xyz'
```

#### `generateConnectionString(roomId)`

Generates a connection string for sharing.

```typescript
import { generateConnectionString } from '@/lib/webrtc/connection-string-generator';

const connectionString = generateConnectionString('room-123');
// 'live-clipboard://room-123'
```

#### `encryptPassword(password, roomId)`

Encrypts a password for room protection.

```typescript
import { encryptPassword } from '@/lib/crypto/password-encryption';

const encrypted = await encryptPassword('mypassword', 'room-123');
```

#### `validateFile(file, options)`

Validates files before transfer.

```typescript
import { validateFile } from '@/lib/utils/file-validation';

const result = validateFile(file, {
  maxSize: 104857600, // 100MB
  allowedTypes: ['image/*', 'application/pdf'],
});

if (result.isValid) {
  // Proceed with upload
} else {
  console.error(result.error);
}
```

## Deployment

### Deploy to Vercel

1. **Push to GitHub**:
```bash
git push origin main
```

2. **Import on Vercel**:
- Go to [vercel.com](https://vercel.com)
- Import your repository
- Vercel will detect Next.js and configure automatically

3. **Environment Variables**:
Add your production environment variables in Vercel dashboard.

4. **Deploy**:
Click "Deploy" - Vercel will handle the rest!

### Deploy to Netlify

1. **Build Command**:
```bash
npm run build:production
```

2. **Publish Directory**:
`.next`

3. **Environment Variables**:
Set up in Netlify dashboard using `.env.production.example` as reference.

### Manual Deployment

1. **Build**:
```bash
npm run build:production
```

2. **Start**:
```bash
npm run start:production
```

3. **Production Server**:
The app will be available at the configured `NEXT_PUBLIC_APP_URL`.

### Docker Deployment

Live Clipboard is available as a production-ready Docker image on Docker Hub: **`throwaway0acc/live-clipboard`**

The image includes:
- Next.js standalone build
- Nginx reverse proxy for optimal performance
- Runtime environment variable support
- Multi-architecture support (amd64, arm64)

#### Quick Start - Pull from Docker Hub (SSL enabled)

Run the pre-built image directly:

```bash
docker run -d \
  -p 8080:8080 \
  -p 8443:8443 \
  -e NEXT_PUBLIC_APP_URL="https://localhost:8443" \
  throwaway0acc/live-clipboard:latest
```

Access the application at `https://localhost:8443` (self-signed cert).

#### Docker Run with Custom Configuration

```bash
docker run -d \
  --name live-clipboard \
  -p 8080:8080 \
  -p 8443:8443 \
  -e NEXT_PUBLIC_APP_NAME="My Clipboard" \
  -e NEXT_PUBLIC_APP_URL="https://clipboard.example.com" \
  -e NEXT_PUBLIC_MAX_FILE_SIZE="209715200" \
  -e NEXT_PUBLIC_MAX_PEER_CONNECTIONS="20" \
  -e NEXT_PUBLIC_ENABLE_ANALYTICS="false" \
  -e NGINX_CLIENT_MAX_BODY_SIZE="200m" \
  -e HOST_IP="192.168.1.100" \
  throwaway0acc/live-clipboard:latest
```

#### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  live-clipboard:
    image: throwaway0acc/live-clipboard:latest
    container_name: live-clipboard
    ports:
      - "8080:8080"
      - "8443:8443"
    environment:
      # Network Configuration
      HOST_IP: "${HOST_IP:-}" # Optional: Set your LAN IP in .env for QR codes

      # Application Configuration
      NEXT_PUBLIC_APP_NAME: "Live Clipboard"
      NEXT_PUBLIC_APP_URL: "https://localhost:8443"
      
      # Feature Flags
      NEXT_PUBLIC_ENABLE_ANALYTICS: "false"
      NEXT_PUBLIC_ENABLE_ERROR_TRACKING: "false"
      
      # WebRTC Configuration
      NEXT_PUBLIC_MAX_PEER_CONNECTIONS: "10"
      NEXT_PUBLIC_PEER_CONNECTION_TIMEOUT: "30000"
      
      # File Transfer Configuration (100MB default)
      NEXT_PUBLIC_MAX_FILE_SIZE: "104857600"
      NEXT_PUBLIC_CHUNK_SIZE: "16384"
      
      # Clipboard Configuration
      NEXT_PUBLIC_CLIPBOARD_SYNC_INTERVAL: "1000"
      NEXT_PUBLIC_MAX_CLIPBOARD_SIZE: "1048576"
      
      # Nginx Configuration
      NGINX_PORT: "8080"
      NGINX_SSL_PORT: "8443"
      NGINX_ENABLE_SSL: "true"
      NGINX_CLIENT_MAX_BODY_SIZE: "100m"
      
      # Optional Analytics
      # NEXT_PUBLIC_GA_ID: "G-XXXXXXXXXX"
      # NEXT_PUBLIC_POSTHOG_KEY: "phc_"
    restart: unless-stopped
```

Start with:
```bash
docker-compose up -d
```

#### Environment Variables Reference

##### Application Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | `Live Clipboard` | Application display name |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:8080` | Public URL for the application |
| `NODE_ENV` | `production` | Node environment |
| `HOST_IP` | - | (Docker only) Host LAN IP for QR codes |

##### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Enable Google Analytics/PostHog |
| `NEXT_PUBLIC_ENABLE_ERROR_TRACKING` | `false` | Enable error tracking |

##### WebRTC Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_MAX_PEER_CONNECTIONS` | `10` | Maximum simultaneous peer connections |
| `NEXT_PUBLIC_PEER_CONNECTION_TIMEOUT` | `30000` | Connection timeout in milliseconds |

##### File Transfer Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_MAX_FILE_SIZE` | `104857600` | Max file size in bytes (100MB) |
| `NEXT_PUBLIC_CHUNK_SIZE` | `16384` | File chunk size in bytes (16KB) |

##### Clipboard Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CLIPBOARD_SYNC_INTERVAL` | `1000` | Sync interval in milliseconds |
| `NEXT_PUBLIC_MAX_CLIPBOARD_SIZE` | `1048576` | Max clipboard size in bytes (1MB) |

##### Nginx Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NGINX_PORT` | `8080` | Nginx listening port |
| `NGINX_SSL_PORT` | `8443` | Nginx HTTPS port |
| `NGINX_ENABLE_SSL` | `true` | Enable HTTPS listener |
| `NGINX_SSL_CERT_PATH` | `/etc/nginx/certs/selfsigned.crt` | SSL certificate path |
| `NGINX_SSL_KEY_PATH` | `/etc/nginx/certs/selfsigned.key` | SSL key path |
| `NGINX_SSL_CN` | `localhost` | Self-signed certificate CN |
| `NGINX_CLIENT_MAX_BODY_SIZE` | `100m` | Max request body size |
| `UPSTREAM_PORT` | `3000` | Internal Next.js port |

##### Optional Analytics

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_GA_ID` | - | Google Analytics tracking ID |
| `NEXT_PUBLIC_POSTHOG_KEY` | - | PostHog analytics key |

#### Production Deployment Example

For production with custom domain and SSL (behind reverse proxy):

```bash
docker run -d \
  --name live-clipboard-prod \
  -p 3000:8080 \
  -p 3443:8443 \
  -e NEXT_PUBLIC_APP_NAME="Live Clipboard" \
  -e NEXT_PUBLIC_APP_URL="https://clipboard.yourdomain.com" \
  -e NEXT_PUBLIC_MAX_FILE_SIZE="209715200" \
  -e NEXT_PUBLIC_ENABLE_ANALYTICS="true" \
  -e NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX" \
  -e NGINX_CLIENT_MAX_BODY_SIZE="200m" \
  --restart unless-stopped \
  throwaway0acc/live-clipboard:latest
```

Then configure your reverse proxy (Nginx, Caddy, Traefik) to forward to port 3000. If you terminate TLS at the proxy, you can disable internal SSL with `NGINX_ENABLE_SSL=false`.

#### Build Your Own Image

If you want to build from source:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_NAME="Live Clipboard" \
  --build-arg NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  --build-arg NEXT_PUBLIC_ENABLE_ANALYTICS="false" \
  --build-arg NEXT_PUBLIC_ENABLE_ERROR_TRACKING="false" \
  --build-arg NEXT_PUBLIC_MAX_PEER_CONNECTIONS="10" \
  --build-arg NEXT_PUBLIC_PEER_CONNECTION_TIMEOUT="30000" \
  --build-arg NEXT_PUBLIC_MAX_FILE_SIZE="104857600" \
  --build-arg NEXT_PUBLIC_CHUNK_SIZE="16384" \
  --build-arg NEXT_PUBLIC_CLIPBOARD_SYNC_INTERVAL="1000" \
  --build-arg NEXT_PUBLIC_MAX_CLIPBOARD_SIZE="1048576" \
  -t live-clipboard:latest .
```

**Note**: Variables prefixed with `NEXT_PUBLIC_` are baked into the client bundle at build time, so they must be passed as `--build-arg`. Runtime-only variables can be passed with `-e` when running the container.

#### Container Health Check

Check if the container is running:

```bash
docker ps | grep live-clipboard
```

View logs:

```bash
docker logs live-clipboard
```

Access container shell:

```bash
docker exec -it live-clipboard sh
```

#### Troubleshooting

**Port already in use:**
```bash
# Use a different port
docker run -p 9090:8080 throwaway0acc/live-clipboard:latest
```

**File upload fails:**
```bash
# Increase max body size
docker run -e NGINX_CLIENT_MAX_BODY_SIZE="500m" throwaway0acc/live-clipboard:latest
```

**Check container logs:**
```bash
docker logs -f live-clipboard
```

#### Available Tags

- `latest` - Latest stable release
- `0.1.1` - Specific version

Pull specific version:
```bash
docker pull throwaway0acc/live-clipboard:0.1.1
```

## Testing

### Playwright Tests

Run the test suite:

```bash
npm run test
```

Run tests in UI mode:

```bash
npm run test:ui
```

Run specific test file:

```bash
npx playwright test path/to/test.spec.ts
```

### Test Structure

```
tests/
├── e2e/
│   ├── room-creation.spec.ts
│   ├── peer-connection.spec.ts
│   ├── clipboard-sync.spec.ts
│   └── file-transfer.spec.ts
└── utils/
    └── test-helpers.ts
```

### Example Test

```typescript
import { test, expect } from '@playwright/test';

test('should create a room', async ({ page }) => {
  await page.goto('/');

  await page.click('button:has-text("Create Room")');
  await expect(page.locator('[data-testid="room-id"]')).toBeVisible();
});
```

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork and branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes** following our coding standards:
- Use TypeScript with strict mode
- Follow ESLint rules
- Format with Prettier
- Write tests for new features

3. **Test your changes**:
```bash
npm run lint
npm run type-check
npm run test
```

5. **Push and create a PR**:
```bash
git push origin feature/your-feature-name
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line Width**: 80 characters
- **Components**: PascalCase
- **Functions**: camelCase

### Pull Request Guidelines

- Describe your changes clearly
- Link related issues
- Ensure all tests pass
- Update documentation if needed
- Request review from maintainers

## License

This project is licensed under the **ISC License**.

## Acknowledgments

- **Next.js** team for the amazing framework
- **shadcn** for beautiful UI components
- **WebRTC** community for P2P technology
- All contributors and users of Live Clipboard

## Support

- **Issues**: Report bugs and feature requests on GitHub Issues
- **Discussions**: Join discussions on GitHub Discussions
- **Email**: [your-email@example.com]

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WebRTC Guide](https://webrtc.org/getting-started)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Playwright Documentation](https://playwright.dev)

---

Made with love by the Live Clipboard team
