const jwt = require("jsonwebtoken");
const { User } = require("../models");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) return res.sendStatus(403);
    if (!user.isActive) return res.status(403).json({ message: "Utilisateur désactivé" });

    req.user = user;
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};

const authorize = (roles = []) => {
  if (typeof roles === "string") {
    roles = [roles];
  }

  return (req, res, next) => {
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    next();
  };
};

module.exports = { authenticateToken, authorize };
