// Übersicht Widget: Sonos Media Player
// Full-featured Sonos controller with grouping, browsing, favorites, album art, and playback controls
//
// Prerequisites: node-sonos-http-api running on port 5005
// https://github.com/jishi/node-sonos-http-api

import { css, run } from "uebersicht";

// ============ CONFIGURATION ============
const SONOS_API_URL = "http://localhost:5005";
// =======================================

export const command = `
  zones=$(curl -s --connect-timeout 1 "${SONOS_API_URL}/zones" 2>/dev/null)
  curlrc=$?
  if [ $curlrc -ne 0 ]; then
    echo '{"error":"offline"}'
  elif [ -z "$zones" ] || [ "$zones" = "[]" ]; then
    echo '{"error":"no-speakers"}'
  else
    favs=$(curl -s --connect-timeout 2 "${SONOS_API_URL}/favorites/detailed" 2>/dev/null || echo '[]')
    lists=$(curl -s --connect-timeout 2 "${SONOS_API_URL}/playlists" 2>/dev/null || echo '[]')
    echo "{\\"zones\\":$zones,\\"favorites\\":$favs,\\"playlists\\":$lists}"
  fi
`;

export const refreshFrequency = 3000;

// Widget state
let isCollapsed = false;
let isFocused = false;
let showGroupManager = false;
let selectedGroupZone = null;
let showBrowser = false;
let browserTab = "favorites"; // favorites, playlists, search
let browserTargetRoom = null;
let searchResults = [];
let searchLoading = false;
let searchQuery = "";

// Drag state
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let posStart = { x: 0, y: 0 };

// Load saved position from localStorage
const STORAGE_KEY = "sonos-widget-position";
const getStoredPosition = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return { top: 20, right: 20 };
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
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
  color: #fff;
  user-select: none;
  pointer-events: none;

  /* CSS-based hover for instant response */
  .widget-container {
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }
  .widget-container:hover {
    background: rgba(20, 20, 20, 0.98) !important;
    backdrop-filter: none !important;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.7) !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
  }

  /* Instant button hover feedback */
  button {
    transition: transform 0.1s ease, background 0.1s ease;
  }
  button:hover {
    transform: scale(1.05);
    filter: brightness(1.2);
  }
  button:active {
    transform: scale(0.95);
  }

  /* Drag handle cursor */
  .drag-handle {
    cursor: grab;
  }
  .drag-handle:active {
    cursor: grabbing;
  }
`;

// Styles
const getContainer = (focused, collapsed) => ({
  background: focused ? "rgba(20, 20, 20, 0.98)" : "rgba(0, 0, 0, 0.80)",
  backdropFilter: focused ? "none" : "blur(24px)",
  WebkitBackdropFilter: focused ? "none" : "blur(24px)",
  borderRadius: "20px",
  padding: collapsed ? "12px 16px" : "16px",
  minWidth: collapsed ? "200px" : "340px",
  maxWidth: "420px",
  maxHeight: collapsed ? "auto" : "85vh",
  overflow: collapsed ? "hidden" : "auto",
  boxShadow: focused ? "0 16px 64px rgba(0, 0, 0, 0.7)" : "0 12px 48px rgba(0, 0, 0, 0.5)",
  border: focused ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.08)",
  transition: "background 0.3s ease, box-shadow 0.3s ease",
});

const getDragHandle = (dragging) => ({
  cursor: dragging ? "grabbing" : "grab",
  padding: "6px 0",
  marginBottom: "8px",
  display: "flex",
  justifyContent: "center",
  pointerEvents: "auto",
});

const dragIndicator = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.3)",
  letterSpacing: "2px",
};

// Drag event handlers - use direct DOM manipulation for smooth dragging
let dragElement = null;

const handleDragStart = (e) => {
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
  posStart = { ...widgetPosition };
  // Find the widget container element
  dragElement = e.target.closest('.widget-container');
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
  e.preventDefault();
};

const handleDragMove = (e) => {
  if (!isDragging || !dragElement) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  const newTop = Math.max(0, posStart.top + dy);
  const newRight = Math.max(0, posStart.right - dx);
  // Update position in memory
  widgetPosition = { top: newTop, right: newRight };
  // Directly update DOM for smooth dragging
  dragElement.style.top = `${newTop}px`;
  dragElement.style.right = `${newRight}px`;
};

const handleDragEnd = () => {
  isDragging = false;
  dragElement = null;
  savePosition(widgetPosition);
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
};

const header = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "1.2px",
  color: "rgba(255, 255, 255, 0.5)",
  marginBottom: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const headerCollapsed = {
  ...header,
  marginBottom: "0",
};

const headerButtons = {
  display: "flex",
  gap: "6px",
  alignItems: "center",
};

const headerBtn = {
  background: "rgba(255,255,255,0.1)",
  border: "none",
  borderRadius: "6px",
  padding: "4px 8px",
  fontSize: "10px",
  color: "rgba(255,255,255,0.6)",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const headerBtnActive = {
  ...headerBtn,
  background: "#1DB954",
  color: "#000",
};

const zoneCard = {
  background: "rgba(255, 255, 255, 0.05)",
  borderRadius: "14px",
  padding: "12px",
  marginBottom: "8px",
  transition: "all 0.2s ease",
};

const zoneCardActive = {
  ...zoneCard,
  background: "linear-gradient(135deg, rgba(30, 215, 96, 0.2) 0%, rgba(30, 215, 96, 0.1) 100%)",
  border: "1px solid rgba(30, 215, 96, 0.3)",
};

const zoneHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "8px",
};

const albumArt = {
  width: "50px",
  height: "50px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.1)",
  objectFit: "cover",
  flexShrink: 0,
};

const albumArtPlaceholder = {
  ...albumArt,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  color: "rgba(255,255,255,0.3)",
};

const zoneInfo = {
  flex: 1,
  minWidth: 0,
};

const zoneName = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#fff",
  marginBottom: "2px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const trackTitle = {
  fontSize: "12px",
  color: "rgba(255, 255, 255, 0.9)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const trackArtist = {
  fontSize: "11px",
  color: "rgba(255, 255, 255, 0.5)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const controlsRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  marginTop: "10px",
};

const buttonGroup = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const btn = {
  background: "rgba(255, 255, 255, 0.1)",
  border: "none",
  borderRadius: "50%",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#fff",
  fontSize: "12px",
  transition: "all 0.15s ease",
};

const btnSmall = {
  ...btn,
  width: "24px",
  height: "24px",
  fontSize: "10px",
};

const btnPlay = {
  ...btn,
  background: "#1DB954",
  width: "38px",
  height: "38px",
  fontSize: "14px",
};

const volumeContainer = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flex: 1,
  maxWidth: "130px",
};

const volumeBar = {
  flex: 1,
  height: "4px",
  background: "rgba(255, 255, 255, 0.15)",
  borderRadius: "2px",
  overflow: "hidden",
  cursor: "pointer",
};

const volumeFill = (percent) => ({
  height: "100%",
  background: "linear-gradient(90deg, #1DB954, #1ed760)",
  width: `${percent}%`,
  borderRadius: "2px",
  transition: "width 0.2s ease",
});

const volumeText = {
  fontSize: "10px",
  color: "rgba(255, 255, 255, 0.5)",
  width: "22px",
  textAlign: "right",
};

// Modal Overlay Styles
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  pointerEvents: "auto",
};

const modalPanel = {
  background: "rgba(30, 30, 30, 0.98)",
  borderRadius: "16px",
  padding: "20px",
  minWidth: "360px",
  maxWidth: "450px",
  maxHeight: "80vh",
  overflow: "auto",
  border: "1px solid rgba(255,255,255,0.1)",
};

const modalTitle = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#fff",
  marginBottom: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const groupSection = {
  marginBottom: "16px",
};

const groupLabel = {
  fontSize: "10px",
  color: "rgba(255, 255, 255, 0.4)",
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const speakerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "10px",
  marginBottom: "6px",
};

const speakerRowActive = {
  ...speakerRow,
  background: "rgba(30, 215, 96, 0.2)",
  border: "1px solid rgba(30, 215, 96, 0.3)",
};

const speakerName = {
  fontSize: "13px",
  color: "#fff",
  fontWeight: 500,
};

const speakerAction = {
  background: "rgba(255,255,255,0.1)",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "11px",
  color: "#fff",
  cursor: "pointer",
};

const speakerActionRemove = {
  ...speakerAction,
  background: "rgba(255, 59, 48, 0.3)",
  color: "#ff6b6b",
};

const speakerActionAdd = {
  ...speakerAction,
  background: "rgba(30, 215, 96, 0.3)",
  color: "#1DB954",
};

// Browser styles
const tabBar = {
  display: "flex",
  gap: "4px",
  marginBottom: "16px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "10px",
  padding: "4px",
};

const tab = {
  flex: 1,
  padding: "8px 12px",
  border: "none",
  borderRadius: "8px",
  fontSize: "11px",
  fontWeight: 500,
  cursor: "pointer",
  background: "transparent",
  color: "rgba(255,255,255,0.6)",
  transition: "all 0.15s ease",
};

const tabActive = {
  ...tab,
  background: "#1DB954",
  color: "#000",
};

const searchBox = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: "13px",
  marginBottom: "12px",
  outline: "none",
};

const roomPicker = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: "12px",
  marginBottom: "16px",
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

const mediaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  maxHeight: "300px",
  overflowY: "auto",
};

const mediaItem = {
  cursor: "pointer",
  textAlign: "center",
  padding: "8px",
  borderRadius: "10px",
  transition: "all 0.15s ease",
  background: "rgba(255,255,255,0.03)",
};

const mediaArt = {
  width: "100%",
  aspectRatio: "1",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.1)",
  objectFit: "cover",
  marginBottom: "6px",
};

const mediaArtPlaceholder = {
  ...mediaArt,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  color: "rgba(255,255,255,0.3)",
};

const mediaName = {
  fontSize: "10px",
  color: "rgba(255,255,255,0.8)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const favoritesSection = {
  marginTop: "12px",
  paddingTop: "12px",
  borderTop: "1px solid rgba(255,255,255,0.08)",
};

const favoritesScroll = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  paddingBottom: "4px",
};

const favoriteItem = {
  flexShrink: 0,
  width: "60px",
  cursor: "pointer",
  textAlign: "center",
};

const favoriteArt = {
  width: "60px",
  height: "60px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.1)",
  objectFit: "cover",
  marginBottom: "4px",
};

const favoriteNameStyle = {
  fontSize: "9px",
  color: "rgba(255,255,255,0.6)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const errorStyle = {
  background: "rgba(0, 0, 0, 0.80)",
  borderRadius: "20px",
  padding: "20px",
  fontSize: "12px",
  color: "rgba(255, 100, 100, 0.9)",
  textAlign: "center",
};

const expandBtn = {
  ...btnSmall,
  background: "transparent",
  color: "rgba(255,255,255,0.4)",
};

// Control functions
const sonosCommand = (room, action) => {
  const url = `${SONOS_API_URL}/${encodeURIComponent(room)}/${action}`;
  fetch(url).catch(console.error);
};

const play = (room) => sonosCommand(room, "play");
const pause = (room) => sonosCommand(room, "pause");
const next = (room) => sonosCommand(room, "next");
const previous = (room) => sonosCommand(room, "previous");
const volumeUp = (room) => sonosCommand(room, "volume/+5");
const volumeDown = (room) => sonosCommand(room, "volume/-5");
const toggleMute = (room) => sonosCommand(room, "togglemute");

// Grouping functions
const joinGroup = (room, coordinator) => {
  const url = `${SONOS_API_URL}/${encodeURIComponent(room)}/join/${encodeURIComponent(coordinator)}`;
  fetch(url).catch(console.error);
};

const leaveGroup = (room) => {
  const url = `${SONOS_API_URL}/${encodeURIComponent(room)}/leave`;
  fetch(url).catch(console.error);
};

// Play content functions
const playFavorite = (room, name) => {
  const url = `${SONOS_API_URL}/${encodeURIComponent(room)}/favorite/${encodeURIComponent(name)}`;
  fetch(url).catch(console.error);
};

const playPlaylist = (room, name) => {
  const url = `${SONOS_API_URL}/${encodeURIComponent(room)}/playlist/${encodeURIComponent(name)}`;
  fetch(url).catch(console.error);
};

const playUri = (room, uri) => {
  const url = `${SONOS_API_URL}/${encodeURIComponent(room)}/setavtransporturi/${encodeURIComponent(uri)}`;
  fetch(url).catch(console.error);
};

// Search function
const searchMusic = async (query, service = "spotify") => {
  if (!query || query.length < 2) return [];
  searchLoading = true;
  try {
    const url = `${SONOS_API_URL}/search/${service}/album/${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    searchLoading = false;
    return data || [];
  } catch (e) {
    searchLoading = false;
    return [];
  }
};

function parseTrack(track) {
  if (!track || (!track.title && !track.stationName)) {
    return { title: "No media", artist: "", albumArt: null };
  }

  let title = track.title || "";
  let artist = track.artist || "";
  let albumArt = track.absoluteAlbumArtUri || track.albumArtUri || null;

  if (title.includes("TYPE=SNG")) {
    const titleMatch = title.match(/TITLE ([^|]+)/);
    const artistMatch = title.match(/ARTIST ([^|]+)/);
    if (titleMatch) title = titleMatch[1].trim();
    if (artistMatch) artist = artistMatch[1].trim();
  }

  if (track.type === "radio" && track.stationName) {
    if (!title || title === track.stationName) {
      title = track.stationName;
    }
    if (!artist && track.stationName !== title) {
      artist = track.stationName;
    }
  }

  return { title, artist, albumArt };
}

function AlbumArtImg({ src, size = 50 }) {
  if (!src) {
    return <div style={{...albumArtPlaceholder, width: size, height: size}}>♪</div>;
  }
  return (
    <img
      src={src}
      style={{...albumArt, width: size, height: size}}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}

// Group Manager Component
function GroupManager({ zone, allZones, onClose }) {
  const coordinator = zone.coordinator;
  const roomName = coordinator.roomName;

  const groupedRooms = zone.members
    .filter(m => m.uuid !== coordinator.uuid)
    .map(m => m.roomName);

  const allRooms = allZones.flatMap(z => z.members.map(m => m.roomName));
  const availableRooms = allRooms.filter(name => name !== roomName && !groupedRooms.includes(name));

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalPanel} onClick={e => e.stopPropagation()}>
        <div style={modalTitle}>
          <span>Group: {roomName}</span>
          <button style={headerBtn} onClick={onClose}>✕</button>
        </div>

        <div style={groupSection}>
          <div style={groupLabel}>Current Group ({groupedRooms.length + 1} speakers)</div>

          <div style={speakerRowActive}>
            <span style={speakerName}>{roomName}</span>
            <span style={{fontSize: "10px", color: "rgba(255,255,255,0.4)"}}>Coordinator</span>
          </div>

          {groupedRooms.map(room => (
            <div key={room} style={speakerRow}>
              <span style={speakerName}>{room}</span>
              <button
                style={speakerActionRemove}
                onClick={() => leaveGroup(room)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {availableRooms.length > 0 && (
          <div style={groupSection}>
            <div style={groupLabel}>Available Speakers</div>
            {availableRooms.map(room => (
              <div key={room} style={speakerRow}>
                <span style={speakerName}>{room}</span>
                <button
                  style={speakerActionAdd}
                  onClick={() => joinGroup(room, roomName)}
                >
                  Add to Group
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)"}}>
          <div style={groupLabel}>Quick Actions</div>
          <div style={{display: "flex", gap: "8px", flexWrap: "wrap"}}>
            <button
              style={{...speakerActionAdd, padding: "8px 16px"}}
              onClick={() => {
                availableRooms.forEach(room => joinGroup(room, roomName));
              }}
            >
              Add All Speakers
            </button>
            {groupedRooms.length > 0 && (
              <button
                style={{...speakerActionRemove, padding: "8px 16px"}}
                onClick={() => {
                  groupedRooms.forEach(room => leaveGroup(room));
                }}
              >
                Ungroup All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Music Browser Component
function MusicBrowser({ zones, favorites, playlists, onClose }) {
  const allRooms = zones.flatMap(z => z.members.map(m => m.roomName));

  // Use first playing zone or first zone as default target
  const playingZone = zones.find(z => z.coordinator.state.playbackState === "PLAYING");
  const defaultRoom = playingZone ? playingZone.coordinator.roomName :
                      (zones.length > 0 ? zones[0].coordinator.roomName : null);

  if (!browserTargetRoom && defaultRoom) {
    browserTargetRoom = defaultRoom;
  }

  const handleSearch = async (e) => {
    searchQuery = e.target.value;
    if (searchQuery.length >= 2) {
      searchResults = await searchMusic(searchQuery);
    } else {
      searchResults = [];
    }
  };

  const playItem = (item, type) => {
    if (!browserTargetRoom) return;

    if (type === "favorite") {
      // Handle both string and object formats
      const name = typeof item === "string" ? item : item.title;
      playFavorite(browserTargetRoom, name);
    } else if (type === "playlist") {
      playPlaylist(browserTargetRoom, item);
    } else if (type === "search" && item.uri) {
      playUri(browserTargetRoom, item.uri);
    }
    onClose();
  };

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalPanel} onClick={e => e.stopPropagation()}>
        <div style={modalTitle}>
          <span>Browse Music</span>
          <button style={headerBtn} onClick={onClose}>✕</button>
        </div>

        {/* Room Picker */}
        <div style={groupLabel}>Play To</div>
        <select
          style={roomPicker}
          value={browserTargetRoom || ""}
          onChange={(e) => { browserTargetRoom = e.target.value; }}
        >
          {zones.map((zone, i) => {
            const name = zone.coordinator.roomName;
            const memberCount = zone.members.length;
            const label = memberCount > 1 ? `${name} (+${memberCount - 1})` : name;
            return (
              <option key={i} value={name}>{label}</option>
            );
          })}
        </select>

        {/* Tabs */}
        <div style={tabBar}>
          <button
            style={browserTab === "favorites" ? tabActive : tab}
            onClick={() => { browserTab = "favorites"; }}
          >
            Favorites
          </button>
          <button
            style={browserTab === "playlists" ? tabActive : tab}
            onClick={() => { browserTab = "playlists"; }}
          >
            Playlists
          </button>
          <button
            style={browserTab === "search" ? tabActive : tab}
            onClick={() => { browserTab = "search"; }}
          >
            Search
          </button>
        </div>

        {/* Tab Content */}
        {browserTab === "favorites" && (
          <div>
            <div style={groupLabel}>Sonos Favorites ({favorites?.length || 0})</div>
            <div style={{maxHeight: "400px", overflowY: "auto"}}>
              {(favorites || []).map((fav, i) => {
                const favName = typeof fav === "string" ? fav : fav.title;
                const favArt = typeof fav === "object" ? fav.albumArtUri : null;
                return (
                  <div
                    key={i}
                    style={{...speakerRow, cursor: "pointer"}}
                    onClick={() => playItem(favName, "favorite")}
                    title={favName}
                  >
                    <span style={{display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0}}>
                      <span style={{fontSize: "12px", color: "#1DB954", flexShrink: 0}}>▶</span>
                      <span style={{...speakerName, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{favName}</span>
                    </span>
                    <div style={{width: "40px", height: "40px", borderRadius: "6px", background: "rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
                      {favArt ? (
                        <img src={favArt} style={{width: "100%", height: "100%", objectFit: "cover"}} onError={(e) => {e.target.outerHTML = '<span style="font-size:14px;color:rgba(255,255,255,0.3)">♪</span>';}} />
                      ) : (
                        <span style={{fontSize: "14px", color: "rgba(255,255,255,0.3)"}}>♪</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!favorites || favorites.length === 0) && (
                <div style={{textAlign: "center", color: "rgba(255,255,255,0.4)", padding: "20px", fontSize: "12px"}}>
                  No favorites found. Add some in the Sonos app!
                </div>
              )}
            </div>
          </div>
        )}

        {browserTab === "playlists" && (
          <div>
            <div style={groupLabel}>Sonos Playlists ({playlists?.length || 0})</div>
            <div style={{maxHeight: "300px", overflowY: "auto"}}>
              {(playlists || []).map((name, i) => (
                <div
                  key={i}
                  style={{...speakerRow, cursor: "pointer"}}
                  onClick={() => playItem(name, "playlist")}
                >
                  <span style={{display: "flex", alignItems: "center", gap: "10px"}}>
                    <span style={{fontSize: "18px"}}>📋</span>
                    <span style={speakerName}>{name}</span>
                  </span>
                  <span style={{fontSize: "10px", color: "#1DB954"}}>▶</span>
                </div>
              ))}
              {(!playlists || playlists.length === 0) && (
                <div style={{textAlign: "center", color: "rgba(255,255,255,0.4)", padding: "20px", fontSize: "12px"}}>
                  No playlists found. Create some in the Sonos app!
                </div>
              )}
            </div>
          </div>
        )}

        {browserTab === "search" && (
          <div>
            <input
              type="text"
              placeholder="Search albums, artists, tracks..."
              style={searchBox}
              value={searchQuery}
              onChange={handleSearch}
              autoFocus
            />
            <div style={groupLabel}>
              {searchLoading ? "Searching..." : (searchResults.length > 0 ? `Results (${searchResults.length})` : "Search your music services")}
            </div>
            <div style={mediaGrid}>
              {searchResults.map((item, i) => (
                <div
                  key={i}
                  style={mediaItem}
                  onClick={() => playItem(item, "search")}
                  title={item.title || item.name}
                >
                  {item.albumArtUri || item.imageUrl ? (
                    <img src={item.albumArtUri || item.imageUrl} style={mediaArt} onError={(e) => {e.target.style.display = 'none';}} />
                  ) : (
                    <div style={mediaArtPlaceholder}>♪</div>
                  )}
                  <div style={mediaName}>{item.title || item.name}</div>
                  {item.artist && <div style={{...mediaName, color: "rgba(255,255,255,0.4)", marginTop: "2px"}}>{item.artist}</div>}
                </div>
              ))}
            </div>
            <div style={{marginTop: "12px", fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "center"}}>
              Tip: Search works with Spotify, Apple Music, Amazon Music, and other configured services
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ZoneControl({ zone, allZones, favorites, expanded, onToggleExpand, onOpenGroupManager }) {
  const coordinator = zone.coordinator;
  const state = coordinator.state;
  const isPlaying = state.playbackState === "PLAYING";
  const roomName = coordinator.roomName;
  const volume = state.volume;
  const isMuted = state.mute;
  const { title, artist, albumArt } = parseTrack(state.currentTrack);

  const groupedRooms = zone.members
    .filter(m => m.uuid !== coordinator.uuid)
    .map(m => m.roomName);

  const cardStyle = isPlaying ? zoneCardActive : zoneCard;

  return (
    <div style={cardStyle}>
      <div style={zoneHeader}>
        <AlbumArtImg src={albumArt} />
        <div style={zoneInfo}>
          <div style={zoneName}>
            {roomName}
            {groupedRooms.length > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  color: "#1DB954",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "rgba(30,215,96,0.2)",
                  padding: "2px 6px",
                  borderRadius: "8px",
                }}
                onClick={() => onOpenGroupManager(zone)}
                title="Click to manage group"
              >
                +{groupedRooms.length}
              </span>
            )}
            {isPlaying && (
              <span style={{fontSize: "8px", color: "#1DB954"}}>●</span>
            )}
          </div>
          <div style={trackTitle}>{title}</div>
          {artist && <div style={trackArtist}>{artist}</div>}
        </div>
        <div style={{display: "flex", gap: "4px"}}>
          <button
            style={{...expandBtn, fontSize: "10px"}}
            onClick={() => onOpenGroupManager(zone)}
            title="Manage Groups"
          >
            👥
          </button>
          <button style={expandBtn} onClick={onToggleExpand}>
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      <div style={controlsRow}>
        <div style={buttonGroup}>
          <button style={btn} onClick={() => previous(roomName)} title="Previous">
            ◀◀
          </button>
          <button style={btnPlay} onClick={() => isPlaying ? pause(roomName) : play(roomName)} title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button style={btn} onClick={() => next(roomName)} title="Next">
            ▶▶
          </button>
        </div>

        <div style={volumeContainer}>
          <button style={btnSmall} onClick={() => toggleMute(roomName)} title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button style={{...btnSmall, width: "20px", height: "20px"}} onClick={() => volumeDown(roomName)}>−</button>
          <div style={volumeBar} title={`${volume}%`}>
            <div style={volumeFill(volume)} />
          </div>
          <button style={{...btnSmall, width: "20px", height: "20px"}} onClick={() => volumeUp(roomName)}>+</button>
          <span style={volumeText}>{volume}</span>
        </div>
      </div>

      {expanded && favorites && favorites.length > 0 && (
        <div style={favoritesSection}>
          <div style={groupLabel}>Quick Play</div>
          <div style={favoritesScroll}>
            {favorites.slice(0, 10).map((fav, i) => {
              const favName = typeof fav === "string" ? fav : fav.title;
              const favArt = typeof fav === "object" ? fav.albumArtUri : null;
              return (
                <div
                  key={i}
                  style={favoriteItem}
                  onClick={() => playFavorite(roomName, favName)}
                  title={favName}
                >
                  <div style={{...favoriteArt, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center"}}>
                    {favArt ? (
                      <img src={favArt} style={{width: "100%", height: "100%", objectFit: "cover"}} onError={(e) => {e.target.outerHTML = '<span style="font-size:16px;color:rgba(255,255,255,0.3)">♪</span>';}} />
                    ) : (
                      <span style={{fontSize: "16px", color: "rgba(255,255,255,0.3)"}}>♪</span>
                    )}
                  </div>
                  <div style={favoriteNameStyle}>{favName}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

let expandedZones = new Set();

const connectingStyle = {
  background: "rgba(0, 0, 0, 0.80)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: "16px",
  padding: "16px 20px",
  fontSize: "12px",
  color: "rgba(255, 255, 255, 0.8)",
  textAlign: "center",
  position: "absolute",
  top: "20px",
  right: "20px",
  pointerEvents: "auto",
  maxWidth: "200px",
};

const startServer = () => {
  run(`open ~/Desktop/Start\\ Sonos\\ Server.command`);
};

export const render = ({ output, error }) => {
  if (error || !output || output.trim() === "") {
    return (
      <div
        style={{...connectingStyle, cursor: "pointer"}}
        onClick={startServer}
        title="Click to start server"
      >
        🔊 Sonos Offline<br/>
        <span style={{fontSize: "10px", opacity: 0.6, lineHeight: 1.4, display: "block", marginTop: "8px"}}>
          Click to start
        </span>
      </div>
    );
  }

  try {
    const cleanOutput = output.replace(/\n/g, '').trim();
    const data = JSON.parse(cleanOutput);

    // Handle offline state - server not running
    if (data.error === "offline") {
      return (
        <div
          style={{...connectingStyle, cursor: "pointer"}}
          onClick={startServer}
          title="Click to start server"
        >
          🔊 Sonos Offline<br/>
          <span style={{fontSize: "10px", opacity: 0.6, lineHeight: 1.4, display: "block", marginTop: "8px"}}>
            Click to start
          </span>
        </div>
      );
    }

    // Handle no speakers state
    if (data.error === "no-speakers") {
      return (
        <div style={connectingStyle}>
          🔊 Sonos<br/>
          <span style={{fontSize: "10px", opacity: 0.6, lineHeight: 1.4, display: "block", marginTop: "6px"}}>
            No speakers found
          </span>
        </div>
      );
    }

    const zones = data.zones || [];
    const favorites = data.favorites || [];
    const playlists = data.playlists || [];

    if (!zones || zones.length === 0) {
      return (
        <div style={connectingStyle}>
          🔊 Sonos<br/>
          <span style={{fontSize: "10px", opacity: 0.6, lineHeight: 1.4, display: "block", marginTop: "6px"}}>
            No speakers found
          </span>
        </div>
      );
    }

    const sortedZones = [...zones].sort((a, b) => {
      const aPlaying = a.coordinator.state.playbackState === "PLAYING";
      const bPlaying = b.coordinator.state.playbackState === "PLAYING";
      if (aPlaying && !bPlaying) return -1;
      if (!aPlaying && bPlaying) return 1;
      return a.coordinator.roomName.localeCompare(b.coordinator.roomName);
    });

    const playingCount = zones.filter(z => z.coordinator.state.playbackState === "PLAYING").length;
    const playingZone = sortedZones.find(z => z.coordinator.state.playbackState === "PLAYING");

    const toggleExpand = (zoneName) => {
      if (expandedZones.has(zoneName)) {
        expandedZones.delete(zoneName);
      } else {
        expandedZones.add(zoneName);
      }
    };

    const toggleCollapse = () => {
      isCollapsed = !isCollapsed;
    };

    const toggleFocus = () => {
      isFocused = !isFocused;
    };

    const openGroupManager = (zone) => {
      selectedGroupZone = zone;
      showGroupManager = true;
    };

    const closeGroupManager = () => {
      showGroupManager = false;
      selectedGroupZone = null;
    };

    const openBrowser = () => {
      showBrowser = true;
    };

    const closeBrowser = () => {
      showBrowser = false;
      searchQuery = "";
      searchResults = [];
    };

    // Collapsed view
    if (isCollapsed) {
      const track = playingZone ? parseTrack(playingZone.coordinator.state.currentTrack) : null;
      const collapsedStyle = {
        ...getContainer(false, true),
        position: "absolute",
        top: `${widgetPosition.top}px`,
        right: `${widgetPosition.right}px`,
        pointerEvents: "auto",
      };
      return (
        <div style={{position: "relative", width: "100%", height: "100%"}}>
          <div
            className="widget-container"
            style={collapsedStyle}
          >
            <div
              className="drag-handle"
              style={{padding: "4px 0", marginBottom: "6px", display: "flex", justifyContent: "center"}}
              onMouseDown={handleDragStart}
              title="Drag to move"
            >
              <span style={dragIndicator}>⋮⋮</span>
            </div>
            <div style={headerCollapsed}>
              <span style={{display: "flex", alignItems: "center", gap: "8px"}}>
                ♪ {playingCount > 0 ? (
                  <span style={{color: "#1DB954", fontSize: "12px"}}>{track?.title || "Playing"}</span>
                ) : (
                  <span>Sonos</span>
                )}
              </span>
              <div style={headerButtons}>
                <button style={headerBtn} onClick={toggleFocus}>
                  {isFocused ? "◐" : "◑"}
                </button>
                <button style={headerBtn} onClick={toggleCollapse}>
                  ▼
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const containerStyle = {
      ...getContainer(false, false),
      position: "absolute",
      top: `${widgetPosition.top}px`,
      right: `${widgetPosition.right}px`,
      pointerEvents: "auto",
    };

    return (
      <div style={{position: "relative", width: "100%", height: "100%"}}>
        {showGroupManager && selectedGroupZone && (
          <GroupManager
            zone={selectedGroupZone}
            allZones={zones}
            onClose={closeGroupManager}
          />
        )}

        {showBrowser && (
          <MusicBrowser
            zones={zones}
            favorites={favorites}
            playlists={playlists}
            onClose={closeBrowser}
          />
        )}

        <div
          className="widget-container"
          style={containerStyle}
        >
          {/* Drag Handle */}
          <div
            className="drag-handle"
            style={{padding: "4px 0", marginBottom: "6px", display: "flex", justifyContent: "center"}}
            onMouseDown={handleDragStart}
            title="Drag to move"
          >
            <span style={dragIndicator}>⋮⋮</span>
          </div>

          <div style={header}>
            <span>♪ Sonos ({zones.length} zones)</span>
            <div style={headerButtons}>
              {playingCount > 0 && (
                <span style={{color: "#1DB954", fontSize: "10px", marginRight: "4px"}}>
                  {playingCount} playing
                </span>
              )}
              <button style={headerBtnActive} onClick={openBrowser} title="Browse Music">
                🎵
              </button>
              <button style={headerBtn} onClick={toggleFocus} title="Toggle transparency">
                {isFocused ? "◐" : "◑"}
              </button>
              <button style={headerBtn} onClick={toggleCollapse} title="Collapse">
                ▲
              </button>
            </div>
          </div>

          {sortedZones.map((zone, i) => (
            <ZoneControl
              key={zone.uuid || i}
              zone={zone}
              allZones={zones}
              favorites={favorites}
              expanded={expandedZones.has(zone.coordinator.roomName)}
              onToggleExpand={() => toggleExpand(zone.coordinator.roomName)}
              onOpenGroupManager={openGroupManager}
            />
          ))}
        </div>
      </div>
    );
  } catch (e) {
    return (
      <div style={connectingStyle}>
        🔊 Sonos<br/>
        <span style={{fontSize: "10px", opacity: 0.6, lineHeight: 1.4, display: "block", marginTop: "6px"}}>
          Starting up...
        </span>
      </div>
    );
  }
};
