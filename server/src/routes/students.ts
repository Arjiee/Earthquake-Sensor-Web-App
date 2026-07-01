import { Router } from "express";
import { requireAuth } from "../auth.js";
import {
  deleteStudent,
  getStudent,
  getStudents,
  insertStudent,
  markStudentSafe,
  setHasFace,
  updateStudent,
} from "../db.js";
import { hub } from "../hub.js";
import { deleteFace, enrollFace, FaceServiceError } from "../faceClient.js";

export const studentsRouter = Router();

studentsRouter.get("/", requireAuth, async (_req, res) => {
  res.json(await getStudents());
});

studentsRouter.post("/", requireAuth, async (req, res) => {
  const { id, name, yearSection } = req.body ?? {};
  if (!id || !name) return res.status(400).json({ error: "id and name are required" });
  try {
    const student = await insertStudent(id, name, yearSection ?? "");
    hub.broadcast({ type: "student_update", data: student });
    await hub.log("info", `Student enrolled: ${name} (${id})`);
    res.status(201).json(student);
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Student ID already exists" });
    throw err;
  }
});

// Update a student's details (name / year-section).
studentsRouter.put("/:id", requireAuth, async (req, res) => {
  const { name, yearSection } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const student = await updateStudent(req.params.id, name, yearSection ?? "");
  if (!student) return res.status(404).json({ error: "Unknown student ID" });
  hub.broadcast({ type: "student_update", data: student });
  await hub.log("info", `Student updated: ${student.name} (${student.id})`);
  res.json(student);
});

// Enroll face templates for a student. Body: { images: string[] } (data URLs).
// The images are forwarded to the Python face-service, which stores and indexes
// them; on success we flag the student as having a face template.
studentsRouter.post("/:id/enroll", requireAuth, async (req, res) => {
  const student = await getStudent(req.params.id);
  if (!student) return res.status(404).json({ error: "Unknown student ID" });
  const images: unknown = req.body?.images;
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "images (non-empty array) required" });
  }
  try {
    const saved = await enrollFace(student.id, images as string[]);
    const updated = (await setHasFace(student.id, true))!;
    hub.broadcast({ type: "student_update", data: updated });
    await hub.log("ok", `Face enrolled for ${updated.name} (${updated.id}) — ${saved} shot(s)`);
    res.json({ saved, student: updated });
  } catch (err) {
    if (err instanceof FaceServiceError) return res.status(502).json({ error: err.message });
    throw err;
  }
});

// Remove enrolled face templates without deleting the student.
studentsRouter.delete("/:id/enroll", requireAuth, async (req, res) => {
  const student = await getStudent(req.params.id);
  if (!student) return res.status(404).json({ error: "Unknown student ID" });
  await deleteFace(student.id);
  const updated = (await setHasFace(student.id, false))!;
  hub.broadcast({ type: "student_update", data: updated });
  await hub.log("warn", `Face enrollment cleared for ${updated.name} (${updated.id})`);
  res.json(updated);
});

studentsRouter.delete("/:id", requireAuth, async (req, res) => {
  await deleteFace(req.params.id); // clean up any face templates too
  await deleteStudent(req.params.id);
  await hub.log("info", `Student removed: ${req.params.id}`);
  res.status(204).end();
});

// Manual / QR check-in from the dashboard.
studentsRouter.post("/:id/safe", requireAuth, async (req, res) => {
  const method = req.body?.method === "manual" ? "manual" : "qr";
  const student = await markStudentSafe(req.params.id, method);
  if (!student) return res.status(404).json({ error: "Unknown student ID" });
  hub.broadcast({ type: "student_update", data: student });
  await hub.log("ok", `${student.name} (${student.id}) marked SAFE via ${method.toUpperCase()}`);
  res.json(student);
});
