import express from "express";
import { createServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

async function createViteServer() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
    root: join(__dirname, "../client"),
  });

  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  return vite;
}

async function startServer() {
  try {
    await createViteServer();
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[express] serving on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();