# bob - Builder CLI

A command-line tool for syncing and managing frappe/builder pages between your local workspace and a Frappe server. This tool enables real-time synchronization, local file watching, and seamless collaboration with remote server changes.

## Features

- **Real-time Synchronization**: Watch local and remote changes simultaneously
- **Two-way Sync**: Push local updates to the server and pull remote changes locally
- **Socket.IO Integration**: Instant notifications of server-side updates
- **Quick Reloading**: Monitor file changes and automatically sync updates

## Installation

```bash
git clone https://github.com/stravo1/bob
cd bob
npm install
npm run build
# optionally link for development
npm link
```

## Configuration

The tool uses a `config.json` file to store connection settings:

```json
{
  "siteUrl": "https://sample.m.frappe.cloud",
  "siteName": "sample.m.frappe.cloud",
  "authToken": "key:secret",
  "socketioPort": 3000
}
```

## Commands

### `init` - Initialize Your Workspace

Set up a new local workspace by connecting to your Frappe server and syncing all pages.

```bash
bob init --site-name <name> --site-url <url> --token <token> [options]
```

**Options:**
- `-s, --site-name <name>` (required): Name of the site
- `-u, --site-url <url>` (required): URL of the Frappe server
- `-t, --token <token>` (required): Authentication token for the server
- `-p, --socketio-port <port>` (optional): Socket.IO port (defaults to site URL port)
- `--force`: Force initialization even if config already exists
- `--only-cli`: Skip interactive prompts

**Example:**
```bash
bob init --site-name "sample.m.frappe.cloud" --site-url "https://sample.m.frappe.cloud" --token "key:secret"
```

### `watch` - Sync Changes in Real-time

Monitor local files and server changes, syncing updates bidirectionally in real-time.

```bash
bob watch
```

This command:
- Watches for changes in the `pages/` directory
- Automatically syncs local changes to the server
- Listens for remote server updates via Socket.IO
- Maintains synchronization timestamps to avoid conflicts

### `pull` - Fetch Latest Data from Server

Manually pull the latest pages and data from the server.

```bash
bob pull
```

This will:
- Fetch all pages from the server
- Create or update local page directories
- Remove local directories for pages that no longer exist on the server

### `push` - Push Local Changes to Server

Push your local changes to the remote server.

```bash
bob push
```

## Usage Examples

### Getting Started

1. **Initialize a new workspace:**
   ```bash
   cd my-workspace
   bob init \
     --site-name "sample.m.frappe.cloud" \
     --site-url "https://sample.m.frappe.cloud" \
     --token "key:secret"
   ```

2. **Start watching for changes:**
   ```bash
   bob watch
   ```

3. **Make changes locally** in the `pages/` directory, and they'll automatically sync to the server.

4. **Manually pull updates:**
   ```bash
   bob pull
   ```

## Project Structure

```
bob/
├── src/
│   ├── commands/          # CLI command implementations
│   │   ├── init.ts       # Initialize workspace
│   │   ├── watch.ts      # Watch and sync changes
│   │   ├── pull.ts       # Pull pages from server
│   │   └── push.ts       # Push changes to server
│   ├── lib/              # Core library functions
│   │   ├── buildPage.ts  # Page building logic
│   │   ├── frappeClient.ts # Server API client
│   │   ├── writePage.ts  # Write page to local filesystem
│   │   └── writeBlock.ts # Block file writing
│   ├── utils/            # Utility functions
│   │   ├── file.ts       # File system operations
│   │   └── logger.ts     # Logging utilities
│   ├── global.d.ts       # Global type definitions
│   └── index.ts          # CLI entry point
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Page Structure

Pages are organized in a `pages/` directory with the following structure:

```
pages/
└── page-name_page-id/
    ├── page.json         # Page metadata and configuration
    ├── head.html         # Page head content
    ├── body.html         # Page body content
    ├── data.py           # Page data script
    └── blocks/           # Page blocks directory
        └── block-name_block-id/
            ├── block.json
            ├── client_script.js
            └── data_script.py
```

## Authentication

Obtain an authentication token from your Frappe server:

1. Log in to your Frappe site
2. Navigate to your user profile
3. Scroll to the "API Access" section
4. Generate or copy your API token

## License

This project is licensed under the MIT License - see the LICENSE file for details.

