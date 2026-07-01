// Shared types between the SEERS frontend and the local backend.
// The backend (Node) mirrors these shapes in /server/src/types.ts.

export type StudentStatus = "safe" | "missing" | "pending" | "evacuated";
export type CheckInMethod = "face" | "qr" | "manual" | "-";

export interface Student {
  id: string;            // e.g. "2021-00123"
  name: string;          // "Last, First M."
  yearSection: string;   // "3-A"
  status: StudentStatus;
  method: CheckInMethod;
  checkedInAt: string | null; // ISO timestamp when marked safe
  hasFace: boolean;      // whether a face template is enrolled
}

// A single reading pushed by the ESP8266 (MPU6050) every ~500ms.
export interface SensorReading {
  x: number;             // g
  y: number;             // g
  z: number;             // g
  magnitude: number;     // computed Richter-style magnitude estimate
  peak: number;          // peak g in the current window
  timestamp: string;     // ISO
  deviceId: string;      // sensor identifier
}

export interface EarthquakeEvent {
  id: number;
  detectedAt: string;
  magnitude: number;
  peakG: number;
  active: boolean;
  clearedAt: string | null;
}

export type LogLevel = "ok" | "warn" | "err" | "info";
export interface LogEntry {
  id: number;
  ts: string;
  level: LogLevel;
  message: string;
}

// Hardware/service online flags reported by the backend.
export interface SystemStatus {
  sensorOnline: boolean;   // ESP8266 posting readings
  cameraOnline: boolean;   // face-service webcam active
  faceServiceOnline: boolean;
  earthquakeActive: boolean;
  lastReadingAt: string | null;
}

// Envelope for every message pushed over the WebSocket.
export type ServerMessage =
  | { type: "reading"; data: SensorReading }
  | { type: "earthquake"; data: EarthquakeEvent }
  | { type: "student_update"; data: Student }
  | { type: "students"; data: Student[] }
  | { type: "log"; data: LogEntry }
  | { type: "status"; data: SystemStatus };

export interface AdminUser {
  id: number;
  username: string;
  role: string;
}
