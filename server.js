// Route to check available times for a day
require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("./generated/prisma");
const prisma = new PrismaClient();
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { zonedTimeToUtc, utcToZonedTime, format } = require("date-fns-tz");
const app = express();
const PORT = process.env.PORT || 3000;
// Removed DB_FILE, we no longer use db.json

// Full list of working hours (example: 09:00 to 18:00)
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
      return res.status(400).json({ error: 'Parameter "date" is required.' });
    }

    // Barbershop timezone
    const timeZone = "America/Sao_Paulo";

    // Create start and end of day in correct timezone
    const startOfDay = zonedTimeToUtc(`${date}T00:00:00`, timeZone);
    const endOfDay = zonedTimeToUtc(`${date}T23:59:59.999`, timeZone);

    // Find all appointments for the day
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

    // Extract occupied times
    const horariosOcupados = agendamentos.map((a) => {
      // If the "horario" field exists, use it; otherwise, extract from "data"
      if (a.horario) return a.horario;
      // Extract hour from "data" field (UTC to local)
      const localDate = utcToZonedTime(a.data, timeZone);
      return format(localDate, "HH:mm", { timeZone });
    });

    // Filter available times
    const horariosDisponiveis = TODOS_HORARIOS.filter(
      (h) => !horariosOcupados.includes(h)
    );
    res.json(horariosDisponiveis);
  } catch (err) {
    res.status(500).json({ error: "Error fetching available times." });
  }
});

// CORS restricted to desired domains
app.use(
  cors({
    origin: ["https://barbearia-gg.netlify.app", "https://meusite.com"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(bodyParser.json());

// JWT authentication middleware
function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401); // No token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user;
    next();
  });
}

// Apply JWT authentication only to protected routes

// Route to create a new appointment using Prisma
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
      .json({ message: "Appointment created successfully.", id: novo.id });
  } catch (err) {
    res.status(500).json({ error: "Error creating appointment." });
  }
});

// Route to list all appointments using Prisma
app.get("/api/agendamentos", async (req, res) => {
  try {
    const agendamentos = await prisma.agendamento.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Format the "data" field to 'YYYY-MM-DD' for frontend compatibility
    const agendamentosFormatados = agendamentos.map((a) => ({
      ...a,
      data: a.data.toISOString().split("T")[0],
    }));
    res.json(agendamentosFormatados);
  } catch (err) {
    res.json([]); // Ensures it returns an empty array in case of error
  }
});

// Route to cancel an appointment using Prisma
app.post("/api/cancelar", async (req, res) => {
  const { id } = req.body;
  try {
    const agendamento = await prisma.agendamento.update({
      where: { id: Number(id) },
      data: { status: "cancelado" },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: "Appointment not found" });
  }
});

// Route to mark an appointment as attended using Prisma
app.post("/api/atender", async (req, res) => {
  const { id } = req.body;
  try {
    const agendamento = await prisma.agendamento.update({
      where: { id: Number(id) },
      data: { status: "completed" },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: "Appointment not found" });
  }
});

// (Optional) Route to clear all (for testing only)
// Removed, as it doesn't make sense with MySQL

app.get("/", (req, res) => {
  res.send("Barbershop API running! Use /api/agendamentos");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Test token (should not be in production code)
const token = jwt.sign({ id: 1, role: "admin" }, process.env.JWT_SECRET, {
  expiresIn: "1h",
});
console.log(`Access token: ${token}`);

// Example of how the request header should be
// Authorization: Bearer YOUR_TOKEN_HERE
