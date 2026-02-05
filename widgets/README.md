# Übersicht Widgets Collection

Beautiful, feature-rich widgets for [Übersicht](http://tracesof.net/uebersicht/).

## Widgets

### 🏠 Home Assistant Widget (`home-assistant.jsx`)

A comprehensive Home Assistant dashboard with smart home controls.

**Features:**
- Live temperature monitoring (thermostat, flue/fireplace)
- Smart lock control (lock/unlock)
- Alarm panel (arm home, arm away, disarm)
- Camera feed thumbnails
- Weather-aware animated backgrounds
- Holiday themes with particle effects
- Day/night mode based on sun position
- High temperature alerts (macOS notification + sound)
- Draggable position with persistence

**Requirements:**
- Home Assistant instance accessible from your Mac
- Long-lived access token from Home Assistant

**Setup:**
1. Copy `home-assistant.jsx` to `~/Library/Application Support/Übersicht/widgets/`
2. Edit `HA_URL` and `HA_TOKEN` at the top of the file
3. Customize entity IDs to match your Home Assistant setup

---

### 🔊 Sonos Widget (`sonos-control.jsx`)

A full-featured Sonos controller with multi-room audio controls.

**Features:**
- View and control all Sonos zones/rooms
- Play/pause, next/previous track controls
- Volume control with visual slider
- Speaker grouping (add/remove speakers from groups)
- Browse and play Sonos favorites
- Browse and play playlists
- Search music services (Spotify, Apple Music, etc.)
- Album art display
- Collapsible compact mode
- Draggable position with persistence

**Requirements:**
- [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api) running on localhost:5005

**Setup:**
1. Install and run node-sonos-http-api:
   ```bash
   git clone https://github.com/jishi/node-sonos-http-api.git
   cd node-sonos-http-api
   npm install
   npm start
   ```
2. Copy `sonos-control.jsx` to `~/Library/Application Support/Übersicht/widgets/`
3. The widget will auto-discover your Sonos speakers

---

## Installation

1. Install [Übersicht](http://tracesof.net/uebersicht/) if you haven't already
2. Copy the desired `.jsx` widget file(s) to:
   ```
   ~/Library/Application Support/Übersicht/widgets/
   ```
3. Configure each widget by editing the configuration section at the top of the file

## License

MIT
