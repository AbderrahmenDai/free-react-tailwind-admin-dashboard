const { ProductionLine, OrdreFabrication, HistoriqueScan, sequelize } = require("../models");
const { Op } = require("sequelize");

exports.getAllLines = async (req, res) => {
  try {
    const lines = await ProductionLine.findAll({
      order: [['code', 'ASC']]
    });

    // START: Mock Data Injection
    const linesWithData = lines.map(line => {
      const lineData = line.toJSON();
      
      // Only inject for active/maintenance lines if data is missing
      if (lineData.statut !== 'stopped') {
        if (!lineData.efficacite) {
          // Random efficiency between 45% and 98%
          lineData.efficacite = Math.floor(Math.random() * (98 - 45 + 1) + 45);
        }
        
        if (!lineData.cadence) {
          // Random cadence between 120 and 450 items/hour
          lineData.cadence = Math.floor(Math.random() * (450 - 120 + 1) + 120);
        }
        
        if (!lineData.objectif) {
          // Objective = Cadence * 8 hours (approx shift)
          // Just a rough reasonable number
          lineData.objectif = (lineData.cadence || 300) * 8; 
        }
      } else {
        // Ensure stopped lines show 0
        lineData.efficacite = 0;
        lineData.cadence = 0;
        lineData.objectif = 0;
      }
      
      return lineData;
    });
    // END: Mock Data Injection

    res.json(linesWithData);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.getLineStats = async (req, res) => {
  const { lineId } = req.params;
  const { period } = req.query; // 'day', 'week', 'month'

  try {
    // 1. Get the line
    const line = await ProductionLine.findByPk(lineId);
    if (!line) return res.status(404).send({ message: "Line not found" });

    // 2. Calculate Hourly Production for the current day (Real-time chart)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const hourlyStats = await HistoriqueScan.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'hour', sequelize.col('dateHeureScan')), 'hour'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      include: [{
        model: OrdreFabrication,
        as: 'ordreFabrication',
        where: { productionLineId: lineId },
        attributes: []
      }],
      where: {
        dateHeureScan: {
          [Op.between]: [startOfDay, endOfDay]
        },
        resultatVerification: 'SUCCES'
      },
      group: [sequelize.fn('date_trunc', 'hour', sequelize.col('dateHeureScan'))],
      order: [[sequelize.fn('date_trunc', 'hour', sequelize.col('dateHeureScan')), 'ASC']]
    });

    // Format for frontend chart
    const chartData = {
      categories: hourlyStats.map(stat => {
        const date = new Date(stat.dataValues.hour);
        return `${date.getHours()}:00`;
      }),
      data: hourlyStats.map(stat => parseInt(stat.dataValues.count))
    };

    res.json({
      line,
      hourlyProduction: chartData
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: error.message });
  }
};

// Seed Lines if empty (Helper for dev)
exports.seedLines = async (req, res) => {
  try {
    const lines = [
      { code: 'FSB1', nom: 'FSB 1', type: 'FSB', status: 'active', efficacite: 92 },
      { code: 'FSB2', nom: 'FSB 2', type: 'FSB', status: 'active', efficacite: 88 },
      { code: 'FSB3', nom: 'FSB 3', type: 'FSB', status: 'maintenance', efficacite: 0 },
      { code: 'FSB4', nom: 'FSB 4', type: 'FSB', status: 'active', efficacite: 95 },
      { code: 'FSB5', nom: 'FSB 5', type: 'FSB', status: 'stopped', efficacite: 0 },
      { code: 'RSC1', nom: 'RSC 1', type: 'RSC', status: 'active', efficacite: 85 },
      { code: 'RSC2', nom: 'RSC 2', type: 'RSC', status: 'active', efficacite: 89 },
      { code: 'RSC3', nom: 'RSC 3', type: 'RSC', status: 'active', efficacite: 91 },
      { code: 'RSB1', nom: 'RSB 1', type: 'RSB', status: 'active', efficacite: 87 },
      { code: 'RSB2', nom: 'RSB 2', type: 'RSB', status: 'active', efficacite: 84 },
      { code: 'FSC1', nom: 'FSC 1', type: 'FSC', status: 'active', efficacite: 93 },
      { code: 'FSC2', nom: 'FSC 2', type: 'FSC', status: 'active', efficacite: 90 },
    ];

    for (const line of lines) {
      await ProductionLine.findOrCreate({
        where: { code: line.code },
        defaults: line
      });
    }


    res.send({ message: "Lines seeded successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.createLine = async (req, res) => {
  try {
    const line = await ProductionLine.create(req.body);
    res.status(201).json(line);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.updateLine = async (req, res) => {
  const { lineId } = req.params;
  try {
    const [updated] = await ProductionLine.update(req.body, {
      where: { id: lineId }
    });
    if (updated) {
      const updatedLine = await ProductionLine.findByPk(lineId);
      return res.status(200).json(updatedLine);
    }
    return res.status(404).send({ message: 'Line not found' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.deleteLine = async (req, res) => {
  const { lineId } = req.params;
  try {
    const deleted = await ProductionLine.destroy({
      where: { id: lineId }
    });
    if (deleted) {
      return res.status(204).send();
    }
    return res.status(404).send({ message: "Line not found" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.getStatsByType = async (req, res) => {
  const { period } = req.query; // 'day', 'week', 'month'

  try {
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const scans = await HistoriqueScan.findAll({
      where: {
        dateHeureScan: { [Op.gte]: startDate },
        resultatVerification: 'SUCCES'
      },
      include: [{
        model: OrdreFabrication,
        as: 'ordreFabrication',
        required: true,
        include: [{
          model: ProductionLine,
          as: 'line',
          required: true
        }]
      }],
      order: [['dateHeureScan', 'ASC']]
    });

    const buckets = {};
    const types = ['FSB', 'RSC', 'RSB', 'FSC'];

    scans.forEach(scan => {
      const date = new Date(scan.dateHeureScan);
      let key;

      if (period === 'day') {
        key = `${date.getHours()}:00`;
      } else if (period === 'week') {
        key = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      } else {
        key = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      }

      if (!buckets[key]) {
        buckets[key] = { FSB: 0, RSC: 0, RSB: 0, FSC: 0 };
      }
      
      const type = scan.ordreFabrication.line.type;
      if (buckets[key][type] !== undefined) {
        buckets[key][type]++;
      }
    });

    const categories = Object.keys(buckets);
    const series = types.map(type => ({
      name: type,
      data: categories.map(cat => buckets[cat][type])
    }));

    res.json({ categories, series });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: error.message });
  }
};
