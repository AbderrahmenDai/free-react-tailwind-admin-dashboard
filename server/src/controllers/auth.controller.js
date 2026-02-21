const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models");

exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;
    
    // Check if user exists
    let existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Utilisateur existe déjà" });

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || "OPERATOR",
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "8h" });

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists by username
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ message: "Identifiants invalides" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Identifiants invalides" });
    
    if (!user.isActive) return res.status(403).json({ message: "Utilisateur désactivé" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "8h" });

    // Set HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set to true in prod
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.me = async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
    },
  });
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Déconnexion réussie" });
};
