const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { body, validationResult } = require("express-validator");
const sanitizeHtml = require("sanitize-html");
const jwt = require("jsonwebtoken");
const Appointment = require("../models/Appointment");

// Middleware de autenticação JWT
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

// Esquema Joi para validação extra
const appointmentSchema = Joi.object({
  clientName: Joi.string().max(100).required(),
  service: Joi.string().max(100).required(),
  professional: Joi.string().max(100).required(),
  date: Joi.date().iso().required(),
  value: Joi.number().min(0).required(),
});

// POST /api/appointments
router.post(
  "/",
  authenticateJWT,
  body("clientName").trim().escape(),
  body("service").trim().escape(),
  body("professional").trim().escape(),
  body("date").isISO8601(),
  body("value").isFloat({ min: 0 }),
  async (req, res) => {
    // express-validator: checagem de erros
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // sanitize-html: sanitização extra
    const sanitizedBody = {
      clientName: sanitizeHtml(req.body.clientName),
      service: sanitizeHtml(req.body.service),
      professional: sanitizeHtml(req.body.professional),
      date: req.body.date,
      value: req.body.value,
    };

    // Joi: validação robusta
    const { error } = appointmentSchema.validate(sanitizedBody);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    try {
      // Salva o objeto sanitizado e validado
      const appointment = new Appointment(sanitizedBody);
      await appointment.save();
      res.status(201).json({ message: "Agendamento criado com sucesso." });
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar agendamento." });
    }
  }
);

module.exports = router;
