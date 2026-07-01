import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/seers",
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret",
  deviceToken: process.env.DEVICE_TOKEN ?? "seers-device-token",
  faceServiceUrl: process.env.FACE_SERVICE_URL ?? "http://localhost:5001",
  eqThresholdG: Number(process.env.EQ_THRESHOLD_G ?? 0.25),
  eqClearSeconds: Number(process.env.EQ_CLEAR_SECONDS ?? 30),
};
