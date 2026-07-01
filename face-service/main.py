"""SEERS facial-recognition service.

Runs on the PC connected to the safe-zone camera. It:
  1. Captures webcam frames.
  2. Recognizes enrolled students (recognizer.py).
  3. Reports each match to the Node backend  -> POST /ingest/recognition
  4. Sends a heartbeat so the dashboard shows the camera online.
  5. Serves an annotated MJPEG preview at  http://<host>:PORT/stream

Start with:  python main.py
"""

import os
import time
import shutil
import base64
import threading

import cv2
import numpy as np
import requests
import face_recognition
from dotenv import load_dotenv
from flask import Flask, Response, request, jsonify

from recognizer import FaceRecognizer

load_dotenv()

SERVER_URL = os.getenv("SERVER_URL", "http://localhost:4000")
DEVICE_TOKEN = os.getenv("DEVICE_TOKEN", "seers-device-token")
CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "0")
PORT = int(os.getenv("PORT", "5001"))
TOLERANCE = float(os.getenv("FACE_TOLERANCE", "0.5"))
COOLDOWN = int(os.getenv("REPORT_COOLDOWN", "15"))

HEADERS = {"x-device-token": DEVICE_TOKEN, "Content-Type": "application/json"}

app = Flask(__name__)
recognizer = FaceRecognizer(tolerance=TOLERANCE)

# Shared state between the capture thread and the Flask stream.
_lock = threading.Lock()
_latest_jpeg: bytes | None = None
_camera_ok = False
_last_report: dict[str, float] = {}


def open_camera():
    src = int(CAMERA_SOURCE) if CAMERA_SOURCE.isdigit() else CAMERA_SOURCE
    return cv2.VideoCapture(src)


def report_recognition(student_id: str) -> None:
    """Tell the backend a student was recognized (debounced per student)."""
    now = time.time()
    if now - _last_report.get(student_id, 0) < COOLDOWN:
        return
    _last_report[student_id] = now
    try:
        requests.post(f"{SERVER_URL}/ingest/recognition",
                      json={"studentId": student_id}, headers=HEADERS, timeout=3)
        print(f"[face] reported SAFE: {student_id}")
    except requests.RequestException as e:
        print(f"[face] report failed: {e}")


def heartbeat_loop() -> None:
    while True:
        try:
            requests.post(f"{SERVER_URL}/ingest/face/heartbeat",
                          json={"cameraOnline": _camera_ok}, headers=HEADERS, timeout=3)
        except requests.RequestException:
            pass
        time.sleep(4)


def capture_loop() -> None:
    global _latest_jpeg, _camera_ok
    cap = open_camera()
    frame_i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            _camera_ok = False
            time.sleep(1)
            cap = open_camera()   # try to reconnect
            continue
        _camera_ok = True
        frame_i += 1

        # Recognize every 5th frame to keep CPU usage sane.
        if frame_i % 5 == 0:
            small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
            for student_id, (top, right, bottom, left) in recognizer.recognize(rgb):
                # scale box back up (we downscaled by 0.5)
                t, r, b, l = top * 2, right * 2, bottom * 2, left * 2
                cv2.rectangle(frame, (l, t), (r, b), (0, 200, 0), 2)
                cv2.putText(frame, student_id, (l, t - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 0), 2)
                report_recognition(student_id)

        ok, buf = cv2.imencode(".jpg", frame)
        if ok:
            with _lock:
                _latest_jpeg = buf.tobytes()


@app.route("/stream")
def stream():
    def generate():
        while True:
            with _lock:
                frame = _latest_jpeg
            if frame is not None:
                yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")
            time.sleep(0.05)
    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/health")
def health():
    return {"ok": True, "cameraOnline": _camera_ok, "templates": len(recognizer.encodings)}


# ---- Enrollment management (called by the Node backend) ----

FACES_DIR = recognizer.faces_dir


def _check_token() -> bool:
    return request.headers.get("x-device-token") == DEVICE_TOKEN


def _decode_data_url(data_url: str):
    """Decode a data URL / base64 string into an RGB numpy image."""
    payload = data_url.split(",", 1)[1] if "," in data_url else data_url
    raw = base64.b64decode(payload)
    arr = np.frombuffer(raw, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return None
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


@app.route("/enroll", methods=["POST"])
def enroll():
    if not _check_token():
        return jsonify({"error": "Invalid device token"}), 401
    body = request.get_json(silent=True) or {}
    student_id = str(body.get("studentId", "")).strip()
    images = body.get("images") or []
    if not student_id or not images:
        return jsonify({"error": "studentId and images are required"}), 400

    folder = os.path.join(FACES_DIR, student_id)
    os.makedirs(folder, exist_ok=True)
    existing = len([f for f in os.listdir(folder) if f.endswith(".jpg")])

    saved = 0
    for img_data in images:
        rgb = _decode_data_url(img_data)
        if rgb is None:
            continue
        # Only keep shots that actually contain a detectable face.
        if not face_recognition.face_locations(rgb):
            continue
        existing += 1
        saved += 1
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        cv2.imwrite(os.path.join(folder, f"{existing}.jpg"), bgr)

    if saved == 0:
        # Nothing usable — drop an empty folder we may have created.
        if not os.listdir(folder):
            os.rmdir(folder)
        return jsonify({"error": "No face detected in the captured images."}), 422

    recognizer.load()  # pick up the new templates immediately
    return jsonify({"saved": saved, "total": existing})


@app.route("/faces/<student_id>", methods=["DELETE"])
def delete_faces(student_id):
    if not _check_token():
        return jsonify({"error": "Invalid device token"}), 401
    folder = os.path.join(FACES_DIR, student_id)
    if os.path.isdir(folder):
        shutil.rmtree(folder)
    recognizer.load()
    return jsonify({"ok": True})


@app.route("/reload", methods=["POST"])
def reload_templates():
    if not _check_token():
        return jsonify({"error": "Invalid device token"}), 401
    recognizer.load()
    return jsonify({"ok": True, "templates": len(recognizer.encodings)})


if __name__ == "__main__":
    threading.Thread(target=capture_loop, daemon=True).start()
    threading.Thread(target=heartbeat_loop, daemon=True).start()
    print(f"[face] streaming preview on http://0.0.0.0:{PORT}/stream")
    app.run(host="0.0.0.0", port=PORT, threaded=True)
