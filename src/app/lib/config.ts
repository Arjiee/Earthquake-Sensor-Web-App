// Central runtime configuration for talking to the local SEERS backend.
//
// When you run the full stack on your machine, the Node server (see /server)
// listens on port 4000 by default. Change these if you use different ports.
//
// In the Figma Make preview there is no backend reachable, so API/WebSocket
// calls fail gracefully and the dashboard shows a "waiting for hardware" state.

const isBrowser = typeof window !== "undefined";
const host = isBrowser ? window.location.hostname : "localhost";

export const API_BASE_URL = `http://${host}:4000`;
export const WS_URL = `ws://${host}:4000/ws`;

// The Python facial-recognition service (see /face-service) exposes an MJPEG
// preview of the safe-zone camera on port 5001.
export const FACE_SERVICE_URL = `http://${host}:5001`;
export const FACE_STREAM_URL = `${FACE_SERVICE_URL}/stream`;

// Earthquake trigger threshold in g (peak acceleration deviation from 1g rest).
// Mirrors the server-side threshold; used only for client-side UI cues.
export const EQ_THRESHOLD_G = 0.25;
