const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Read existing scores
const readScores = () => {
  if (!fs.existsSync(SCORES_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(SCORES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading scores file:', err);
    return [];
  }
};

// Write scores
const writeScores = (scores) => {
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing scores file:', err);
  }
};

// GET all scores
app.get('/api/scores', (req, res) => {
  const scores = readScores();
  res.json(scores);
});

// POST save a score
app.post('/api/scores', (req, res) => {
  const { name, score, totalQuestions, mode, date, categoryBreakdown } = req.body;
  if (score === undefined || totalQuestions === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const scores = readScores();
  const newScore = {
    id: Date.now().toString(),
    name: name || 'Invitado',
    score,
    totalQuestions,
    mode: mode || 'Libre',
    date: date || new Date().toISOString(),
    categoryBreakdown: categoryBreakdown || {}
  };

  scores.push(newScore);
  writeScores(scores);

  res.status(201).json({ success: true, score: newScore });
});

// Serve index.html as fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Simulador levantado con éxito!`);
  console.log(`💻 Accede en: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
