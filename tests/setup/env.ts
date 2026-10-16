import os from "node:os";
import path from "node:path";
import { config } from "dotenv";

config();

if (!process.env.DATABASE_URL_TEST) {
  throw new Error(
    "DATABASE_URL_TEST must be set in .env before running tests — see .env.example. " +
      "Tests must never run against the dev DATABASE_URL.",
  );
}

// Every test (unit or integration) gets the test database, never the dev one,
// even if a module happens to construct a PrismaClient.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

// Uploaded files go to a throwaway folder, never the dev .data/uploads; and
// tests always use local storage even if S3 variables are set in .env.
process.env.LOCAL_UPLOAD_DIR = path.join(os.tmpdir(), `electro212-test-uploads-${process.pid}`);
process.env.STORAGE_DRIVER = "local";
