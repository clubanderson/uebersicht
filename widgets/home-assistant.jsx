// Übersicht Widget: Home Assistant Dashboard
// Full-featured widget with temperature, lock, alarm, and camera controls
// Draggable position persistence

import { css, run } from "uebersicht";

// ============ CONFIGURATION ============
// Replace with your Home Assistant URL and long-lived access token
const HA_URL = "https://your-home-assistant.local:8123";
const HA_TOKEN = "your_long_lived_access_token_here";

// Entity IDs - customize these to match your Home Assistant setup
const ENTITIES = {
  flue: "sensor.fireplace_flue_temperature",       // Optional: fireplace/wood stove sensor
  thermostat: "climate.thermostat",                // Your thermostat entity
  currentTemp: "sensor.thermostat_temperature",    // Temperature sensor
  lock: "lock.front_door",                         // Smart lock entity
  alarm: "alarm_control_panel.home_alarm",         // Alarm panel entity
  cameraFront: "camera.front_camera",              // Front camera entity
  cameraBackyard: "camera.backyard_camera",        // Backyard camera entity
  weather: "weather.home",                         // Weather entity for conditions
  sun: "sun.sun",                                  // Sun entity for sunrise/sunset times
};

// Automations/Scenes to trigger (optional)
const AUTOMATIONS = {
  goodnight: "script.goodnight",      // Create this script in HA or use automation ID
  dinnerTime: "script.dinner_time",   // Create this script in HA or use automation ID
};

// ============ TEST MODE ============
// Set to a weather condition to test: "snowy", "rainy", "pouring", "sunny", "cloudy", "fog", "clear-night"
// Set to null for normal operation
const TEST_WEATHER = null;  // <-- Normal operation
const TEST_HOLIDAY = null;  // <-- Normal operation
// ===================================

// ============ HOLIDAY & WEATHER THEMING ============
// Holiday definitions (month is 0-indexed)
const HOLIDAYS = {
  valentines: { month: 1, day: 14, name: "Valentine's Day", icon: "💕", particles: "hearts" },
  stPatricks: { month: 2, day: 17, name: "St. Patrick's Day", icon: "☘️", particles: "clovers" },
  easter: { month: 3, day: 20, name: "Easter", icon: "🐰", particles: "eggs" }, // Approximate
  july4th: { month: 6, day: 4, name: "Independence Day", icon: "🚀", particles: "fireworks" },
  halloween: { month: 9, day: 31, name: "Halloween", icon: "🎃", particles: "bats" },
  thanksgiving: { month: 10, day: 28, name: "Thanksgiving", icon: "🦃", particles: "leaves" }, // 4th Thursday approx
  christmas: { month: 11, day: 25, name: "Christmas", icon: "🎄", particles: "snow" },
  newYear: { month: 0, day: 1, name: "New Year", icon: "🎊", particles: "confetti" },
  // Add your own custom dates:
  // birthday: { month: 5, day: 15, name: "Birthday", icon: "🎂", particles: "confetti" },
};

// Check if today is near a holiday (within range days)
const getActiveHoliday = (range = 0) => {
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();

  for (const [key, holiday] of Object.entries(HOLIDAYS)) {
    if (holiday.month === month) {
      const diff = Math.abs(day - holiday.day);
      if (diff <= range) {
        return { key, ...holiday };
      }
    }
  }
  return null;
};

// Weather condition to particle mapping
const WEATHER_PARTICLES = {
  rainy: "rain",
  pouring: "rain",
  "lightning-rainy": "rain",
  snowy: "snow",
  hail: "snow",
  windy: "leaves",
  exceptional: "sparkles",
};

// Check if it's night time based on sun entity state
// sun.sun state is "above_horizon" during day, "below_horizon" at night
const checkIsNightTime = (sunState) => {
  if (sunState === "below_horizon") return true;
  // Fallback to approximate time if no sun data
  const hour = new Date().getHours();
  return hour >= 19 || hour < 6;
};

// Night theme
const NIGHT_THEME = {
  accent: "#6b5b95",
  gradient: "linear-gradient(135deg, rgba(25, 25, 50, 0.85) 0%, rgba(15, 15, 35, 0.9) 100%)",
  border: "rgba(107, 91, 149, 0.3)",
  glow: "0 0 30px rgba(107, 91, 149, 0.15)",
};

// Theme colors for holidays
const HOLIDAY_THEMES = {
  valentines: {
    accent: "#ff4d6d",
    gradient: "linear-gradient(135deg, rgba(255, 77, 109, 0.15) 0%, rgba(199, 21, 133, 0.1) 100%)",
    border: "rgba(255, 77, 109, 0.3)",
    glow: "0 0 30px rgba(255, 77, 109, 0.2)",
  },
  stPatricks: {
    accent: "#00a86b",
    gradient: "linear-gradient(135deg, rgba(0, 168, 107, 0.15) 0%, rgba(34, 139, 34, 0.1) 100%)",
    border: "rgba(0, 168, 107, 0.3)",
    glow: "0 0 30px rgba(0, 168, 107, 0.2)",
  },
  easter: {
    accent: "#dda0dd",
    gradient: "linear-gradient(135deg, rgba(221, 160, 221, 0.15) 0%, rgba(135, 206, 250, 0.1) 100%)",
    border: "rgba(221, 160, 221, 0.3)",
    glow: "0 0 30px rgba(221, 160, 221, 0.2)",
  },
  july4th: {
    accent: "#ff4444",
    gradient: "linear-gradient(135deg, rgba(255, 68, 68, 0.15) 0%, rgba(68, 68, 255, 0.1) 100%)",
    border: "rgba(255, 68, 68, 0.3)",
    glow: "0 0 30px rgba(255, 68, 68, 0.2)",
  },
  halloween: {
    accent: "#ff6600",
    gradient: "linear-gradient(135deg, rgba(255, 102, 0, 0.15) 0%, rgba(75, 0, 130, 0.1) 100%)",
    border: "rgba(255, 102, 0, 0.3)",
    glow: "0 0 30px rgba(255, 102, 0, 0.2)",
  },
  thanksgiving: {
    accent: "#cd853f",
    gradient: "linear-gradient(135deg, rgba(205, 133, 63, 0.15) 0%, rgba(139, 69, 19, 0.1) 100%)",
    border: "rgba(205, 133, 63, 0.3)",
    glow: "0 0 30px rgba(205, 133, 63, 0.2)",
  },
  christmas: {
    accent: "#ff0000",
    gradient: "linear-gradient(135deg, rgba(255, 0, 0, 0.12) 0%, rgba(0, 128, 0, 0.1) 100%)",
    border: "rgba(255, 0, 0, 0.3)",
    glow: "0 0 30px rgba(255, 0, 0, 0.15)",
  },
  newYear: {
    accent: "#ffd700",
    gradient: "linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(192, 192, 192, 0.1) 100%)",
    border: "rgba(255, 215, 0, 0.3)",
    glow: "0 0 30px rgba(255, 215, 0, 0.2)",
  },
};

// Weather theme colors
const WEATHER_THEMES = {
  rain: {
    accent: "#5c9ece",
    gradient: "linear-gradient(135deg, rgba(92, 158, 206, 0.1) 0%, rgba(70, 130, 180, 0.08) 100%)",
    border: "rgba(92, 158, 206, 0.2)",
  },
  snow: {
    accent: "#b0e0e6",
    gradient: "linear-gradient(135deg, rgba(176, 224, 230, 0.1) 0%, rgba(240, 248, 255, 0.08) 100%)",
    border: "rgba(176, 224, 230, 0.2)",
  },
  leaves: {
    accent: "#cd853f",
    gradient: "linear-gradient(135deg, rgba(205, 133, 63, 0.1) 0%, rgba(210, 105, 30, 0.08) 100%)",
    border: "rgba(205, 133, 63, 0.2)",
  },
};
// =======================================

// Build API calls for all entities (excluding cameras - those are fetched separately)
const stateEntities = [
  ENTITIES.flue,
  ENTITIES.thermostat,
  ENTITIES.currentTemp,
  ENTITIES.lock,
  ENTITIES.alarm,
  ENTITIES.weather,
  ENTITIES.sun,
];

const curlCommands = stateEntities.map((e, i) =>
  `curl -s -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" "${HA_URL}/api/states/${e}" 2>/dev/null${i < stateEntities.length - 1 ? ' && echo "---SPLIT---" &&' : ''}`
).join(' \\\n  ');

// Also fetch camera images as base64
const cameraCommands = `
  echo "---SPLIT---" && \\
  curl -s -H "Authorization: Bearer ${HA_TOKEN}" "${HA_URL}/api/camera_proxy/${ENTITIES.cameraFront}" 2>/dev/null | base64 && \\
  echo "---SPLIT---" && \\
  curl -s -H "Authorization: Bearer ${HA_TOKEN}" "${HA_URL}/api/camera_proxy/${ENTITIES.cameraBackyard}" 2>/dev/null | base64
`;

export const command = `${curlCommands} && ${cameraCommands}`;

export const refreshFrequency = 10000; // 10 seconds

// Drag state
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let posStart = { x: 0, y: 0 };
let dragElement = null;

// High temperature alert state
const FLUE_ALERT_THRESHOLD = 500;
let flueAlertSent = false;

// Connection state tracking for graceful error handling
let lastSuccessfulData = null;
let consecutiveErrors = 0;
let lastErrorTime = null;
const MAX_ERRORS_BEFORE_OFFLINE = 3;

// Function to send macOS notification with alarm sound
const sendFlueAlert = (temp) => {
  if (flueAlertSent) return;
  flueAlertSent = true;

  // Send macOS notification with critical sound
  const notifyCmd = `osascript -e 'display notification "Flue temperature is ${Math.round(temp)}°F - Risk of chimney fire!" with title "🔥 FLUE OVERHEATING" sound name "Sosumi"'`;
  run(notifyCmd);

  // Play alarm sound (repeats 3 times for urgency)
  const alarmCmd = `for i in 1 2 3; do afplay /System/Library/Sounds/Ping.aiff; done &`;
  run(alarmCmd);
};

const resetFlueAlert = () => {
  flueAlertSent = false;
};

// Load saved position from localStorage
const STORAGE_KEY = "ha-widget-position";
const getStoredPosition = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return { bottom: 100, left: 20 };
};

const savePosition = (pos) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch (e) {}
};

let widgetPosition = getStoredPosition();

export const className = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
  color: #fff;
  user-select: none;
  pointer-events: none;

  .widget-container {
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }
  .widget-container:hover {
    background: rgba(20, 20, 20, 0.95) !important;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.6) !important;
  }

  button {
    transition: transform 0.1s ease, background 0.1s ease, opacity 0.1s ease;
  }
  button:hover {
    transform: scale(1.05);
    filter: brightness(1.2);
  }
  button:active {
    transform: scale(0.95);
  }

  .clickable-row:hover {
    background: rgba(255, 255, 255, 0.08) !important;
  }

  .automation-btn:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.10) 100%) !important;
    border-color: rgba(255, 255, 255, 0.25) !important;
    transform: translateY(-1px);
  }
  .automation-btn:active {
    transform: translateY(0) scale(0.98);
  }

  .drag-handle {
    cursor: grab;
  }
  .drag-handle:active {
    cursor: grabbing;
  }

  /* Particle animations */
  @keyframes fall {
    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100%) rotate(360deg); opacity: 0.3; }
  }
  @keyframes float-heart {
    0% { transform: translateY(100%) scale(0.5) rotate(-15deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-20px) scale(1) rotate(15deg); opacity: 0; }
  }
  @keyframes rain-fall {
    0% { transform: translateY(-10px); opacity: 0.8; }
    100% { transform: translateY(100%); opacity: 0.2; }
  }
  @keyframes snow-fall {
    0% { transform: translateY(-10px) translateX(0); opacity: 0.9; }
    50% { transform: translateY(50%) translateX(10px); }
    100% { transform: translateY(100%) translateX(-5px); opacity: 0.3; }
  }
  @keyframes leaf-fall {
    0% { transform: translateY(-10px) rotate(0deg) translateX(0); opacity: 0.9; }
    25% { transform: translateY(25%) rotate(90deg) translateX(15px); }
    50% { transform: translateY(50%) rotate(180deg) translateX(-10px); }
    75% { transform: translateY(75%) rotate(270deg) translateX(10px); }
    100% { transform: translateY(100%) rotate(360deg) translateX(0); opacity: 0.3; }
  }
  @keyframes confetti-fall {
    0% { transform: translateY(-10px) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translateY(100%) rotate(720deg) scale(0.5); opacity: 0; }
  }
  @keyframes bat-fly {
    0% { transform: translateY(100%) translateX(-20px) scale(0.8); opacity: 0; }
    50% { transform: translateY(40%) translateX(10px) scale(1); opacity: 1; }
    100% { transform: translateY(-20px) translateX(-10px) scale(0.9); opacity: 0; }
  }
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  .particle-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    pointer-events: none;
    border-radius: 16px;
  }
  .particle {
    position: absolute;
    pointer-events: none;
  }
  .particle-heart {
    animation: float-heart 4s ease-in-out infinite;
    font-size: 14px;
  }
  .particle-rain {
    animation: rain-fall 1s linear infinite;
    width: 2px;
    height: 12px;
    background: linear-gradient(to bottom, rgba(92, 158, 206, 0.8), rgba(92, 158, 206, 0.2));
    border-radius: 2px;
  }
  .particle-snow {
    animation: snow-fall 4s ease-in-out infinite;
    font-size: 10px;
  }
  .particle-leaf {
    animation: leaf-fall 5s ease-in-out infinite;
    font-size: 12px;
  }
  .particle-confetti {
    animation: confetti-fall 3s ease-out infinite;
    width: 6px;
    height: 6px;
    border-radius: 1px;
    top: -10px;
  }
  .particle-bat {
    animation: bat-fly 4s ease-in-out infinite;
    font-size: 12px;
  }
  .particle-clover {
    animation: float-heart 5s ease-in-out infinite;
    font-size: 12px;
  }
  .particle-egg {
    animation: float-heart 4s ease-in-out infinite;
    font-size: 14px;
  }
  .particle-sparkle {
    animation: sparkle 2s ease-in-out infinite;
    font-size: 10px;
  }

  .weather-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 16px;
    opacity: 0.7;
  }

  /* Animated weather backgrounds */
  @keyframes rain-bg {
    0% { background-position: 0% 0%; }
    100% { background-position: 0% 100%; }
  }
  @keyframes snow-bg {
    0% { background-position: 0% 0%, 50% 0%; }
    100% { background-position: 0% 100%, 50% 100%; }
  }
  @keyframes clouds-drift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes night-twinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
  @keyframes lightning-flash {
    0%, 85%, 100% { opacity: 0; background: transparent; }
    86%, 88% { opacity: 1; background: rgba(255, 255, 255, 0.4); }
    89%, 91% { opacity: 0; background: transparent; }
    92%, 93% { opacity: 1; background: rgba(255, 255, 255, 0.3); }
  }
  @keyframes fog-drift {
    0% { transform: translateX(-5%); opacity: 0.15; }
    50% { transform: translateX(5%); opacity: 0.25; }
    100% { transform: translateX(-5%); opacity: 0.15; }
  }
  @keyframes sunny-glow {
    0%, 100% {
      box-shadow: inset 0 -50px 80px -30px rgba(255, 200, 50, 0.2);
      filter: brightness(1);
    }
    50% {
      box-shadow: inset 0 -50px 80px -30px rgba(255, 200, 50, 0.35);
      filter: brightness(1.05);
    }
  }

  .weather-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 16px;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }

  .widget-container {
    position: relative;
  }

  .widget-container > *:not(.weather-bg):not(.particle-container) {
    position: relative;
    z-index: 1;
  }

  .weather-bg-rain {
    background:
      repeating-linear-gradient(
        180deg,
        transparent 0px,
        transparent 8px,
        rgba(100, 150, 200, 0.15) 8px,
        rgba(100, 150, 200, 0.15) 10px
      );
    background-size: 100% 20px;
    animation: rain-bg 0.4s linear infinite;
  }

  .weather-bg-pouring {
    background:
      repeating-linear-gradient(
        180deg,
        transparent 0px,
        transparent 5px,
        rgba(100, 150, 200, 0.2) 5px,
        rgba(100, 150, 200, 0.2) 8px
      );
    background-size: 100% 15px;
    animation: rain-bg 0.25s linear infinite;
  }

  .weather-bg-snow {
    background:
      radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.4) 2px, transparent 2px),
      radial-gradient(circle at 60% 10%, rgba(255, 255, 255, 0.3) 2px, transparent 2px),
      radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.35) 2px, transparent 2px),
      radial-gradient(circle at 40% 50%, rgba(255, 255, 255, 0.25) 1px, transparent 1px),
      radial-gradient(circle at 10% 80%, rgba(255, 255, 255, 0.3) 2px, transparent 2px);
    background-size: 50px 50px, 70px 70px, 60px 60px, 40px 40px, 80px 80px;
    animation: snow-bg 6s linear infinite;
  }

  .weather-bg-cloudy {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(150, 150, 150, 0.12) 20%,
      rgba(150, 150, 150, 0.18) 50%,
      rgba(150, 150, 150, 0.12) 80%,
      transparent 100%
    );
    animation: clouds-drift 15s ease-in-out infinite;
  }

  .weather-bg-lightning {
    background: rgba(255, 255, 255, 0);
    animation: lightning-flash 3s ease-in-out infinite;
  }

  .weather-bg-fog {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(200, 200, 200, 0.25) 30%,
      rgba(200, 200, 200, 0.35) 50%,
      rgba(200, 200, 200, 0.25) 70%,
      transparent 100%
    );
    animation: fog-drift 8s ease-in-out infinite;
  }

  .weather-bg-sunny {
    background: radial-gradient(
      ellipse at 50% -20%,
      rgba(255, 200, 50, 0.2) 0%,
      rgba(255, 200, 50, 0.1) 30%,
      transparent 70%
    );
    animation: sunny-glow 4s ease-in-out infinite;
  }

  .weather-bg-night {
    background:
      radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.6) 1px, transparent 2px),
      radial-gradient(circle at 85% 35%, rgba(255, 255, 255, 0.5) 1px, transparent 2px),
      radial-gradient(circle at 45% 80%, rgba(255, 255, 255, 0.55) 1px, transparent 2px),
      radial-gradient(circle at 70% 15%, rgba(255, 255, 255, 0.4) 1px, transparent 2px),
      radial-gradient(circle at 30% 45%, rgba(255, 255, 255, 0.45) 1px, transparent 2px),
      radial-gradient(circle at 90% 75%, rgba(255, 255, 255, 0.35) 1px, transparent 2px),
      radial-gradient(circle at 5% 60%, rgba(255, 255, 255, 0.5) 1px, transparent 2px);
    background-size: 100% 100%;
    animation: night-twinkle 2s ease-in-out infinite;
  }

  .weather-status-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 6px 12px;
    margin: -8px -12px 12px -12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px 8px 0 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }
  .weather-status-bar .temp {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
  .weather-status-bar .condition {
    text-transform: capitalize;
  }

  /* Active weather animations - slowed down for subtlety */

  /* Cloud animations - individual clouds drifting */
  .cloud {
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  .cloud-1 {
    animation: drift-cloud-1 25s linear infinite;
  }
  .cloud-2 {
    animation: drift-cloud-2 18s linear infinite;
  }
  .cloud-3 {
    animation: drift-cloud-3 12s linear infinite;
  }
  @keyframes drift-cloud-1 {
    0% { left: -70px; opacity: 0; }
    5% { opacity: 0.8; }
    95% { opacity: 0.8; }
    100% { left: 100%; opacity: 0; }
  }
  @keyframes drift-cloud-2 {
    0% { left: -50px; opacity: 0; }
    5% { opacity: 0.7; }
    95% { opacity: 0.7; }
    100% { left: 100%; opacity: 0; }
  }
  @keyframes drift-cloud-3 {
    0% { left: -40px; opacity: 0; }
    5% { opacity: 0.9; }
    95% { opacity: 0.9; }
    100% { left: 100%; opacity: 0; }
  }

  .rainstreak {
    animation: rain-streak linear infinite;
  }
  @keyframes rain-streak {
    0% { transform: translateY(0); opacity: 0.8; }
    100% { transform: translateY(115px); opacity: 0.3; }
  }

  .weather-anim-snow {
    animation: falling-snow 8s linear infinite;
  }
  @keyframes falling-snow {
    0% { background-position: 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0; }
    100% { background-position: 0 0, 0 100px, 0 80px, 0 120px, 0 60px, 0 90px, 0 70px; }
  }

  .weather-anim-sunny {
    animation: pulse-sun 6s ease-in-out infinite;
  }
  @keyframes pulse-sun {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
  }

  .weather-anim-night {
    animation: twinkle-stars 3s ease-in-out infinite;
  }
  @keyframes twinkle-stars {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  .weather-anim-fog {
    animation: drift-fog 12s ease-in-out infinite;
  }
  @keyframes drift-fog {
    0% { background-position: -50% 50%; opacity: 0.7; }
    50% { background-position: 50% 50%; opacity: 1; }
    100% { background-position: -50% 50%; opacity: 0.7; }
  }

  /* Lightning flash */
  .lightning-flash {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0);
    animation: lightning 4s ease-out infinite;
  }
  @keyframes lightning {
    0%, 89%, 91%, 93%, 100% { background: rgba(255, 255, 255, 0); }
    90% { background: rgba(255, 255, 255, 0.7); }
    92% { background: rgba(255, 255, 255, 0.4); }
  }

  /* Windy - blowing streaks and leaves */
  .wind-streak {
    position: absolute;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200, 200, 200, 0.4), transparent);
    opacity: 0;
  }
  .wind-streak-1 { top: 15px; animation: wind-blow 2s ease-in-out infinite; }
  .wind-streak-2 { top: 35px; animation: wind-blow 2.3s ease-in-out 0.3s infinite; }
  .wind-streak-3 { top: 55px; animation: wind-blow 1.8s ease-in-out 0.7s infinite; }
  .wind-streak-4 { top: 25px; animation: wind-blow 2.5s ease-in-out 1s infinite; }
  .wind-streak-5 { top: 45px; animation: wind-blow 2.1s ease-in-out 0.5s infinite; }

  @keyframes wind-blow {
    0% { left: -50px; width: 30px; opacity: 0; }
    20% { opacity: 0.6; }
    80% { opacity: 0.6; }
    100% { left: 110%; width: 60px; opacity: 0; }
  }

  .wind-leaf {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #cd853f;
    border-radius: 0 50% 50% 50%;
    transform: rotate(45deg);
    opacity: 0;
  }
  .wind-leaf-1 { animation: leaf-blow 3s ease-in-out infinite; }
  .wind-leaf-2 { animation: leaf-blow 3.5s ease-in-out 0.8s infinite; }
  .wind-leaf-3 { animation: leaf-blow 2.8s ease-in-out 1.5s infinite; }

  @keyframes leaf-blow {
    0% { left: -20px; top: 50px; opacity: 0; transform: rotate(45deg); }
    10% { opacity: 1; }
    50% { top: 20px; }
    90% { opacity: 1; }
    100% { left: 110%; top: 40px; opacity: 0; transform: rotate(405deg); }
  }

  /* Wind-blown paw prints instead */
  .wind-paw {
    position: absolute;
    opacity: 0;
  }
  .wind-paw::before {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    background: #8B4513;
    border-radius: 50%;
    box-shadow:
      -5px -5px 0 0 #8B4513,
      5px -5px 0 0 #8B4513,
      -7px 0 0 -1px #8B4513,
      7px 0 0 -1px #8B4513;
    filter: drop-shadow(0 0 2px rgba(139,69,19,0.4));
  }
  .wind-paw-1 { animation: paw-blow-1 4s ease-in-out infinite; }
  .wind-paw-2 { animation: paw-blow-2 5s ease-in-out 1.5s infinite; }
  .wind-paw-3 { animation: paw-blow-3 4.5s ease-in-out 3s infinite; }

  @keyframes paw-blow-1 {
    0% { left: -20px; top: 20px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    50% { top: 45px; }
    90% { opacity: 1; }
    100% { left: 110%; top: 30px; opacity: 0; transform: rotate(360deg); }
  }
  @keyframes paw-blow-2 {
    0% { left: -20px; top: 50px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    50% { top: 25px; }
    90% { opacity: 1; }
    100% { left: 110%; top: 40px; opacity: 0; transform: rotate(-360deg); }
  }
  @keyframes paw-blow-3 {
    0% { left: -20px; top: 35px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    50% { top: 55px; }
    90% { opacity: 1; }
    100% { left: 110%; top: 20px; opacity: 0; transform: rotate(360deg); }
  }

  /* Thanksgiving falling leaves - Pure CSS */
  .fall-leaf {
    position: absolute;
    width: 10px;
    height: 10px;
    background: #cd853f;
    border-radius: 0 70% 70% 70%;
    opacity: 0;
    filter: drop-shadow(0 0 2px rgba(205,133,63,0.3));
  }
  .fall-leaf::before {
    content: "";
    position: absolute;
    width: 1px;
    height: 6px;
    background: #8B4513;
    left: 4px;
    bottom: -4px;
  }
  .fall-leaf-1 { background: #cd853f; animation: fall-leaf-1 4s ease-in-out infinite; }
  .fall-leaf-2 { background: #d2691e; animation: fall-leaf-2 4.5s ease-in-out 0.5s infinite; }
  .fall-leaf-3 { background: #b8860b; animation: fall-leaf-3 3.8s ease-in-out 1s infinite; }
  .fall-leaf-4 { background: #a0522d; animation: fall-leaf-4 4.2s ease-in-out 1.5s infinite; }
  .fall-leaf-5 { background: #8b4513; animation: fall-leaf-5 3.5s ease-in-out 2s infinite; }
  .fall-leaf-6 { background: #d2691e; animation: fall-leaf-6 4.8s ease-in-out 2.5s infinite; }

  @keyframes fall-leaf-1 {
    0% { left: 15%; top: -15px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    90% { opacity: 0.8; }
    100% { left: 25%; top: 90px; opacity: 0; transform: rotate(180deg); }
  }
  @keyframes fall-leaf-2 {
    0% { left: 35%; top: -15px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    90% { opacity: 0.8; }
    100% { left: 28%; top: 85px; opacity: 0; transform: rotate(-150deg); }
  }
  @keyframes fall-leaf-3 {
    0% { left: 55%; top: -15px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    90% { opacity: 0.8; }
    100% { left: 65%; top: 95px; opacity: 0; transform: rotate(200deg); }
  }
  @keyframes fall-leaf-4 {
    0% { left: 75%; top: -15px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    90% { opacity: 0.8; }
    100% { left: 68%; top: 88px; opacity: 0; transform: rotate(-180deg); }
  }
  @keyframes fall-leaf-5 {
    0% { left: 45%; top: -15px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    90% { opacity: 0.8; }
    100% { left: 52%; top: 92px; opacity: 0; transform: rotate(160deg); }
  }
  @keyframes fall-leaf-6 {
    0% { left: 85%; top: -15px; opacity: 0; transform: rotate(0deg); }
    10% { opacity: 1; }
    90% { opacity: 0.8; }
    100% { left: 78%; top: 80px; opacity: 0; transform: rotate(-140deg); }
  }

  /* New Year confetti - Pure CSS */
  .confetti {
    position: absolute;
    width: 6px;
    height: 6px;
    opacity: 0;
  }
  .confetti-1 { left: 10%; background: #ff4d6d; animation: confetti-1 3s ease-out infinite; }
  .confetti-2 { left: 25%; background: #ffd700; animation: confetti-2 2.5s ease-out 0.3s infinite; }
  .confetti-3 { left: 40%; background: #00ff88; animation: confetti-3 3.2s ease-out 0.6s infinite; }
  .confetti-4 { left: 55%; background: #00bfff; animation: confetti-4 2.8s ease-out 0.2s infinite; }
  .confetti-5 { left: 70%; background: #ff6b35; animation: confetti-5 3s ease-out 0.5s infinite; }
  .confetti-6 { left: 85%; background: #9b59b6; animation: confetti-6 2.6s ease-out 0.8s infinite; }
  .confetti-7 { left: 15%; background: #ffd700; animation: confetti-7 2.9s ease-out 1s infinite; }
  .confetti-8 { left: 60%; background: #ff4d6d; animation: confetti-8 3.1s ease-out 1.2s infinite; }

  @keyframes confetti-1 {
    0% { top: -10px; opacity: 1; transform: rotate(0deg); }
    100% { top: 90px; opacity: 0; transform: rotate(360deg); }
  }
  @keyframes confetti-2 {
    0% { top: -10px; opacity: 1; transform: rotate(0deg); }
    100% { top: 85px; opacity: 0; transform: rotate(-300deg); }
  }
  @keyframes confetti-3 {
    0% { top: -10px; opacity: 1; transform: rotate(0deg); }
    100% { top: 95px; opacity: 0; transform: rotate(400deg); }
  }
  @keyframes confetti-4 {
    0% { top: -10px; opacity: 1; transform: rotate(0deg); }
    100% { top: 80px; opacity: 0; transform: rotate(-350deg); }
  }
  @keyframes confetti-5 {
    0% { top: -10px; opacity: 1; transform: rotate(0deg); }
    100% { top: 88px; opacity: 0; transform: rotate(380deg); }
  }
  @keyframes confetti-6 {
    0% { top: -10px; opacity: 1; transform: rotate(0deg); }
    100% { top: 92px; opacity: 0; transform: rotate(-420deg); }
  }
  @keyframes confetti-7 {
    0% { top: -10px; opacity: 1; transform: rotate(0deg); }
    100% { top: 78px; opacity: 0; transform: rotate(320deg); }
  }
  @keyframes confetti-8 {
    0% { top: -10px; opacity: 1; transform: rotate(0deg); }
    100% { top: 85px; opacity: 0; transform: rotate(-280deg); }
  }

  /* Christmas sleigh with reindeer - Pure CSS */
  .sleigh-group {
    position: absolute;
    animation: sleigh-fly 12s ease-in-out infinite;
  }
  @keyframes sleigh-fly {
    0% { left: -80px; top: 35px; opacity: 0; }
    5% { opacity: 1; }
    50% { top: 20px; }
    95% { opacity: 1; }
    100% { left: 110%; top: 30px; opacity: 0; }
  }

  /* Reindeer - facing right */
  .reindeer {
    position: absolute;
    width: 16px;
    height: 8px;
    background: #8B4513;
    border-radius: 50% 50% 40% 40%;
    filter: drop-shadow(0 0 2px rgba(255,200,100,0.3));
  }
  .reindeer::before {
    content: "";
    position: absolute;
    width: 6px;
    height: 6px;
    background: #8B4513;
    border-radius: 50%;
    right: -3px;
    top: -2px;
    box-shadow: -2px -4px 0 -1px #8B4513, 2px -4px 0 -1px #8B4513; /* antlers */
  }
  .reindeer::after {
    content: "";
    position: absolute;
    width: 3px;
    height: 4px;
    background: #8B4513;
    right: 2px;
    bottom: -3px;
    box-shadow: -8px 0 0 0 #8B4513; /* legs */
  }
  .reindeer-1 { left: 45px; top: 0; }
  .reindeer-2 { left: 63px; top: 3px; }

  /* Sleigh */
  .sleigh {
    position: absolute;
    left: 0;
    top: 5px;
    width: 25px;
    height: 12px;
    background: linear-gradient(180deg, #dd0000 0%, #aa0000 100%);
    border-radius: 3px 10px 8px 8px;
    filter: drop-shadow(0 0 3px rgba(255,100,100,0.4));
  }
  .sleigh::before {
    content: "";
    position: absolute;
    left: 6px;
    top: -10px;
    width: 10px;
    height: 8px;
    background: #cc0000; /* Santa body */
    border-radius: 3px 3px 0 0;
    box-shadow:
      3px -6px 0 0 #ffddcc, /* face */
      3px -10px 0 -1px #cc0000, /* hat */
      3px -13px 0 -2px #fff, /* hat pom */
      0px -4px 0 -1px #fff, /* beard */
      10px -5px 0 -1px #fff; /* gift bag */
  }
  .sleigh::after {
    content: "";
    position: absolute;
    width: 30px;
    height: 1px;
    background: linear-gradient(90deg, transparent, #aa8855, #aa8855, transparent);
    right: -32px;
    top: 6px; /* reins */
  }

  /* Halloween bats - Pure CSS */
  .bat {
    position: absolute;
    width: 20px;
    height: 8px;
    background: #000;
    border-radius: 50% 50% 40% 40%;
    filter: drop-shadow(0 0 3px rgba(255, 100, 0, 0.5));
  }
  .bat::before,
  .bat::after {
    content: "";
    position: absolute;
    top: 0;
    width: 12px;
    height: 16px;
    background: #000;
    border-radius: 50% 50% 0 50%;
  }
  .bat::before {
    left: -8px;
    transform: rotate(-20deg);
    animation: bat-flap-left 0.2s ease-in-out infinite alternate;
  }
  .bat::after {
    right: -8px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(20deg);
    animation: bat-flap-right 0.2s ease-in-out infinite alternate;
  }
  @keyframes bat-flap-left {
    0% { transform: rotate(-20deg); }
    100% { transform: rotate(-50deg); }
  }
  @keyframes bat-flap-right {
    0% { transform: rotate(20deg); }
    100% { transform: rotate(50deg); }
  }
  .bat-1 { animation: bat-fly-1 6s ease-in-out infinite; }
  .bat-2 { animation: bat-fly-2 5s ease-in-out 1s infinite; }
  .bat-3 { animation: bat-fly-3 7s ease-in-out 2s infinite; }
  .bat-4 { animation: bat-fly-4 4s ease-in-out 0.5s infinite; }

  @keyframes bat-fly-1 {
    0% { left: -30px; top: 40px; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { left: 110%; top: 15px; opacity: 0; }
  }
  @keyframes bat-fly-2 {
    0% { left: 110%; top: 20px; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { left: -30px; top: 50px; opacity: 0; }
  }
  @keyframes bat-fly-3 {
    0% { left: -30px; top: 10px; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { left: 110%; top: 35px; opacity: 0; }
  }
  @keyframes bat-fly-4 {
    0% { left: 110%; top: 55px; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { left: -30px; top: 25px; opacity: 0; }
  }

  /* Fireworks animations - Pure CSS, no emojis */
  .firework {
    position: absolute;
    width: 4px;
    height: 4px;
  }

  /* Rocket trail rising up */
  .fw-trail {
    position: absolute;
    width: 2px;
    height: 0;
    background: linear-gradient(to top, transparent, #ffaa00, #ffffff);
    opacity: 0;
    border-radius: 1px;
  }
  .fw-trail-1 { left: 15%; animation: fw-rise-1 4s ease-out infinite; }
  .fw-trail-2 { left: 50%; animation: fw-rise-2 4s ease-out 1.3s infinite; }
  .fw-trail-3 { left: 85%; animation: fw-rise-3 4s ease-out 2.6s infinite; }

  @keyframes fw-rise-1 {
    0% { bottom: 0; height: 0; opacity: 0; }
    5% { opacity: 1; height: 15px; }
    20% { bottom: 50px; height: 20px; opacity: 1; }
    25% { opacity: 0; height: 0; }
    100% { opacity: 0; }
  }
  @keyframes fw-rise-2 {
    0% { bottom: 0; height: 0; opacity: 0; }
    5% { opacity: 1; height: 15px; }
    22% { bottom: 40px; height: 18px; opacity: 1; }
    27% { opacity: 0; height: 0; }
    100% { opacity: 0; }
  }
  @keyframes fw-rise-3 {
    0% { bottom: 0; height: 0; opacity: 0; }
    5% { opacity: 1; height: 15px; }
    18% { bottom: 55px; height: 22px; opacity: 1; }
    23% { opacity: 0; height: 0; }
    100% { opacity: 0; }
  }

  /* Explosion container */
  .fw-explosion {
    position: absolute;
    width: 80px;
    height: 80px;
    transform: translate(-50%, -50%);
  }
  .fw-explosion-1 { left: 15%; top: 25px; }
  .fw-explosion-2 { left: 50%; top: 35px; }
  .fw-explosion-3 { left: 85%; top: 20px; }

  /* Individual burst particles - radial pattern */
  .fw-particle {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    opacity: 0;
  }

  /* CSS Heart shape */
  .fw-heart {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 10px;
    opacity: 0;
    transform-origin: center center;
  }
  .fw-heart::before,
  .fw-heart::after {
    content: "";
    position: absolute;
    width: 10px;
    height: 16px;
    background: currentColor;
    border-radius: 10px 10px 0 0;
    box-shadow: 0 0 8px currentColor;
  }
  .fw-heart::before {
    left: 5px;
    transform: rotate(-45deg);
    transform-origin: 0 100%;
  }
  .fw-heart::after {
    left: 0;
    transform: rotate(45deg);
    transform-origin: 100% 100%;
  }

  /* CSS Star shape */
  .fw-star {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 10px solid currentColor;
    opacity: 0;
    filter: drop-shadow(0 0 4px currentColor);
  }
  .fw-star::after {
    content: "";
    position: absolute;
    top: 3px;
    left: -5px;
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 10px solid currentColor;
  }

  /* CSS Paw print (simple circles) */
  .fw-paw {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 10px;
    opacity: 0;
  }
  .fw-paw::before {
    content: "";
    position: absolute;
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
    left: 3px;
    top: 4px;
    box-shadow:
      -4px -4px 0 0 currentColor,
      4px -4px 0 0 currentColor,
      -6px 0 0 -1px currentColor,
      6px 0 0 -1px currentColor,
      0 0 6px currentColor;
  }

  /* CSS Dog silhouette */
  .fw-dog {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 14px;
    height: 10px;
    background: currentColor;
    border-radius: 50% 50% 40% 40%;
    opacity: 0;
    filter: drop-shadow(0 0 4px currentColor);
  }
  .fw-dog::before {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    background: currentColor;
    border-radius: 50%;
    left: -4px;
    top: -3px;
    box-shadow: -3px -2px 0 -1px currentColor; /* ear */
  }
  .fw-dog::after {
    content: "";
    position: absolute;
    width: 6px;
    height: 3px;
    background: currentColor;
    border-radius: 0 50% 50% 0;
    right: -5px;
    top: 3px; /* tail */
  }

  /* CSS Cat silhouette */
  .fw-cat {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 10px;
    background: currentColor;
    border-radius: 50%;
    opacity: 0;
    filter: drop-shadow(0 0 4px currentColor);
  }
  .fw-cat::before {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    background: currentColor;
    border-radius: 50%;
    left: -2px;
    top: -5px;
    /* Pointed ears using clip-path */
    clip-path: polygon(0% 100%, 50% 0%, 100% 100%, 85% 100%, 50% 40%, 15% 100%);
  }
  .fw-cat::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 2px;
    background: currentColor;
    border-radius: 50%;
    right: -7px;
    top: 4px;
    transform: rotate(-30deg); /* curved tail */
  }

  /* Animation timing for each explosion */
  .fw-group-1 .fw-particle,
  .fw-group-1 .fw-heart,
  .fw-group-1 .fw-star,
  .fw-group-1 .fw-paw { animation-delay: 0.2s; }
  .fw-group-2 .fw-particle,
  .fw-group-2 .fw-heart,
  .fw-group-2 .fw-star,
  .fw-group-2 .fw-paw { animation-delay: 1.5s; }
  .fw-group-3 .fw-particle,
  .fw-group-3 .fw-heart,
  .fw-group-3 .fw-star,
  .fw-group-3 .fw-paw { animation-delay: 2.8s; }

  /* Radial burst animations - 8 directions */
  .fw-dir-0 { animation: fw-burst-up 4s ease-out infinite; }
  .fw-dir-1 { animation: fw-burst-upright 4s ease-out infinite; }
  .fw-dir-2 { animation: fw-burst-right 4s ease-out infinite; }
  .fw-dir-3 { animation: fw-burst-downright 4s ease-out infinite; }
  .fw-dir-4 { animation: fw-burst-down 4s ease-out infinite; }
  .fw-dir-5 { animation: fw-burst-downleft 4s ease-out infinite; }
  .fw-dir-6 { animation: fw-burst-left 4s ease-out infinite; }
  .fw-dir-7 { animation: fw-burst-upleft 4s ease-out infinite; }

  @keyframes fw-burst-up {
    0%, 20% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    60% { transform: translate(-50%, calc(-50% - 35px)) scale(0.8); opacity: 0.8; }
    100% { transform: translate(-50%, calc(-50% - 45px)) scale(0.3); opacity: 0; }
  }
  @keyframes fw-burst-upright {
    0%, 20% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    60% { transform: translate(calc(-50% + 25px), calc(-50% - 25px)) scale(0.8); opacity: 0.8; }
    100% { transform: translate(calc(-50% + 35px), calc(-50% - 35px)) scale(0.3); opacity: 0; }
  }
  @keyframes fw-burst-right {
    0%, 20% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    60% { transform: translate(calc(-50% + 35px), -50%) scale(0.8); opacity: 0.8; }
    100% { transform: translate(calc(-50% + 45px), -50%) scale(0.3); opacity: 0; }
  }
  @keyframes fw-burst-downright {
    0%, 20% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    60% { transform: translate(calc(-50% + 25px), calc(-50% + 25px)) scale(0.8); opacity: 0.8; }
    100% { transform: translate(calc(-50% + 35px), calc(-50% + 35px)) scale(0.3); opacity: 0; }
  }
  @keyframes fw-burst-down {
    0%, 20% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    60% { transform: translate(-50%, calc(-50% + 35px)) scale(0.8); opacity: 0.8; }
    100% { transform: translate(-50%, calc(-50% + 45px)) scale(0.3); opacity: 0; }
  }
  @keyframes fw-burst-downleft {
    0%, 20% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    60% { transform: translate(calc(-50% - 25px), calc(-50% + 25px)) scale(0.8); opacity: 0.8; }
    100% { transform: translate(calc(-50% - 35px), calc(-50% + 35px)) scale(0.3); opacity: 0; }
  }
  @keyframes fw-burst-left {
    0%, 20% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    60% { transform: translate(calc(-50% - 35px), -50%) scale(0.8); opacity: 0.8; }
    100% { transform: translate(calc(-50% - 45px), -50%) scale(0.3); opacity: 0; }
  }
  @keyframes fw-burst-upleft {
    0%, 20% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    60% { transform: translate(calc(-50% - 25px), calc(-50% - 25px)) scale(0.8); opacity: 0.8; }
    100% { transform: translate(calc(-50% - 35px), calc(-50% - 35px)) scale(0.3); opacity: 0; }
  }
`;

// Drag event handlers
const handleDragStart = (e) => {
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
  posStart = { ...widgetPosition };
  dragElement = e.target.closest('.widget-container');
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
  e.preventDefault();
};

const handleDragMove = (e) => {
  if (!isDragging || !dragElement) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  const newBottom = Math.max(0, posStart.bottom - dy);
  const newLeft = Math.max(0, posStart.left + dx);
  widgetPosition = { bottom: newBottom, left: newLeft };
  dragElement.style.bottom = `${newBottom}px`;
  dragElement.style.left = `${newLeft}px`;
};

const handleDragEnd = () => {
  isDragging = false;
  dragElement = null;
  savePosition(widgetPosition);
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
};

// Styles
const container = {
  background: "rgba(0, 0, 0, 0.82)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "16px",
  padding: "16px 20px",
  minWidth: "260px",
  maxWidth: "320px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  pointerEvents: "auto",
};

const dragIndicator = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.3)",
  letterSpacing: "2px",
};

const header = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "1.2px",
  color: "rgba(255, 255, 255, 0.5)",
  marginBottom: "12px",
};

const row = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
};

const clickableRow = {
  ...row,
  cursor: "pointer",
  borderRadius: "8px",
  margin: "0 -8px",
  padding: "8px",
  transition: "background 0.15s ease",
};

// Navigation URLs
const NAV_URLS = {
  thermostat: `${HA_URL}/dashboard-thermostats/0`,
  lock: `${HA_URL}/dashboard-alarm/0`,
  alarm: `${HA_URL}/dashboard-alarm/0`,
  cameras: `${HA_URL}/dashboard-cameras/0`,
};

const openHA = (page) => {
  const url = NAV_URLS[page] || `${HA_URL}/lovelace/0`;
  run(`open "${url}"`);
};

const separator = {
  height: "1px",
  background: "rgba(255, 255, 255, 0.1)",
  margin: "0",
};

const label = {
  fontSize: "13px",
  fontWeight: 500,
  color: "rgba(255, 255, 255, 0.8)",
};

const value = {
  fontSize: "20px",
  fontWeight: 600,
};

const icon = {
  fontSize: "18px",
  marginRight: "10px",
  width: "24px",
  textAlign: "center",
};

const statusBadge = (color) => ({
  fontSize: "10px",
  fontWeight: 500,
  color: color,
  background: `${color}20`,
  padding: "2px 8px",
  borderRadius: "8px",
  textTransform: "capitalize",
});

const btn = {
  background: "rgba(255, 255, 255, 0.1)",
  border: "none",
  borderRadius: "8px",
  padding: "6px 12px",
  fontSize: "11px",
  fontWeight: 500,
  color: "#fff",
  cursor: "pointer",
  marginLeft: "6px",
};

const btnActive = (color) => ({
  ...btn,
  background: `${color}30`,
  color: color,
  border: `1px solid ${color}50`,
});

const alarmBtnRow = {
  display: "flex",
  gap: "6px",
  marginTop: "8px",
  justifyContent: "flex-end",
};

const alarmBtn = (active, color) => ({
  background: active ? `${color}30` : "rgba(255, 255, 255, 0.08)",
  border: active ? `1px solid ${color}50` : "1px solid transparent",
  borderRadius: "8px",
  padding: "6px 10px",
  fontSize: "10px",
  fontWeight: 500,
  color: active ? color : "rgba(255, 255, 255, 0.6)",
  cursor: "pointer",
});

const cameraSection = {
  marginTop: "12px",
  paddingTop: "12px",
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
};

const cameraGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginTop: "8px",
};

const cameraThumb = {
  borderRadius: "8px",
  overflow: "hidden",
  background: "rgba(255, 255, 255, 0.05)",
  cursor: "pointer",
};

const cameraImg = {
  width: "100%",
  height: "70px",
  objectFit: "cover",
  display: "block",
};

const cameraLabel = {
  fontSize: "9px",
  color: "rgba(255, 255, 255, 0.6)",
  padding: "4px",
  textAlign: "center",
  background: "rgba(0, 0, 0, 0.3)",
};

const automationSection = {
  marginTop: "12px",
  paddingTop: "12px",
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
};

const automationGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginTop: "8px",
};

const automationBtn = {
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "12px",
  padding: "12px 8px",
  fontSize: "11px",
  fontWeight: 500,
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  transition: "all 0.2s ease",
};

const errorStyle = {
  ...container,
  fontSize: "12px",
  color: "rgba(255, 255, 255, 0.9)",
  padding: "16px 20px",
};

const errorIconStyle = {
  fontSize: "32px",
  marginBottom: "8px",
  opacity: 0.8,
};

const errorTitleStyle = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "4px",
  color: "rgba(255, 255, 255, 0.9)",
};

const errorMessageStyle = {
  fontSize: "11px",
  color: "rgba(255, 255, 255, 0.5)",
  marginBottom: "12px",
  lineHeight: 1.4,
};

const errorRetryBtn = {
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "8px",
  padding: "8px 16px",
  fontSize: "11px",
  fontWeight: 500,
  color: "#fff",
  cursor: "pointer",
  marginTop: "8px",
};

// Helper functions
function getFlueColor(temp) {
  if (temp < 100) return "#8e8e93";
  if (temp < 250) return "#ff9f0a";
  if (temp < 450) return "#ff6b35";
  if (temp < 600) return "#ff453a";
  return "#ff2d55";
}

function getFlueStatus(temp, roomTemp) {
  if (temp < roomTemp + 15) return "No Fire";
  if (temp < 250) return "Starting";
  if (temp < 450) return "Burning";
  if (temp < 600) return "Hot";
  return "Overfire!";
}

function getTempColor(current, setpoint) {
  const diff = current - setpoint;
  if (diff < -2) return "#0a84ff";
  if (diff > 2) return "#ff9f0a";
  return "#30d158";
}

function getLockColor(state) {
  if (state === "locked") return "#30d158";
  if (state === "unlocked") return "#ff9f0a";
  return "#8e8e93";
}

function getAlarmColor(state) {
  if (state === "disarmed") return "#8e8e93";
  if (state === "armed_home") return "#0a84ff";
  if (state === "armed_away") return "#ff453a";
  if (state === "pending" || state === "arming") return "#ff9f0a";
  if (state === "triggered") return "#ff2d55";
  return "#8e8e93";
}

function getAlarmLabel(state) {
  const labels = {
    disarmed: "Disarmed",
    armed_home: "Home",
    armed_away: "Away",
    pending: "Pending",
    arming: "Arming",
    triggered: "TRIGGERED!",
  };
  return labels[state] || state;
}

// Home Assistant service calls (using curl via run() for Übersicht sandbox)
const callService = (domain, service, entityId) => {
  const cmd = `curl -s -X POST -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" -d '{"entity_id":"${entityId}"}' "${HA_URL}/api/services/${domain}/${service}"`;
  run(cmd);
};

const lockDoor = () => callService("lock", "lock", ENTITIES.lock);
const unlockDoor = () => callService("lock", "unlock", ENTITIES.lock);
const armHome = () => callService("alarm_control_panel", "alarm_arm_home", ENTITIES.alarm);
const armAway = () => callService("alarm_control_panel", "alarm_arm_away", ENTITIES.alarm);
const disarm = () => callService("alarm_control_panel", "alarm_disarm", ENTITIES.alarm);

// Automation triggers
const triggerGoodnight = () => callService("script", "turn_on", AUTOMATIONS.goodnight);
const triggerDinnerTime = () => callService("script", "turn_on", AUTOMATIONS.dinnerTime);

// Particle generation for weather and holidays
const generateParticles = (type, count = 12) => {
  const particles = [];
  const particleChars = {
    hearts: ["❤️", "💕", "💗", "💖", "💝"],
    paws: ["🐾", "🦴", "🐕", "🎾"],
    rain: null, // Uses CSS div
    snow: ["❄️", "❅", "❆", "✻", "✼"],
    leaves: ["🍂", "🍁", "🍃"],
    confetti: null, // Uses CSS div with colors
    bats: ["🦇"],
    clovers: ["☘️", "🍀"],
    eggs: ["🥚", "🐣", "🐰", "🌷"],
    fireworks: ["✨", "🎆", "🎇", "⭐"],
    sparkles: ["✨", "⭐", "💫"],
  };

  const chars = particleChars[type];
  const confettiColors = ["#ff4d6d", "#ffd700", "#00ff88", "#00bfff", "#ff6b35", "#9b59b6"];

  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 4;
    const duration = 2 + Math.random() * 3;

    if (type === "rain") {
      particles.push(
        <div
          key={i}
          className="particle particle-rain"
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${0.5 + Math.random() * 0.5}s`,
          }}
        />
      );
    } else if (type === "confetti") {
      particles.push(
        <div
          key={i}
          className="particle particle-confetti"
          style={{
            left: `${left}%`,
            backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      );
    } else if (chars) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      particles.push(
        <span
          key={i}
          className={`particle particle-${type === "hearts" ? "heart" : type === "paws" ? "heart" : type === "snow" ? "snow" : type === "leaves" ? "leaf" : type === "bats" ? "bat" : type === "clovers" ? "clover" : type === "eggs" ? "egg" : "sparkle"}`}
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        >
          {char}
        </span>
      );
    }
  }
  return particles;
};

// Get themed container style
const getThemedContainer = (holiday, weatherCondition, isNight) => {
  let theme = null;

  // Holiday takes priority, then weather, then night
  if (holiday && HOLIDAY_THEMES[holiday.key]) {
    theme = HOLIDAY_THEMES[holiday.key];
  } else if (weatherCondition && WEATHER_THEMES[WEATHER_PARTICLES[weatherCondition]]) {
    theme = WEATHER_THEMES[WEATHER_PARTICLES[weatherCondition]];
  } else if (isNight) {
    theme = NIGHT_THEME;
  }

  // Day vs night background - lighter for day, darker for night
  const dayBackground = "rgba(30, 35, 45, 0.75)";
  const nightBackground = "rgba(10, 12, 20, 0.85)";
  const baseBackground = isNight ? nightBackground : dayBackground;

  if (!theme) {
    return {
      ...container,
      background: baseBackground,
    };
  }

  return {
    ...container,
    background: baseBackground,
    border: `1px solid ${theme.border}`,
    boxShadow: `${container.boxShadow}, ${theme.glow || ""}`,
  };
};

// Camera images are fetched as base64 in the command output

// Holiday overlay component (renders on TOP of weather, z-index 1)
const HolidayOverlay = ({ holiday }) => {
  if (!holiday) return null;

  const overlayStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "85px",
    borderRadius: "16px 16px 0 0",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: 1,
  };

  // Halloween - flying bats
  if (holiday.key === "halloween") {
    return (
      <div style={overlayStyle}>
        <div className="bat bat-1" />
        <div className="bat bat-2" />
        <div className="bat bat-3" />
        <div className="bat bat-4" />
      </div>
    );
  }

  // Thanksgiving - falling leaves
  if (holiday.key === "thanksgiving") {
    return (
      <div style={overlayStyle}>
        <div className="fall-leaf fall-leaf-1" />
        <div className="fall-leaf fall-leaf-2" />
        <div className="fall-leaf fall-leaf-3" />
        <div className="fall-leaf fall-leaf-4" />
        <div className="fall-leaf fall-leaf-5" />
        <div className="fall-leaf fall-leaf-6" />
      </div>
    );
  }

  // New Year - confetti
  if (holiday.key === "newYear") {
    return (
      <div style={overlayStyle}>
        <div className="confetti confetti-1" />
        <div className="confetti confetti-2" />
        <div className="confetti confetti-3" />
        <div className="confetti confetti-4" />
        <div className="confetti confetti-5" />
        <div className="confetti confetti-6" />
        <div className="confetti confetti-7" />
        <div className="confetti confetti-8" />
      </div>
    );
  }

  // Christmas - sleigh with reindeer
  if (holiday.key === "christmas") {
    return (
      <div style={overlayStyle}>
        <div className="sleigh-group">
          <div className="reindeer reindeer-1" />
          <div className="reindeer reindeer-2" />
          <div className="sleigh" />
        </div>
      </div>
    );
  }

  // July 4th - fireworks
  if (holiday.key === "july4th") {
    const createExplosion = (groupNum, shapes, color) => {
      const particles = [];
      for (let i = 0; i < 8; i++) {
        const shape = shapes[i % shapes.length];
        if (shape === "heart") {
          particles.push(<div key={`${groupNum}-${i}`} className={`fw-heart fw-dir-${i}`} style={{color}} />);
        } else if (shape === "dog") {
          particles.push(<div key={`${groupNum}-${i}`} className={`fw-dog fw-dir-${i}`} style={{color}} />);
        } else if (shape === "cat") {
          particles.push(<div key={`${groupNum}-${i}`} className={`fw-cat fw-dir-${i}`} style={{color}} />);
        } else {
          particles.push(<div key={`${groupNum}-${i}`} className={`fw-particle fw-dir-${i}`} style={{background: color, boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`}} />);
        }
      }
      return particles;
    };
    return (
      <div style={overlayStyle}>
        <div className="fw-trail fw-trail-1" />
        <div className="fw-trail fw-trail-2" />
        <div className="fw-trail fw-trail-3" />
        <div className="fw-explosion fw-explosion-1 fw-group-1">
          {createExplosion(1, ["heart", "dog", "heart", "cat", "heart", "dog", "heart", "cat"], "#ff4466")}
        </div>
        <div className="fw-explosion fw-explosion-2 fw-group-2">
          {createExplosion(2, ["dog", "heart", "cat", "heart", "dog", "heart", "cat", "heart"], "#6699ff")}
        </div>
        <div className="fw-explosion fw-explosion-3 fw-group-3">
          {createExplosion(3, ["cat", "dog", "heart", "cat", "dog", "heart", "cat", "dog"], "#ffdd44")}
        </div>
      </div>
    );
  }

  return null;
};

// Weather background component with animation (top portion only)
const WeatherBackground = ({ condition, isNight }) => {
  const baseStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "85px", // Only covers header + weather bar area
    borderRadius: "16px 16px 0 0",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: 0,
    maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
    WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
  };

  // ===== WEATHER ANIMATIONS =====

  // Cloudy/Partly cloudy - drifting cloud shapes (with sun peeking for partly cloudy)
  if (condition === "cloudy" || condition === "partlycloudy" || condition === "partly-cloudy") {
    const isPartly = condition === "partlycloudy" || condition === "partly-cloudy";
    return (
      <div style={baseStyle}>
        {/* Sun peeking through for partly cloudy */}
        {isPartly && (
          <div style={{
            position: "absolute",
            top: "5px",
            right: "15px",
            width: "30px",
            height: "30px",
            background: "radial-gradient(circle, rgba(255,220,100,0.9) 0%, rgba(255,200,50,0.6) 40%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(1px)",
            animation: "pulse-sun 4s ease-in-out infinite",
          }} />
        )}
        {/* Cloud 1 - large, slow */}
        <div className="cloud cloud-1" style={{
          position: "absolute",
          top: "10px",
          width: "60px",
          height: "25px",
          background: "radial-gradient(ellipse at 50% 120%, rgba(200,200,210,0.5) 0%, transparent 70%), radial-gradient(ellipse at 20% 80%, rgba(200,200,210,0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(200,200,210,0.4) 0%, transparent 50%)",
          borderRadius: "50%",
          filter: "blur(2px)",
        }} />
        {/* Cloud 2 - medium */}
        <div className="cloud cloud-2" style={{
          position: "absolute",
          top: "25px",
          width: "45px",
          height: "20px",
          background: "radial-gradient(ellipse at 50% 120%, rgba(180,180,190,0.4) 0%, transparent 70%), radial-gradient(ellipse at 30% 80%, rgba(180,180,190,0.3) 0%, transparent 50%)",
          borderRadius: "50%",
          filter: "blur(2px)",
        }} />
        {/* Cloud 3 - small, faster */}
        <div className="cloud cloud-3" style={{
          position: "absolute",
          top: "5px",
          width: "35px",
          height: "15px",
          background: "radial-gradient(ellipse at 50% 100%, rgba(220,220,230,0.5) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(1px)",
        }} />
      </div>
    );
  }

  // Rainy - fast rain streaks (with lightning for thunderstorms)
  if (condition === "rainy" || condition === "pouring" || condition === "lightning-rainy" || condition === "lightning") {
    const isPouring = condition === "pouring" || condition === "lightning-rainy";
    const hasLightning = condition === "lightning-rainy" || condition === "lightning";
    const dropCount = isPouring ? 25 : 15;
    const elements = [];

    for (let i = 0; i < dropCount; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = isPouring ? 0.25 + Math.random() * 0.1 : 0.35 + Math.random() * 0.15;
      const height = isPouring ? 25 + Math.random() * 15 : 18 + Math.random() * 12;

      elements.push(
        <div
          key={`drop-${i}`}
          className="rainstreak"
          style={{
            position: "absolute",
            left: `${left}%`,
            top: "-30px",
            width: "1px",
            height: `${height}px`,
            background: "linear-gradient(to bottom, transparent, rgba(150, 180, 220, 0.4), rgba(150, 180, 220, 0.7))",
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      );
    }

    return (
      <div style={{...baseStyle, background: "linear-gradient(180deg, rgba(50, 60, 80, 0.3) 0%, transparent 100%)"}}>
        {elements}
        {hasLightning && <div className="lightning-flash" />}
      </div>
    );
  }

  // Windy - wind streaks, blowing leaves, and paw prints
  if (condition === "windy") {
    return (
      <div style={{...baseStyle, background: "linear-gradient(180deg, rgba(60, 70, 80, 0.2) 0%, transparent 100%)"}}>
        <div className="wind-streak wind-streak-1" />
        <div className="wind-streak wind-streak-2" />
        <div className="wind-streak wind-streak-3" />
        <div className="wind-streak wind-streak-4" />
        <div className="wind-streak wind-streak-5" />
        <div className="wind-leaf wind-leaf-1" />
        <div className="wind-leaf wind-leaf-2" />
        <div className="wind-leaf wind-leaf-3" />
        <div className="wind-paw wind-paw-1" />
        <div className="wind-paw wind-paw-2" />
        <div className="wind-paw wind-paw-3" />
      </div>
    );
  }

  // Snowy
  if (condition === "snowy" || condition === "hail") {
    return (
      <div className="weather-anim-snow" style={{
        ...baseStyle,
        background: `
          linear-gradient(180deg, rgba(30, 40, 60, 0.4) 0%, rgba(40, 50, 70, 0.3) 100%),
          radial-gradient(circle at 20% 20%, rgba(255,255,255,0.9) 2px, transparent 2px),
          radial-gradient(circle at 60% 40%, rgba(255,255,255,0.8) 1.5px, transparent 1.5px),
          radial-gradient(circle at 80% 10%, rgba(255,255,255,0.9) 2px, transparent 2px),
          radial-gradient(circle at 40% 70%, rgba(255,255,255,0.7) 1px, transparent 1px),
          radial-gradient(circle at 10% 50%, rgba(255,255,255,0.9) 2px, transparent 2px),
          radial-gradient(circle at 90% 80%, rgba(255,255,255,0.8) 1.5px, transparent 1.5px)
        `,
        backgroundSize: "100% 100%, 100px 100px, 80px 80px, 120px 120px, 60px 60px, 90px 90px, 70px 70px",
      }} />
    );
  }

  // Sunny/Clear
  if (condition === "sunny" || condition === "clear" || condition === "clear-day") {
    return (
      <div className="weather-anim-sunny" style={{
        ...baseStyle,
        background: "radial-gradient(ellipse at 50% 0%, rgba(255, 220, 100, 0.3) 0%, rgba(255, 200, 50, 0.15) 30%, transparent 60%)",
      }} />
    );
  }

  // Night (when clear or no specific weather)
  if (isNight || condition === "clear-night") {
    return (
      <div className="weather-anim-night" style={{
        ...baseStyle,
        background: `
          radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.8) 1px, transparent 1px),
          radial-gradient(circle at 85% 35%, rgba(255, 255, 255, 0.6) 1px, transparent 1px),
          radial-gradient(circle at 45% 80%, rgba(255, 255, 255, 0.7) 1px, transparent 1px),
          radial-gradient(circle at 70% 15%, rgba(255, 255, 255, 0.5) 1px, transparent 1px),
          radial-gradient(circle at 25% 55%, rgba(255, 255, 255, 0.6) 1px, transparent 1px),
          radial-gradient(circle at 90% 70%, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%",
      }} />
    );
  }

  // Fog
  if (condition === "fog") {
    return (
      <div className="weather-anim-fog" style={{
        ...baseStyle,
        background: "linear-gradient(90deg, transparent 0%, rgba(200, 200, 200, 0.3) 30%, rgba(200, 200, 200, 0.4) 50%, rgba(200, 200, 200, 0.3) 70%, transparent 100%)",
      }} />
    );
  }

  return null;
};

export const render = ({ output, error }) => {
  const pos = getStoredPosition();

  // Helper to get time since last error
  const getTimeSinceError = () => {
    if (!lastErrorTime) return "";
    const seconds = Math.floor((Date.now() - lastErrorTime) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  // Manual refresh function
  const forceRefresh = () => {
    run(`osascript -e 'tell application "Übersicht" to refresh widget id "home-assistant-jsx"'`);
  };

  if (error || !output) {
    consecutiveErrors++;
    lastErrorTime = Date.now();

    const isOffline = consecutiveErrors >= MAX_ERRORS_BEFORE_OFFLINE;
    const errorIcon = isOffline ? "📡" : "⏳";
    const errorTitle = isOffline ? "Home Assistant Offline" : "Connecting...";
    const errorMessage = isOffline
      ? "Unable to reach your Home Assistant server. Check your network connection or server status."
      : "Temporarily unable to connect. Retrying automatically...";

    return (
      <div style={{position: "relative", width: "100%", height: "100%"}}>
        <div
          className="widget-container"
          style={{
            ...errorStyle,
            position: "absolute",
            bottom: `${pos.bottom}px`,
            left: `${pos.left}px`,
            textAlign: "center",
          }}
        >
          <div style={errorIconStyle}>{errorIcon}</div>
          <div style={errorTitleStyle}>{errorTitle}</div>
          <div style={errorMessageStyle}>{errorMessage}</div>
          <div style={{fontSize: "10px", color: "rgba(255,255,255,0.3)", marginBottom: "8px"}}>
            Attempt {consecutiveErrors} • Retrying in 10s
          </div>
          <button style={errorRetryBtn} onClick={forceRefresh}>
            Retry Now
          </button>
        </div>
      </div>
    );
  }

  // Reset error tracking on successful response
  consecutiveErrors = 0;
  lastErrorTime = null;

  try {
    const parts = output.split("---SPLIT---");
    if (parts.length < 6) throw new Error("Incomplete data");

    const flueData = JSON.parse(parts[0].trim());
    const thermostatData = JSON.parse(parts[1].trim());
    const currentTempData = JSON.parse(parts[2].trim());
    const lockData = JSON.parse(parts[3].trim());
    const alarmData = JSON.parse(parts[4].trim());

    // Weather data
    let weatherData = null;
    let weatherCondition = null;
    try {
      weatherData = JSON.parse(parts[5].trim());
      weatherCondition = TEST_WEATHER || weatherData?.state; // Use test override if set
    } catch (e) {
      weatherCondition = TEST_WEATHER || null; // Use test override even on error
    }

    // Sun data for night detection
    let sunData = null;
    let isNight = false;
    try {
      sunData = JSON.parse(parts[6].trim());
      isNight = checkIsNightTime(sunData?.state);
    } catch (e) {
      // Fallback to time-based
      isNight = checkIsNightTime(null);
    }

    // Camera images as base64 data URLs
    const cameraFrontB64 = parts[7] ? parts[7].trim() : "";
    const cameraBackyardB64 = parts[8] ? parts[8].trim() : "";
    const cameraFrontSrc = cameraFrontB64 ? `data:image/jpeg;base64,${cameraFrontB64}` : "";
    const cameraBackyardSrc = cameraBackyardB64 ? `data:image/jpeg;base64,${cameraBackyardB64}` : "";

    // Detect active holiday (exact day only for particles, within 3 days for theming)
    // Use TEST_HOLIDAY override if set
    const activeHoliday = TEST_HOLIDAY ? { key: TEST_HOLIDAY, ...HOLIDAYS[TEST_HOLIDAY] } : getActiveHoliday(0);
    const nearHoliday = TEST_HOLIDAY ? { key: TEST_HOLIDAY, ...HOLIDAYS[TEST_HOLIDAY] } : getActiveHoliday(3);

    // Determine particle type
    let particleType = null;
    let particleCount = 12;

    // Skip particle system for holidays with custom CSS animations
    const cssAnimatedHolidays = ["july4th", "halloween", "christmas", "newYear", "thanksgiving"];
    if (activeHoliday && !cssAnimatedHolidays.includes(activeHoliday.key)) {
      particleType = activeHoliday.particles;
      particleCount = activeHoliday.key === "valentines" ? 15 : 12;
    } else if (weatherCondition && WEATHER_PARTICLES[weatherCondition]) {
      particleType = WEATHER_PARTICLES[weatherCondition];
      particleCount = weatherCondition === "pouring" ? 25 : weatherCondition === "rainy" ? 15 : 10;
    } else if (isNight && !weatherCondition) {
      // Subtle stars at night when no weather effects
      particleType = "sparkles";
      particleCount = 8;
    }

    // Get themed container style
    const themedContainer = getThemedContainer(nearHoliday, weatherCondition, isNight);

    const flueTemp = parseFloat(flueData.state);

    // Check for high flue temperature and send alert
    if (!isNaN(flueTemp)) {
      if (flueTemp >= FLUE_ALERT_THRESHOLD) {
        sendFlueAlert(flueTemp);
      } else if (flueTemp < FLUE_ALERT_THRESHOLD - 50) {
        // Reset alert when temp drops 50° below threshold (hysteresis)
        resetFlueAlert();
      }
    }

    const currentTemp = parseFloat(currentTempData.state);
    const setpoint = thermostatData.attributes?.temperature
      ? parseFloat(thermostatData.attributes.temperature)
      : null;
    const hvacAction = thermostatData.attributes?.hvac_action || "idle";

    const lockState = lockData.state;
    const lockName = lockData.attributes?.friendly_name || "Front Door";

    const alarmState = alarmData.state;

    const flueColor = getFlueColor(flueTemp);
    const flueStatus = getFlueStatus(flueTemp, currentTemp);
    const tempColor = setpoint ? getTempColor(currentTemp, setpoint) : "#fff";
    const lockColor = getLockColor(lockState);
    const alarmColor = getAlarmColor(alarmState);

    const pos = widgetPosition;

    // Weather icon mapping
    const weatherIcons = {
      sunny: "☀️", "clear-night": "🌙", partlycloudy: "⛅", cloudy: "☁️",
      rainy: "🌧️", pouring: "🌧️", "lightning-rainy": "⛈️", snowy: "🌨️",
      hail: "🌨️", windy: "💨", fog: "🌫️", exceptional: "⚠️",
    };
    const weatherIcon = weatherCondition ? weatherIcons[weatherCondition] || "🌤️" : null;

    // Weather background class mapping (includes all HA weather conditions)
    const weatherBgClasses = {
      // Rain conditions
      rainy: "weather-bg-rain",
      pouring: "weather-bg-pouring",
      "lightning-rainy": "weather-bg-rain weather-bg-lightning",
      lightning: "weather-bg-lightning",
      // Snow conditions
      snowy: "weather-bg-snow",
      hail: "weather-bg-snow",
      // Cloud conditions
      cloudy: "weather-bg-cloudy",
      partlycloudy: "weather-bg-cloudy",
      "partly-cloudy": "weather-bg-cloudy",
      // Fog
      fog: "weather-bg-fog",
      // Clear/sunny
      sunny: "weather-bg-sunny",
      clear: "weather-bg-sunny",
      "clear-day": "weather-bg-sunny",
      "clear-night": "weather-bg-night",
    };

    // Determine weather background
    let weatherBgClass = "";
    if (weatherCondition && weatherBgClasses[weatherCondition]) {
      weatherBgClass = weatherBgClasses[weatherCondition];
    } else if (isNight) {
      weatherBgClass = "weather-bg-night";
    }

    // Debug: Log weather condition (remove after testing)
    console.log("Weather condition:", weatherCondition, "isNight:", isNight, "bgClass:", weatherBgClass);

    // Get weather details from weather data
    const outdoorTemp = weatherData?.attributes?.temperature;
    const humidity = weatherData?.attributes?.humidity;
    const weatherConditionLabel = weatherCondition?.replace(/-/g, " ").replace("lightning rainy", "thunderstorm");

    // Get forecast data for hi/lo and precipitation
    const forecast = weatherData?.attributes?.forecast?.[0] || {};
    const tempHigh = forecast.temperature || weatherData?.attributes?.temperature;
    const tempLow = forecast.templow;
    const precipitation = forecast.precipitation_probability;

    // Holiday header text
    const headerText = activeHoliday
      ? `${activeHoliday.icon} ${activeHoliday.name}`
      : nearHoliday
        ? `${nearHoliday.icon} Home`
        : "Home";

    return (
      <div style={{position: "relative", width: "100%", height: "100%"}}>
        <div
          className="widget-container"
          style={{
            ...themedContainer,
            position: "absolute",
            bottom: `${pos.bottom}px`,
            left: `${pos.left}px`,
          }}
        >
          {/* Animated weather background */}
          <WeatherBackground condition={weatherCondition} isNight={isNight} />

          {/* Holiday overlay (falling leaves, snow, etc.) */}
          <HolidayOverlay holiday={activeHoliday} />

          {/* Particle effects overlay */}
          {particleType && (
            <div className="particle-container">
              {generateParticles(particleType, particleCount)}
            </div>
          )}

          {/* Drag Handle */}
          <div
            className="drag-handle"
            style={{padding: "4px 0", marginBottom: "6px", display: "flex", justifyContent: "center"}}
            onMouseDown={handleDragStart}
            title="Drag to move"
          >
            <span style={dragIndicator}>⋮⋮</span>
          </div>

          <div style={header}>{headerText}</div>

          {/* Weather Status Bar */}
          {weatherData && (
            <div className="weather-status-bar">
              <span style={{fontSize: "16px"}}>{weatherIcon}</span>
              <span className="temp">{Math.round(outdoorTemp)}°F</span>
              <span className="condition">{weatherConditionLabel}</span>
              {tempHigh && tempLow && (
                <span style={{opacity: 0.7}}>
                  H:{Math.round(tempHigh)}° L:{Math.round(tempLow)}°
                </span>
              )}
              {precipitation !== undefined && precipitation > 0 && (
                <span style={{color: "#5c9ece"}}>
                  💧{precipitation}%
                </span>
              )}
            </div>
          )}

          {/* Fireplace */}
          <div className="clickable-row" style={clickableRow} onClick={() => openHA('thermostat')}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={icon}>🔥</span>
              <div>
                <div style={label}>Fireplace Flue</div>
                <div style={{ fontSize: "10px", color: flueColor, marginTop: "2px" }}>
                  {flueStatus}
                </div>
              </div>
            </div>
            <div style={{ ...value, color: flueColor }}>
              {isNaN(flueTemp) ? "—" : `${Math.round(flueTemp)}°`}
            </div>
          </div>

          <div style={separator} />

          {/* Current Temp */}
          <div className="clickable-row" style={clickableRow} onClick={() => openHA('thermostat')}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={icon}>🌡️</span>
              <div>
                <div style={label}>Current Temp</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                  {hvacAction === "heating" ? "Heating" : hvacAction === "cooling" ? "Cooling" : "Idle"}
                </div>
              </div>
            </div>
            <div style={{ ...value, color: tempColor }}>
              {isNaN(currentTemp) ? "—" : `${currentTemp}°`}
            </div>
          </div>

          <div style={separator} />

          {/* Thermostat Setpoint */}
          <div className="clickable-row" style={clickableRow} onClick={() => openHA('thermostat')}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={icon}>🎯</span>
              <div style={label}>Setpoint</div>
            </div>
            <div style={{ ...value, color: "rgba(255, 255, 255, 0.9)" }}>
              {setpoint === null ? "—" : `${setpoint}°`}
            </div>
          </div>

          <div style={separator} />

          {/* Front Door Lock */}
          <div className="clickable-row" style={clickableRow} onClick={() => openHA('lock')}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={icon}>{lockState === "locked" ? "🔒" : "🔓"}</span>
              <div>
                <div style={label}>Front Door</div>
                <div style={statusBadge(lockColor)}>
                  {lockState === "locked" ? "Locked" : lockState === "unlocked" ? "Unlocked" : lockState}
                </div>
              </div>
            </div>
            <div>
              {lockState === "unlocked" ? (
                <button style={btnActive("#30d158")} onClick={(e) => { e.stopPropagation(); lockDoor(); }}>Lock</button>
              ) : (
                <button style={btnActive("#ff9f0a")} onClick={(e) => { e.stopPropagation(); unlockDoor(); }}>Unlock</button>
              )}
            </div>
          </div>

          <div style={separator} />

          {/* Ring Alarm */}
          <div className="clickable-row" style={{...clickableRow, flexDirection: "column", alignItems: "stretch"}} onClick={() => openHA('alarm')}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={icon}>🛡️</span>
                <div>
                  <div style={label}>Ring Alarm</div>
                  <div style={statusBadge(alarmColor)}>
                    {getAlarmLabel(alarmState)}
                  </div>
                </div>
              </div>
            </div>
            <div style={alarmBtnRow}>
              <button
                style={alarmBtn(alarmState === "armed_home", "#0a84ff")}
                onClick={(e) => { e.stopPropagation(); armHome(); }}
                title="Arm Home"
              >
                Home
              </button>
              <button
                style={alarmBtn(alarmState === "armed_away", "#ff453a")}
                onClick={(e) => { e.stopPropagation(); armAway(); }}
                title="Arm Away"
              >
                Away
              </button>
              <button
                style={alarmBtn(alarmState === "disarmed", "#30d158")}
                onClick={(e) => { e.stopPropagation(); disarm(); }}
                title="Disarm"
              >
                Disarm
              </button>
            </div>
          </div>

          {/* Ring Cameras */}
          <div style={cameraSection}>
            <div style={{...header, marginBottom: "0", cursor: "pointer"}} onClick={() => openHA('cameras')}>📹 Cameras</div>
            <div style={cameraGrid}>
              <div style={cameraThumb} onClick={() => openHA('cameras')}>
                {cameraFrontSrc ? (
                  <img src={cameraFrontSrc} style={cameraImg} alt="Front" />
                ) : (
                  <div style={{height: "70px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: "10px"}}>Loading...</div>
                )}
                <div style={cameraLabel}>Front Driveway</div>
              </div>
              <div style={cameraThumb} onClick={() => openHA('cameras')}>
                {cameraBackyardSrc ? (
                  <img src={cameraBackyardSrc} style={cameraImg} alt="Backyard" />
                ) : (
                  <div style={{height: "70px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: "10px"}}>Loading...</div>
                )}
                <div style={cameraLabel}>Backyard</div>
              </div>
            </div>
          </div>

          {/* Automations */}
          <div style={automationSection}>
            <div style={{...header, marginBottom: "0"}}>⚡ Quick Actions</div>
            <div style={automationGrid}>
              <button
                className="automation-btn"
                style={automationBtn}
                onClick={(e) => { e.stopPropagation(); triggerDinnerTime(); }}
                title="Run Dinner Time routine"
              >
                <span style={{fontSize: "20px"}}>🍽️</span>
                <span>Dinner Time</span>
              </button>
              <button
                className="automation-btn"
                style={automationBtn}
                onClick={(e) => { e.stopPropagation(); triggerGoodnight(); }}
                title="Run Goodnight routine"
              >
                <span style={{fontSize: "20px"}}>🌙</span>
                <span>Goodnight</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    consecutiveErrors++;
    lastErrorTime = Date.now();

    // Manual refresh function
    const forceRefresh = () => {
      run(`osascript -e 'tell application "Übersicht" to refresh widget id "home-assistant-jsx"'`);
    };

    return (
      <div style={{position: "relative", width: "100%", height: "100%"}}>
        <div
          className="widget-container"
          style={{
            ...errorStyle,
            position: "absolute",
            bottom: `${pos.bottom}px`,
            left: `${pos.left}px`,
            textAlign: "center",
          }}
        >
          <div style={errorIconStyle}>⚠️</div>
          <div style={errorTitleStyle}>Data Error</div>
          <div style={errorMessageStyle}>
            Received unexpected data from Home Assistant.
            <br />
            <span style={{fontSize: "9px", opacity: 0.6}}>{e.message}</span>
          </div>
          <button style={errorRetryBtn} onClick={forceRefresh}>
            Retry Now
          </button>
        </div>
      </div>
    );
  }
};
