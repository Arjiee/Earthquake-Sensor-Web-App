"""Loads enrolled face templates and matches faces in a frame.

Enrolled faces live under ./faces/<studentId>/*.jpg — one folder per student,
several photos each. See enroll.py to capture them.
"""

import os
import glob
import face_recognition
import numpy as np


class FaceRecognizer:
    def __init__(self, faces_dir: str = "faces", tolerance: float = 0.5):
        self.faces_dir = faces_dir
        self.tolerance = tolerance
        self.encodings: list[np.ndarray] = []
        self.ids: list[str] = []
        self.load()

    def load(self) -> None:
        """(Re)load every enrolled face template from disk."""
        self.encodings, self.ids = [], []
        if not os.path.isdir(self.faces_dir):
            print(f"[recognizer] No faces dir '{self.faces_dir}'. Enroll students first.")
            return
        for student_id in sorted(os.listdir(self.faces_dir)):
            folder = os.path.join(self.faces_dir, student_id)
            if not os.path.isdir(folder):
                continue
            for img_path in glob.glob(os.path.join(folder, "*.jpg")):
                image = face_recognition.load_image_file(img_path)
                encs = face_recognition.face_encodings(image)
                if encs:
                    self.encodings.append(encs[0])
                    self.ids.append(student_id)
        print(f"[recognizer] Loaded {len(self.encodings)} templates "
              f"for {len(set(self.ids))} students.")

    def recognize(self, rgb_frame) -> list[tuple[str, tuple]]:
        """Return [(studentId, (top,right,bottom,left)), ...] for matches."""
        results = []
        locations = face_recognition.face_locations(rgb_frame)
        encodings = face_recognition.face_encodings(rgb_frame, locations)
        for enc, loc in zip(encodings, locations):
            if not self.encodings:
                continue
            distances = face_recognition.face_distance(self.encodings, enc)
            best = int(np.argmin(distances))
            if distances[best] <= self.tolerance:
                results.append((self.ids[best], loc))
        return results
