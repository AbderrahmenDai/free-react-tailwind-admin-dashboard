
const bcrypt = require("bcryptjs");
const { User } = require("../models");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ["password"] } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ["password"] } });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;
    
    // Check duplicates
    const checkUser = await User.findOne({ where: { username } });
    if (checkUser) return res.status(400).json({ message: "Nom d'utilisateur déjà pris" });

    const newUser = await User.create({
      username,
      email,
      password, // hashed by hook
      firstName,
      lastName,
      role
    });

    const userObj = newUser.toJSON();
    delete userObj.password;

    res.status(201).json(userObj);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { username, email, firstName, lastName, role, password } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    user.username = username || user.username;
    user.email = email || user.email;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.role = role || user.role;

    if (password) {
      user.password = password; // Hook will re-hash
    }

    await user.save();

    const result = user.toJSON();
    delete result.password;
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    await user.destroy();
    res.json({ message: "Utilisateur supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
