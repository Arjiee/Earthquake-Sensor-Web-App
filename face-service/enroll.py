"""Capture face templates for a student.

Usage:
    python enroll.py 2021-00123

Press SPACE to capture a shot (aim for 5 from slightly different angles),
Q to finish. Photos are saved to faces/<studentId>/ and the student's
has_face flag is set in the database via the backend is NOT touched here —
the recognizer picks the folder up automatically on its next (re)load.

After enrolling, restart main.py (or call recognizer.load()) to pick up the
new templates.
"""

import os
import sys
import cv2

from dotenv import load_dotenv

load_dotenv()
CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "0")


def main():
    if len(sys.argv) < 2:
        print("Usage: python enroll.py <studentId>")
        sys.exit(1)
    student_id = sys.argv[1]
    out_dir = os.path.join("faces", student_id)
    os.makedirs(out_dir, exist_ok=True)

    src = int(CAMERA_SOURCE) if CAMERA_SOURCE.isdigit() else CAMERA_SOURCE
    cap = cv2.VideoCapture(src)
    count = len([f for f in os.listdir(out_dir) if f.endswith(".jpg")])
    print("SPACE = capture, Q = quit")

    while True:
        ok, frame = cap.read()
        if not ok:
            print("Camera not available.")
            break
        preview = frame.copy()
        cv2.putText(preview, f"{student_id}  shots:{count}  [SPACE]capture [Q]quit",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2)
        cv2.imshow("SEERS enroll", preview)
        key = cv2.waitKey(1) & 0xFF
        if key == ord(" "):
            count += 1
            path = os.path.join(out_dir, f"{count}.jpg")
            cv2.imwrite(path, frame)
            print(f"saved {path}")
        elif key == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"Enrolled {count} shots for {student_id}.")
    print("Tip: also set has_face = true for this student, e.g.:")
    print(f'  psql "$DATABASE_URL" -c "UPDATE students SET has_face=true WHERE id=\'{student_id}\';"')


if __name__ == "__main__":
    main()
