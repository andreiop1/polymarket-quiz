const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, 'data');
const ALLTIME_FILE = path.join(DATA_DIR, 'alltime.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── helpers ──────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-04-24"
}

function todayFile() {
  return path.join(DATA_DIR, `today-${todayKey()}.json`);
}

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function upsertScore(board, entry) {
  const idx = board.findIndex(
    (e) => e.n.toLowerCase() === entry.n.toLowerCase()
  );
  if (idx >= 0) {
    if (entry.s > board[idx].s) board[idx] = entry;
  } else {
    board.push(entry);
  }
  board.sort((a, b) => b.s - a.s);
  return board.slice(0, 10);
}

// ── routes ───────────────────────────────────────────

// GET /api/leaderboard?tab=today  or  ?tab=alltime
app.get('/api/leaderboard', (req, res) => {
  const tab = req.query.tab === 'alltime' ? 'alltime' : 'today';
  const file = tab === 'alltime' ? ALLTIME_FILE : todayFile();
  res.json(readJSON(file));
});

// POST /api/score  { n, s, c }
app.post('/api/score', (req, res) => {
  const { n, s, c } = req.body;
  if (!n || typeof s !== 'number' || typeof c !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const entry = { n, s, c };

  // save to today
  const todayBoard = upsertScore(readJSON(todayFile()), entry);
  writeJSON(todayFile(), todayBoard);

  // save to all-time
  const allBoard = upsertScore(readJSON(ALLTIME_FILE), entry);
  writeJSON(ALLTIME_FILE, allBoard);

  res.json({ ok: true });
});

// ── start ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Polymarket Quiz running at http://localhost:${PORT}`);
});