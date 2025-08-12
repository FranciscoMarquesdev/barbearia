// Rota para consultar horários disponíveis de um dia
require("dotenv" ).config();
const express = require("express");
const { PrismaClient } = require("./generated/prisma");
const prisma = new PrismaClient();
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { zonedTimeToUtc, utcToZonedTime, format } = require("date-fns-tz");
const app = express();
const PORT = process.env.PORT || 3000;
// Removido DB_FILE, não usamos mais db.json

// Lista completa de horários de trabalho (exemplo: 09:00 às 18:00)
const TODOS_HORARIOS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

app.get("/api/horarios-disponiveis", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Parâmetro "date" é obrigatório.' });
    }

    // Fuso horário da barbearia
    const timeZone = "America/Sao_Paulo";

    // Cria início e fim do dia no fuso correto
    const startOfDay = zonedTimeToUtc(`${date}T00:00:00`, timeZone);
    const endOfDay = zonedTimeToUtc(`${date}T23:59:59.999`, timeZone);

    // Busca agendamentos do dia inteiro
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        data: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: "cancelado",
        },
      },
    });

    // Extrai horários ocupados
    const horariosOcupados = agendamentos.map((a) => {
      // Se o campo horario existir, usa ele; senão, extrai da data
      if (a.horario) return a.horario;
      // Extrai hora do campo data (UTC para local)
      const localDate = utcToZonedTime(a.data, timeZone);
      return format(localDate, "HH:mm", { timeZone });
    });

    // Filtra horários disponíveis
    const horariosDisponiveis = TODOS_HORARIOS.filter(
      (h) => !horariosOcupados.includes(h)
    );
    res.json(horariosDisponiveis);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar horários disponíveis." });
  }
});
require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("./generated/prisma");
// Removido prisma duplicado
const cors = require("cors");
const bodyParser = require("body-parser");
// Removido DB_FILE, não usamos mais db.json
// Duplicate definitions removed

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

// Rota para criar um novo agendamento usando Prisma
app.post("/api/agendamentos", async (req, res) => {
  const { nome, telefone, profissional, servico, data, horario, preco } =
    req.body;
  try {
    const novo = await prisma.agendamento.create({
      data: {
        nome,
        telefone,
        profissional,
        servico,
        data: new Date(data),
        horario,
        preco: parseFloat(preco),
        status: "confirmado",
      },
    });
    res
      .status(201)
      .json({ message: "Agendamento criado com sucesso.", id: novo.id });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar agendamento." });
  }
});

// Rota para listar todos os agendamentos usando Prisma
app.get("/api/agendamentos", async (req, res) => {
  try {
    const agendamentos = await prisma.agendamento.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Formata o campo data para 'YYYY-MM-DD' para compatibilidade com o frontend
    const agendamentosFormatados = agendamentos.map((a) => ({
      ...a,
      data: a.data.toISOString().split("T")[0],
    }));
    res.json(agendamentosFormatados);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agendamentos." });
  }
});

// Rota para cancelar um agendamento usando Prisma
app.post("/api/cancelar", async (req, res) => {
  const { id } = req.body;
  try {
    const agendamento = await prisma.agendamento.update({
      where: { id: Number(id) },
      data: { status: "cancelado" },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: "Agendamento não encontrado" });
  }
});

// Rota para atender um agendamento usando Prisma
app.post("/api/atender", async (req, res) => {
  const { id } = req.body;
  try {
    const agendamento = await prisma.agendamento.update({
      where: { id: Number(id) },
      data: { status: "completed" },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: "Agendamento não encontrado" });
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
