// Shared shapes between server and frontend. Mirrors src/app/lib/types.ts.

export type StudentStatus = "safe" | "missing" | "pending" | "evacuated";
export type CheckInMethod = "face" | "qr" | "manual" | "-";

export interface Student {
  id: string;
  name: string;
  yearSection: string;
  status: StudentStatus;
  method: CheckInMethod;
  checkedInAt: string | null;
  hasFace: boolean;
}

export interface SensorReading {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  peak: number;
  timestamp: string;
  deviceId: string;
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

export interface SystemStatus {
  sensorOnline: boolean;
  cameraOnline: boolean;
  faceServiceOnline: boolean;
  earthquakeActive: boolean;
  lastReadingAt: string | null;
}

export type ServerMessage =
  | { type: "reading"; data: SensorReading }
  | { type: "earthquake"; data: EarthquakeEvent }
  | { type: "student_update"; data: Student }
  | { type: "students"; data: Student[] }
  | { type: "log"; data: LogEntry }
  | { type: "status"; data: SystemStatus };
