import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const dataFile = path.join(__dirname, "data.json");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Get all boss data
app.get("/api/bosses", (req, res) => {
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]");
  const data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  res.json(data);
});

// Save or update boss
app.post("/api/bosses", (req, res) => {
  const newBoss = req.body;
  let data = [];
  if (fs.existsSync(dataFile)) {
    data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  }
  const existingIndex = data.findIndex((b) => b.name === newBoss.name);
  if (existingIndex >= 0) {
    data[existingIndex] = newBoss;
  } else {
    data.push(newBoss);
  }
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

// Delete boss
app.delete("/api/bosses/:name", (req, res) => {
  const { name } = req.params;
  if (!fs.existsSync(dataFile)) return res.json({ success: false });
  let data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  data = data.filter((b) => b.name !== name);
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
