const { OrdreFabrication, ReferenceProduit, HandlingUnit, User } = require("../models");
const sequelize = require("../config/db");

exports.getAllOFs = async (req, res) => {
  try {
    const ofs = await OrdreFabrication.findAll({
      include: [
        { model: ReferenceProduit, as: "reference" },
        { model: User, as: "creator", attributes: ["username"] }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(ofs);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getOFById = async (req, res) => {
  try {
    const of = await OrdreFabrication.findByPk(req.params.id, {
      include: [
        { model: ReferenceProduit, as: "reference" },
        { model: HandlingUnit, as: "handlingUnits" }
      ]
    });
    if (!of) return res.status(404).json({ message: "OF non trouvé" });
    res.json(of);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.createOF = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { numeroOF, referenceId, quantiteTotale } = req.body;
    
    // Validate Reference
    const ref = await ReferenceProduit.findByPk(referenceId, { transaction: t });
    if (!ref) {
        await t.rollback();
        return res.status(404).json({ message: "Référence non trouvée" });
    }

    const of = await OrdreFabrication.create({
      numeroOF,
      referenceId,
      quantiteTotale,
      createdBy: req.user.id
    }, { transaction: t });

    // Optional: Auto-generate HUs if logic dictates (not specified in doc explicitly but implied by 'bulk')
    // We'll leave HU creation to a separate step or assume it's done elsewhere.

    await t.commit();
    res.status(201).json(of);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
