const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { body, validationResult } = require("express-validator");
const sanitizeHtml = require("sanitize-html");
const Appointment = require("../models/Appointment");
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
      phone: req.body.phone ? sanitizeHtml(req.body.phone) : undefined,
    };
    const { error } = appointmentSchema.validate(sanitizedBody);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    try {
      const appointment = new Appointment(sanitizedBody);
      await appointment.save();
      res.status(201).json({ message: "Agendamento criado com sucesso." });
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar agendamento." });
    }
  }
);

// Listar agendamentos (apenas admin pode ver dados sensíveis)
router.get("/", autenticarToken(["admin"]), async (req, res) => {
  try {
    const appointments = await Appointment.find().select("-__v");
    // Remover dados sensíveis se não for admin (mas aqui só admin acessa)
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agendamentos." });
  }
});

module.exports = router;
