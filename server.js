require("dotenv").config();
const express = require("express");
const pool = require("./backend/db/mysql");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = process.env.PORT || 3000;
// Removido DB_FILE, não usamos mais db.json

// CORS restrito ao domínio desejado
app.use(
  cors({
    origin: ["https://barbearia-gg.netlify.app", "https://meusite.com"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(bodyParser.json());

// Middleware de autenticação JWT
function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401); // Sem token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Token inválido
    req.user = user;
    next();
  });
}

// Aplica autenticação JWT apenas nas rotas protegidas

// Rota para criar um novo agendamento usando MySQL
app.post("/api/agendamentos", async (req, res) => {
  const { nome, telefone, profissional, servico, data, horario, preco } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO agendamentos (nome, telefone, profissional, servico, data, horario, preco, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        telefone,
        profissional,
        servico,
        data,
        horario,
        preco,
        "confirmado"
      ]
    );
    res.status(201).json({ message: "Agendamento criado com sucesso.", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar agendamento." });
  }
});

// Rota para listar todos os agendamentos
app.get("/api/agendamentos", async (req, res) => {
  try {
    const [agendamentos] = await pool.query("SELECT * FROM agendamentos ORDER BY createdAt DESC");
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agendamentos." });
  }
});

// Rota para cancelar um agendamento
app.post("/api/cancelar", async (req, res) => {
  const { id } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE agendamentos SET status = 'cancelado' WHERE id = ?",
      [id]
    );
    if (result.affectedRows > 0) {
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: "Agendamento não encontrado" });
    }
  } catch (err) {
    res.status(500).json({ error: "Erro ao cancelar agendamento." });
  }
});

// Rota para atender um agendamento
app.post("/api/atender", async (req, res) => {
  const { id } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE agendamentos SET status = 'completed' WHERE id = ?",
      [id]
    );
    if (result.affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Agendamento não encontrado" });
    }
  } catch (err) {
    res.status(500).json({ error: "Erro ao atender agendamento." });
  }
});

// (Opcional) Rota para limpar tudo (apenas para testes)
// Removida, pois não faz sentido com MySQL

app.get("/", (req, res) => {
  res.send("API Barbearia rodando! Use /api/agendamentos");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Token para testes (não deve ficar no código em produção)
const token = jwt.sign({ id: 1, role: "admin" }, process.env.JWT_SECRET, {
  expiresIn: "1h",
});
console.log(`Token de acesso: ${token}`);

// Exemplo de como deve ser o cabeçalho da requisição
// Authorization: Bearer SEU_TOKEN_AQUI
