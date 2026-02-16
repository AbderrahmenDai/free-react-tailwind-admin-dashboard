const { ReferenceProduit, OrdreFabrication } = require("../models");

exports.getAllReferences = async (req, res) => {
  try {
    const references = await ReferenceProduit.findAll();
    res.json(references);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des références", error: error.message });
  }
};

exports.getReferenceById = async (req, res) => {
  try {
    const reference = await ReferenceProduit.findByPk(req.params.id);
    if (!reference) return res.status(404).json({ message: "Référence non trouvée" });
    res.json(reference);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.createReference = async (req, res) => {
  try {
    const { codeReference, designation, indice, referenceInterne, uniteMesure, familleProduit } = req.body;
    
    // Check uniqueness (codeReference)
    const existing = await ReferenceProduit.findOne({ where: { codeReference } });
    if (existing) return res.status(400).json({ message: "Code référence déjà existant" });

    const newRef = await ReferenceProduit.create(req.body);
    res.status(201).json(newRef);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création", error: error.message });
  }
};

exports.updateReference = async (req, res) => {
  try {
    const reference = await ReferenceProduit.findByPk(req.params.id);
    if (!reference) return res.status(404).json({ message: "Référence non trouvée" });

    await reference.update(req.body);
    res.json(reference);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", error: error.message });
  }
};

exports.deleteReference = async (req, res) => {
  try {
    const reference = await ReferenceProduit.findByPk(req.params.id);
    if (!reference) return res.status(404).json({ message: "Référence non trouvée" });

    // Check usage in OF
    const usage = await OrdreFabrication.findOne({ where: { referenceId: reference.id } });
    if (usage) return res.status(400).json({ message: "Référence utilisée dans des OF, impossible de supprimer" });

    await reference.destroy();
    res.json({ message: "Référence supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error: error.message });
  }
};
