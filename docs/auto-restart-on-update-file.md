# Auto-Restart on Update File (CI/CD)

> An opt-in feature that lets txAdmin automatically schedule a server restart when a file appears in the server data folder. It is designed to make **CI/CD-based deployments** a one-step operation.

## Overview

When enabled, txAdmin periodically looks for an *update file* (named `.update` by default) in the root of the **Server Data folder** — the same folder that usually contains your `server.cfg`. If the file is found, txAdmin:

1. Reads its content (optional).
2. Deletes the file.
3. Schedules a **temporary restart** after a configurable delay.

The restart reuses txAdmin's existing scheduled-restart engine, so players still receive the usual countdown warnings (in-game and Discord) and the server is shut down gracefully. If the update file contains text (for example a version number or commit hash), that text is used as the restart message in the logs and in the in-game warning.

## Motivation

Servers that deploy updates through a CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins, a deploy script, etc.) need a reliable way to apply a new build. Restarting the process directly skips txAdmin's player warnings and graceful shutdown, and calling the API from a pipeline requires authentication and extra plumbing.

This feature reduces the whole operation to **writing a single file** to disk after the deploy step. txAdmin takes care of warning players and restarting cleanly so the new files are loaded.

## How It Works

- On every scheduler tick (~60 seconds), if the feature is enabled **and the server is currently running**, txAdmin checks for `<ServerDataFolder>/<UpdateFileName>`.
- If the file exists:
  - Its content is read and sanitized (whitespace collapsed, trimmed, truncated to 150 characters) to be used as the restart reason.
  - The file is **deleted first**, so the same file is never processed twice — even if scheduling fails.
  - A temporary restart is scheduled for `+N` minutes via the existing restart scheduler.
- During the delay, players are warned at the standard intervals (30/15/10/5/4/3/2/1 minutes remaining), via both Discord and in-game announcements.
- When the timer reaches zero, the server is restarted gracefully. The update-file content (if any) is shown as the restart reason.

## Configuration

The options live under **Settings → FXServer → CI/CD**.

| Setting | Config key | Type | Default | Description |
| --- | --- | --- | --- | --- |
| Auto-Restart on Update File | `restarter.updateFileEnabled` | boolean | `false` | Master switch for the feature. |
| Update File Restart Delay | `restarter.updateFileDelay` | number (minutes) | `2` | How long to wait before restarting after the file is detected. Range: 1–1439. Players are warned during this period. |
| Update File Name | `restarter.updateFileName` | string | `.update` | Name of the file txAdmin looks for, relative to the Server Data folder. |

## Usage Example

In your deployment pipeline, after copying the new files into place, write the update file:

```bash
# After deploying your resources/artifacts...
echo "v1.4.2 ($(git rev-parse --short HEAD))" > /path/to/serverdata/.update
```

txAdmin will detect the file within ~60 seconds, warn players, and restart after the configured delay. Players (and the logs) will see the restart reason as `v1.4.2 (a1b2c3d)`.

If you prefer no message, simply create an empty file:

```bash
touch /path/to/serverdata/.update
```

## Behavior & Safeguards

- **Only acts while the server is running.** If a deployment lands while the server is down, the update file is left untouched and processed once the server is back up.
- **The file is deleted before scheduling**, preventing restart loops if scheduling cannot proceed.
- **Existing temporary restarts are respected.** If a temporary restart is already pending, the update file is consumed but no new restart is scheduled (the pending one will happen anyway).
- **Path traversal is prevented** by resolving only the file's base name inside the Server Data folder.
- **Detection latency** is bounded by the scheduler tick (≤ ~60 seconds) plus the configured delay.
- **No new translation strings.** The feature reuses the existing scheduled-restart messages. The update-file content is appended to the in-game warning in parentheses. The Discord warning remains the standard scheduled-restart message.

## Settings UI

The FXServer settings tab is now split into two cards ("islands"), mirroring the existing **Game** tab layout (Menu / Notifications):

- **FXServer → Settings** — the existing server settings (data folder, restart schedule, quiet mode, and advanced options).
- **FXServer → CI/CD** — the new auto-restart-on-update-file options.
