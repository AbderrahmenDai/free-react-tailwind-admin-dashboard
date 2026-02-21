const { HistoriqueScan, OrdreFabrication, ProductionLine, sequelize } = require("../models");
const { Op } = require("sequelize");

exports.getProductionStats = async (req, res) => {
  try {
    const now = new Date();
    // If before 06:00, consider it previous production day
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Shifts configuration
    const shifts = [
      { name: "Matin", start: 6, end: 14 },
      { name: "Après-midi", start: 14, end: 22 },
      { name: "Nuit", start: 22, end: 6 } // Ends next day
    ];

    const stats = {
      shifts: [],
      lines: []
    };

    // 1. Calculate Shift Stats (Global)
    // We need total active production lines to calculate total objective
    const activeLines = await ProductionLine.findAll({ where: { statut: 'active' } });
    const totalObjectivePerShift = activeLines.reduce((sum, line) => sum + (line.objectif || 0), 0);

    for (const shift of shifts) {
      let startTime = new Date(today);
      startTime.setHours(shift.start, 0, 0, 0);
      
      let endTime = new Date(today);
      if (shift.name === "Nuit") {
        endTime.setDate(endTime.getDate() + 1);
        endTime.setHours(shift.end, 0, 0, 0);
      } else {
        endTime.setHours(shift.end, 0, 0, 0);
      }

      // Count successful scans in this period
      const productionCount = await HistoriqueScan.count({
        where: {
          dateHeureScan: {
            [Op.gte]: startTime,
            [Op.lt]: endTime
          },
          resultatVerification: "SUCCES"
        }
      });

      // Calculate efficiency
      // Objective is per shift. If 0 objective, avoid division by zero
      let efficiency = 0;
      if (totalObjectivePerShift > 0) {
        efficiency = Math.round((productionCount / totalObjectivePerShift) * 100);
      }

      stats.shifts.push({
        name: shift.name,
        range: `${shift.start}:00 - ${shift.end}:00`,
        production: productionCount,
        objective: totalObjectivePerShift,
        efficiency: efficiency
      });
    }

    // ... (previous logic for shifts and lines)

    // 2. Calculate Stats Per Production Line (For Charts)
    const dayStart = new Date(today);
    dayStart.setHours(6, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(6, 0, 0, 0);

    // Group by Production Line
    const lineStats = await HistoriqueScan.findAll({
      attributes: [
        [sequelize.col('ordreFabrication.line.nom'), 'lineName'],
        [sequelize.fn('COUNT', sequelize.col('HistoriqueScan.id')), 'productionCount']
      ],
      include: [
        {
          model: OrdreFabrication,
          as: 'ordreFabrication',
          attributes: [],
          include: [
            {
              model: ProductionLine,
              as: 'line',
              attributes: []
            }
          ]
        }
      ],
      where: {
        dateHeureScan: {
          [Op.gte]: dayStart,
          [Op.lt]: dayEnd
        },
        resultatVerification: "SUCCES"
      },
      group: ['ordreFabrication.line.nom', 'ordreFabrication.line.id'],
      raw: true
    });

    // Format for chart
    let formattedLineStats = activeLines.map(line => {
      const stat = lineStats.find(s => s.lineName === line.nom);
      return {
        name: line.nom,
        production: stat ? parseInt(stat.productionCount) : 0,
        objective: line.objectif * 3 // Total daily objective (3 shifts)
      };
    });

    // MOCK DATA INJECTION IF EMPTY (For Demo Purposes)
    const isDemoMode = true; // Force demo mode for "fake data" request

    if (isDemoMode) {
        // Mock Shifts if empty
        stats.shifts = stats.shifts.map(s => {
            if (s.production === 0) {
                 // Generate random realistic production numbers based on shift
                 let baseObj = s.objective || 1200;
                 let randomEfficiency = 0.6 + Math.random() * 0.35; // 60% to 95%
                 if(s.name === "Nuit") randomEfficiency -= 0.2; // Lower for night
                 
                 let fakeProd = Math.floor(baseObj * randomEfficiency);
                 return {
                     ...s,
                     production: fakeProd,
                     efficiency: Math.round((fakeProd / baseObj) * 100)
                 };
            }
            return s;
        });

        // Mock Lines if empty or few
        if (formattedLineStats.length === 0 || formattedLineStats.every(l => l.production === 0)) {
            // Create some fake lines if none exist in DB to map to
             const demoLines = formattedLineStats.length > 0 ? formattedLineStats : [
                 { name: "Ligne 1", objective: 3600 },
                 { name: "Ligne 2", objective: 3600 },
                 { name: "Ligne 3", objective: 3600 },
                 { name: "Ligne 4", objective: 3600 }
             ];

             formattedLineStats = demoLines.map(l => ({
                 name: l.name,
                 objective: l.objective || 3600,
                 production: Math.floor((l.objective || 3600) * (0.5 + Math.random() * 0.4))
             }));
        }
    }

    stats.lines = formattedLineStats;

    // Additional Stats for other charts (Mocked for now)
    stats.global = {
        users: { count: 3782, trend: 11.01 }, // Example
        ofs: { count: 125, trend: -5.02 },
        revenue: { value: "120K", trend: 15.3 }
    };
    
    stats.monthly = {
        series: [
            { name: "Production", data: [65, 59, 80, 81, 56, 55, 40, 70, 90, 100, 110, 120] },
            { name: "Rebuts", data: [5, 9, 4, 10, 2, 3, 1, 5, 4, 6, 8, 5] }
        ]
    };

    res.json(stats);

  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques", error: error.message });
  }
};
