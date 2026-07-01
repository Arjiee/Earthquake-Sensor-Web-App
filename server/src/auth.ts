import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import { config } from "./config.js";

export interface AuthedRequest extends Request {
  admin?: { id: number; username: string; role: string };
}

// Verify a bearer JWT and attach the admin to the request.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as any;
    req.admin = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Devices (ESP8266, face-service) authenticate with a shared static token.
export function requireDevice(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-device-token"];
  if (token !== config.deviceToken) return res.status(401).json({ error: "Invalid device token" });
  next();
}

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  const { rows } = await pool.query("SELECT * FROM admins WHERE username = $1", [username]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ sub: admin.id, username: admin.username, role: admin.role }, config.jwtSecret, {
    expiresIn: "12h",
  });
  res.json({ token, user: { id: admin.id, username: admin.username, role: admin.role } });
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json(req.admin);
});
