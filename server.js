const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;
const DB_FILE = "./db.json";

app.use(cors());
app.use(bodyParser.json());

// Função para ler e salvar o "banco de dados" (JSON)
function readDB() {
  if (!fs.existsSync(DB_FILE))
    fs.writeFileSync(DB_FILE, JSON.stringify({ agendamentos: [] }, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Rota para criar um novo agendamento
app.post("/api/agendamentos", (req, res) => {
  const db = readDB();
  const novo = {
    ...req.body,
    id: Date.now(),
    status: "confirmado",
    createdAt: new Date(),
  };
  db.agendamentos.push(novo);
  writeDB(db);
  res.status(201).json(novo);
});

// Rota para listar todos os agendamentos
app.get("/api/agendamentos", (req, res) => {
  const db = readDB();
  res.json(db.agendamentos);
});

// Rota para cancelar um agendamento
app.post("/api/cancelar", (req, res) => {
  const db = readDB();
  const { id } = req.body;
  const agendamento = db.agendamentos.find((a) => a.id === id);
  if (agendamento) {
    agendamento.status = "cancelado";
    writeDB(db);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "Agendamento não encontrado" });
  }
});

// Rota para atender um agendamento
app.post("/api/atender", (req, res) => {
  const { id } = req.body;
  const db = readDB();
  const agendamento = db.agendamentos.find((a) => String(a.id) === String(id));
  if (agendamento) {
    agendamento.status = "completed";
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Agendamento não encontrado" });
  }
});

// (Opcional) Rota para limpar tudo (apenas para testes)
app.post("/api/reset", (req, res) => {
  writeDB({ agendamentos: [] });
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.send("API Barbearia rodando! Use /api/agendamentos");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
