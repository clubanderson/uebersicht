# Home Assistant Widget for Übersicht

A beautiful, feature-rich Home Assistant dashboard widget for [Übersicht](http://tracesof.net/uebersicht/).

![Widget Preview](preview.png)

## Features

- **Live temperature monitoring** - Thermostat, flue/fireplace temperature
- **Smart lock control** - Lock/unlock your front door
- **Alarm panel** - Arm home, arm away, disarm
- **Camera feeds** - Live camera thumbnails
- **Weather-aware theming** - Background changes based on weather conditions
- **Holiday themes** - Automatic decorations for holidays (Christmas snow, Halloween bats, etc.)
- **Day/night modes** - Automatic theme switching based on sun position
- **High temperature alerts** - macOS notification + sound when flue exceeds threshold
- **Draggable position** - Move the widget anywhere on screen (position persists)

## Installation

1. Install [Übersicht](http://tracesof.net/uebersicht/) if you haven't already
2. Copy `home-assistant.jsx` to `~/Library/Application Support/Übersicht/widgets/`
3. Edit the configuration section at the top of the file

## Configuration

Edit these values at the top of `home-assistant.jsx`:

```javascript
// Your Home Assistant URL and long-lived access token
const HA_URL = "https://your-home-assistant.local:8123";
const HA_TOKEN = "your_long_lived_access_token_here";

// Entity IDs - customize to match your Home Assistant setup
const ENTITIES = {
  flue: "sensor.fireplace_flue_temperature",       // Optional: fireplace sensor
  thermostat: "climate.thermostat",                // Your thermostat entity
  currentTemp: "sensor.thermostat_temperature",    // Temperature sensor
  lock: "lock.front_door",                         // Smart lock entity
  alarm: "alarm_control_panel.home_alarm",         // Alarm panel entity
  cameraFront: "camera.front_camera",              // Front camera entity
  cameraBackyard: "camera.backyard_camera",        // Backyard camera entity
  weather: "weather.home",                         // Weather entity
  sun: "sun.sun",                                  // Sun entity
};
```

### Getting a Long-Lived Access Token

1. In Home Assistant, click on your profile (bottom left)
2. Scroll down to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Give it a name (e.g., "Übersicht Widget")
5. Copy the token and paste it into the config

## Customization

### Adding Custom Holidays

Add your own special dates to the `HOLIDAYS` object:

```javascript
const HOLIDAYS = {
  // ... existing holidays ...
  birthday: { month: 5, day: 15, name: "Birthday", icon: "🎂", particles: "confetti" },
};
```

Note: Months are 0-indexed (January = 0, December = 11)

### Test Mode

To preview holiday or weather themes:

```javascript
const TEST_WEATHER = "snowy";      // Test weather: snowy, rainy, sunny, etc.
const TEST_HOLIDAY = "christmas";  // Test holiday: christmas, halloween, etc.
```

Set both to `null` for normal operation.

### Flue Temperature Alert

The widget will send a macOS notification and play an alarm sound when the flue temperature exceeds the threshold:

```javascript
const FLUE_ALERT_THRESHOLD = 500;  // Degrees Fahrenheit
```

## Requirements

- macOS with Übersicht installed
- Home Assistant instance accessible from your Mac
- Long-lived access token from Home Assistant

## Supported Weather Conditions

- Sunny / Clear
- Cloudy / Partly Cloudy
- Rainy / Pouring
- Snowy
- Foggy
- Windy
- Thunderstorm
- Night variations of all above

## Supported Holidays

- New Year's Day (Jan 1)
- Valentine's Day (Feb 14)
- St. Patrick's Day (Mar 17)
- Easter (approx. Mar 20)
- Independence Day (Jul 4)
- Halloween (Oct 31)
- Thanksgiving (4th Thursday of Nov)
- Christmas (Dec 25)

## License

MIT
