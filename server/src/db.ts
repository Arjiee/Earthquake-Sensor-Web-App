import pg from "pg";
import { config } from "./config.js";
import type { Student } from "./types.js";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

// Map a DB row (snake_case) to the API Student shape (camelCase).
export function rowToStudent(r: any): Student {
  return {
    id: r.id,
    name: r.name,
    yearSection: r.year_section ?? "",
    status: r.status,
    method: r.method ?? "-",
    checkedInAt: r.checked_in_at ? new Date(r.checked_in_at).toISOString() : null,
    hasFace: Boolean(r.has_face),
  };
}

export async function getStudents(): Promise<Student[]> {
  const { rows } = await pool.query("SELECT * FROM students ORDER BY name ASC");
  return rows.map(rowToStudent);
}

export async function getStudent(id: string): Promise<Student | null> {
  const { rows } = await pool.query("SELECT * FROM students WHERE id = $1", [id]);
  return rows[0] ? rowToStudent(rows[0]) : null;
}

export async function insertStudent(id: string, name: string, yearSection: string): Promise<Student> {
  const { rows } = await pool.query(
    `INSERT INTO students (id, name, year_section, status, method)
     VALUES ($1, $2, $3, 'pending', '-') RETURNING *`,
    [id, name, yearSection],
  );
  return rowToStudent(rows[0]);
}

export async function updateStudent(id: string, name: string, yearSection: string): Promise<Student | null> {
  const { rows } = await pool.query(
    "UPDATE students SET name = $2, year_section = $3 WHERE id = $1 RETURNING *",
    [id, name, yearSection],
  );
  return rows[0] ? rowToStudent(rows[0]) : null;
}

// Flag whether a student has enrolled face templates.
export async function setHasFace(id: string, hasFace: boolean): Promise<Student | null> {
  const { rows } = await pool.query(
    "UPDATE students SET has_face = $2 WHERE id = $1 RETURNING *",
    [id, hasFace],
  );
  return rows[0] ? rowToStudent(rows[0]) : null;
}

export async function deleteStudent(id: string): Promise<void> {
  await pool.query("DELETE FROM students WHERE id = $1", [id]);
}

// Mark a student safe and record the method + timestamp. Idempotent.
export async function markStudentSafe(id: string, method: "face" | "qr" | "manual"): Promise<Student | null> {
  const { rows } = await pool.query(
    `UPDATE students
     SET status = 'safe', method = $2, checked_in_at = COALESCE(checked_in_at, NOW())
     WHERE id = $1 RETURNING *`,
    [id, method],
  );
  return rows[0] ? rowToStudent(rows[0]) : null;
}
