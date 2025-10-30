import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import multer from "multer";
import Tesseract from "tesseract.js";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "timers.json");

const upload = multer({ dest: "uploads/" });

// --- Load / Save Timers ---
function loadTimers() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}
function saveTimers(timers) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(timers, null, 2));
}

let timers = loadTimers();

app.use(express.static(__dirname));

// --- OCR Upload Endpoint ---
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    const imagePath = path.join(__dirname, req.file.path);
    const result = await Tesseract.recognize(imagePath, "eng", { logger: () => {} });
    fs.unlinkSync(imagePath); // cleanup

    const text = result.data.text.replace(/\s+/g, " ").trim();
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OCR failed" });
  }
});

// --- WebSocket Sync ---
io.on("connection", (socket) => {
  socket.emit("init", timers);

  socket.on("updateTimers", (newTimers) => {
    timers = newTimers;
    saveTimers(timers);
    io.emit("updateAll", timers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
