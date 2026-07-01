// Thin client the backend uses to manage face enrollments on the Python
// face-service. All calls are best-effort: if the face-service is offline the
// roster still updates, but enrollment images obviously won't be stored.

import { config } from "./config.js";

const headers = {
  "Content-Type": "application/json",
  "x-device-token": config.deviceToken,
};

export class FaceServiceError extends Error {}

// Push captured face images (data URLs) for a student. Returns saved count.
export async function enrollFace(studentId: string, images: string[]): Promise<number> {
  let res: Response;
  try {
    res = await fetch(`${config.faceServiceUrl}/enroll`, {
      method: "POST",
      headers,
      body: JSON.stringify({ studentId, images }),
    });
  } catch {
    throw new FaceServiceError("Face-service is not reachable. Is it running?");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new FaceServiceError(body.error ?? "Enrollment failed");
  return Number(body.saved ?? 0);
}

// Remove all templates for a student (best-effort; ignores connection errors).
export async function deleteFace(studentId: string): Promise<void> {
  try {
    await fetch(`${config.faceServiceUrl}/faces/${encodeURIComponent(studentId)}`, {
      method: "DELETE",
      headers,
    });
  } catch {
    /* face-service offline — templates will be cleaned up on its next start */
  }
}
