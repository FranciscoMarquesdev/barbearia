const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const appointmentsRouter = require('./routes/appointments');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://*"],
      // ...outros ajustes conforme necessário...
    }
  }
}));
app.use(cookieParser());

// Rate limiting global (ajuste conforme necessário)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requisições por 15 minutos por IP
  message: 'Muitas requisições, tente novamente mais tarde.'
}));

// CSRF protection global (ajuste para APIs se necessário)
app.use(csrf({ cookie: true }));

// Forçar HTTPS (em produção)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

app.use('/api/appointments', appointmentsRouter);

// ...existing code...