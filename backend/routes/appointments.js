const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { body, validationResult } = require("express-validator");
const sanitizeHtml = require("sanitize-html");
const pool = require("../db/mysql");
const autenticarToken = require("../middleware/auth");

// Esquema Joi para validação extra
const appointmentSchema = Joi.object({
  clientName: Joi.string().max(100).required(),
  service: Joi.string().max(100).required(),
  professional: Joi.string().max(100).required(),
  date: Joi.date().iso().required(),
  value: Joi.number().min(0).required(),
  phone: Joi.string().max(20).optional(),
});

// Criar agendamento (usuário comum pode criar)
router.post(
  "/",
  autenticarToken(["user", "admin"]),
  body("clientName").trim().escape(),
  body("service").trim().escape(),
  body("professional").trim().escape(),
  body("date").isISO8601(),
  body("value").isFloat({ min: 0 }),
  body("phone").optional().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const sanitizedBody = {
      clientName: sanitizeHtml(req.body.clientName),
      service: sanitizeHtml(req.body.service),
      professional: sanitizeHtml(req.body.professional),
      date: req.body.date,
      value: req.body.value,
      phone: req.body.phone ? sanitizeHtml(req.body.phone) : null,
    };
    const { error } = appointmentSchema.validate(sanitizedBody);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    try {
      const [result] = await pool.query(
        `INSERT INTO agendamentos (nome, telefone, profissional, servico, data, horario, preco, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sanitizedBody.clientName,
          sanitizedBody.phone,
          sanitizedBody.professional,
          sanitizedBody.service,
          sanitizedBody.date,
          req.body.time || "", // Adapte se necessário
          sanitizedBody.value,
          "confirmado"
        ]
      );
      res.status(201).json({ message: "Agendamento criado com sucesso.", id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar agendamento." });
    }
  }
);

// Listar agendamentos (apenas admin pode ver dados sensíveis)
router.get("/", autenticarToken(["admin"]), async (req, res) => {
  try {
    const [appointments] = await pool.query("SELECT * FROM agendamentos ORDER BY createdAt DESC");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agendamentos." });
  }
});

module.exports = router;
