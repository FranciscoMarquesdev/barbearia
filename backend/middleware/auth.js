const jwt = require("jsonwebtoken");

// rolesPermitidos: array de roles permitidos para a rota
function autenticarToken(rolesPermitidos = []) {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token ausente" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) {
        return res.status(403).json({ error: "Token inválido ou expirado" });
      }
      // Checagem de campos obrigatórios
      const { id, role, exp } = payload;
      if (!id || !role || !exp) {
        return res.status(403).json({ error: "Token malformado" });
      }
      // Checagem de role
      if (rolesPermitidos.length && !rolesPermitidos.includes(role)) {
        return res.status(403).json({ error: "Acesso não autorizado para este perfil" });
      }
      req.user = payload;
      next();
    });
  };
}

module.exports = autenticarToken;
