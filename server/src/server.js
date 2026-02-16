const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { sequelize } = require("./models");
const authRoutes = require("./routes/auth.routes");
const scanRoutes = require("./routes/scan.routes");
const ofRoutes = require("./routes/of.routes");
const importRoutes = require("./routes/import.routes");
const referenceRoutes = require("./routes/reference.routes");
const lineRoutes = require("./routes/line.routes");

require("dotenv").config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors()); // Allow all origins for dev, restrict in prod
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/of", ofRoutes);
app.use("/api/import", importRoutes);
app.use("/api/references", referenceRoutes);
app.use("/api/lines", lineRoutes);

app.get("/", (req, res) => {
  res.send("GALIA Scanner API is running");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Database Sync and Server Start
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
  console.log("Database synced");
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to sync database:", err);
});
