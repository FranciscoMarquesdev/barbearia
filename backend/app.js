const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const appointmentsRouter = require("./routes/appointments");

const app = express();

app.use(
  cors({
    origin: "https://meusite.com", // ajuste para seu domínio real
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https://*"],
        // ...outros ajustes conforme necessário...
      },
    },
  })
);
app.use(cookieParser());

// Rate limiting global (ajuste conforme necessário)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requisições por 15 minutos por IP
    message: "Muitas requisições, tente novamente mais tarde.",
  })
);

// CSRF protection global (ajuste para APIs se necessário)
// Remova ou comente esta linha para APIs JWT
// app.use(csrf({ cookie: true }));

// Forçar HTTPS (em produção)
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res.redirect("https://" + req.headers.host + req.url);
  }
  next();
});

app.use("/api/appointments", appointmentsRouter);

// Exemplo de rota para definir um cookie
app.get("/set-cookie", (req, res) => {
  res.cookie("nomeDoCookie", "valorDoCookie", {
    httpOnly: true, // recomendado para segurança
    secure: process.env.NODE_ENV === "production", // só HTTPS em produção
    sameSite: "strict", // proteção CSRF
    maxAge: 24 * 60 * 60 * 1000, // 1 dia
  });
  res.send("Cookie definido!");
});

// Exemplo de rota para ler cookies
app.get("/get-cookie", (req, res) => {
  const valor = req.cookies["nomeDoCookie"];
  res.send("Valor do cookie: " + valor);
});

module.exports = app;
