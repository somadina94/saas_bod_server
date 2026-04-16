import dotenv from "dotenv";
import path from "path";

/** Must be imported before any module that reads `process.env` (e.g. `config/env.ts`). */
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});
