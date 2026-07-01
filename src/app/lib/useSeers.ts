// Central live-data hook for the SEERS dashboard.
//
// It bootstraps state over REST, then keeps it live over a WebSocket. If the
// backend is unreachable (e.g. inside the Figma Make preview), it degrades to
// an "offline / waiting for hardware" state instead of crashing.

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "./config";
import { api } from "./api";
import type {
  EarthquakeEvent,
  LogEntry,
  SensorReading,
  ServerMessage,
  Student,
  SystemStatus,
} from "./types";

const EMPTY_READING: SensorReading = {
  x: 0, y: 0, z: 0, magnitude: 0, peak: 0,
  timestamp: new Date(0).toISOString(), deviceId: "—",
};

const OFFLINE_STATUS: SystemStatus = {
  sensorOnline: false,
  cameraOnline: false,
  faceServiceOnline: false,
  earthquakeActive: false,
  lastReadingAt: null,
};

export interface SeersState {
  connected: boolean;
  students: Student[];
  reading: SensorReading;
  waveform: number[];          // recent peak-g samples for the seismograph
  status: SystemStatus;
  logs: LogEntry[];
  earthquake: EarthquakeEvent | null;
  refresh: () => void;
  markSafe: (id: string, method: "qr" | "manual") => Promise<void>;
  addStudent: (s: { id: string; name: string; yearSection: string }) => Promise<void>;
  updateStudent: (id: string, s: { name: string; yearSection: string }) => Promise<void>;
  enrollFace: (id: string, images: string[]) => Promise<number>;
  clearFace: (id: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  resetEvent: () => Promise<void>;
}

const MAX_WAVE = 120;
const MAX_LOGS = 200;

export function useSeers(enabled: boolean): SeersState {
  const [connected, setConnected] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [reading, setReading] = useState<SensorReading>(EMPTY_READING);
  const [waveform, setWaveform] = useState<number[]>(() => Array(MAX_WAVE).fill(0));
  const [status, setStatus] = useState<SystemStatus>(OFFLINE_STATUS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [earthquake, setEarthquake] = useState<EarthquakeEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (!enabled) return;
    api.listStudents().then(setStudents).catch(() => {});
    api.status().then(setStatus).catch(() => {});
    api.logs().then(setLogs).catch(() => {});
    api.earthquakes().then((e) => setEarthquake(e[0] ?? null)).catch(() => {});
  }, [enabled]);

  // Bootstrap REST state.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live WebSocket with auto-reconnect.
  useEffect(() => {
    if (!enabled) return;
    let closed = false;

    const connect = () => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        retryRef.current = setTimeout(connect, 3000);
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setStatus((s) => ({ ...s, sensorOnline: false }));
        if (!closed) retryRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (evt) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }
        switch (msg.type) {
          case "reading":
            setReading(msg.data);
            setWaveform((w) => [...w.slice(1 - MAX_WAVE), msg.data.peak]);
            break;
          case "earthquake":
            setEarthquake(msg.data);
            break;
          case "students":
            setStudents(msg.data);
            break;
          case "student_update":
            setStudents((list) => {
              const idx = list.findIndex((s) => s.id === msg.data.id);
              if (idx === -1) return [...list, msg.data];
              const next = [...list];
              next[idx] = msg.data;
              return next;
            });
            break;
          case "log":
            setLogs((l) => [msg.data, ...l].slice(0, MAX_LOGS));
            break;
          case "status":
            setStatus(msg.data);
            break;
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [enabled]);

  const markSafe = useCallback(async (id: string, method: "qr" | "manual") => {
    const updated = await api.markSafe(id, method);
    setStudents((list) => list.map((s) => (s.id === id ? updated : s)));
  }, []);

  const addStudent = useCallback(async (s: { id: string; name: string; yearSection: string }) => {
    const created = await api.addStudent(s);
    setStudents((list) => [...list, created]);
  }, []);

  const updateStudent = useCallback(async (id: string, s: { name: string; yearSection: string }) => {
    const updated = await api.updateStudent(id, s);
    setStudents((list) => list.map((x) => (x.id === id ? updated : x)));
  }, []);

  const enrollFace = useCallback(async (id: string, images: string[]) => {
    const { saved, student } = await api.enrollFace(id, images);
    setStudents((list) => list.map((x) => (x.id === id ? student : x)));
    return saved;
  }, []);

  const clearFace = useCallback(async (id: string) => {
    const student = await api.clearFace(id);
    setStudents((list) => list.map((x) => (x.id === id ? student : x)));
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    await api.deleteStudent(id);
    setStudents((list) => list.filter((s) => s.id !== id));
  }, []);

  const resetEvent = useCallback(async () => {
    await api.resetEvent();
    setEarthquake(null);
    refresh();
  }, [refresh]);

  return {
    connected,
    students,
    reading,
    waveform,
    status,
    logs,
    earthquake,
    refresh,
    markSafe,
    addStudent,
    updateStudent,
    enrollFace,
    clearFace,
    deleteStudent,
    resetEvent,
  };
}
