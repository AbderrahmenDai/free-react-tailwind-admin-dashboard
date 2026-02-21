const { HandlingUnit, OrdreFabrication, ReferenceProduit } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/db");

/**
 * Returns MAX(compteurHU) across ALL HUs linked to OFs sharing the same referenceId.
 * This makes compteurHU a global counter per reference product.
 */
async function getMaxCompteurForReference(referenceId, transaction) {
    if (!referenceId) return 0;
    const relatedOFs = await OrdreFabrication.findAll({
        where: { referenceId },
        attributes: ['id'],
        transaction,
    });
    if (!relatedOFs.length) return 0;
    const ofIds = relatedOFs.map(o => o.id);
    const maxVal = await HandlingUnit.max('compteurHU', {
        where: { ordreFabricationId: { [Op.in]: ofIds } },
        transaction,
    });
    return maxVal != null ? Number(maxVal) : 0;
}

exports.createHU = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { 
        numeroHU, 
        ordreFabricationId, 
        quantitePrevue, 
        statut, 
        idType, 
        createdUser 
    } = req.body;

    // Validate OF
    const of = await OrdreFabrication.findByPk(ordreFabricationId, { transaction: t });
    if (!of) {
        await t.rollback();
        return res.status(404).json({ message: "OF introuvable" });
    }

    // —— Auto-increment compteurHU: global MAX across all OFs with same reference + 1
    const nextCompteur = (await getMaxCompteurForReference(of.referenceId, t)) + 1;

    const hu = await HandlingUnit.create({
        numeroHU,
        ordreFabricationId,
        quantitePrevue,
        statut: statut || "A_SCANNER",
        idType: idType || "E",
        createdUser: createdUser || req.user?.username || "SysAdmin",
        qualite: "CONFORME",
        compteurHU: nextCompteur,
    }, { transaction: t });

    // —— Sync quantiteTotale with real HU count
    const newCount = await HandlingUnit.count({ where: { ordreFabricationId }, transaction: t });
    await of.update({ quantiteTotale: newCount }, { transaction: t });

    // —— Sync compteur on the reference: keep it = last compteurHU so the form shows the current value
    if (of.referenceId) {
        await ReferenceProduit.update(
            { compteur: nextCompteur },
            { where: { id: of.referenceId }, transaction: t }
        );
    }

    await t.commit();
    res.status(201).json(hu);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.updateHU = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { quantitePrevue, statut, idType, createdUser, qualite } = req.body;
    const hu = await HandlingUnit.findByPk(req.params.id, { transaction: t });
    
    if (!hu) {
      await t.rollback();
      return res.status(404).json({ message: "HU introuvable" });
    }

    await hu.update({
        quantitePrevue,
        statut,
        idType,
        createdUser,
        qualite
    }, { transaction: t });

    await t.commit();
    res.json(hu);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.deleteHU = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const hu = await HandlingUnit.findByPk(req.params.id, { transaction: t });
    
    if (!hu) {
      await t.rollback();
      return res.status(404).json({ message: "HU introuvable" });
    }

    const { ordreFabricationId } = hu;

    await hu.destroy({ transaction: t });

    // —— Sync quantiteTotale: decrement OF total after HU deletion
    const of = await OrdreFabrication.findByPk(ordreFabricationId, { transaction: t });
    if (of) {
      const newCount = await HandlingUnit.count({ where: { ordreFabricationId }, transaction: t });
      await of.update({ quantiteTotale: newCount }, { transaction: t });
    }

    await t.commit();
    res.json({ message: "HU supprimé avec succès" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
