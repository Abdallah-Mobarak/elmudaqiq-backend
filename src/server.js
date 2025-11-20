const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const errorMiddleware = require("./middleware/error.middleware");


app.use(express.json());
app.use(cors());





// Routes
const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);
app.use("/countries", require("./routes/country.routes"));
app.use("/cities", require("./routes/city.routes"));
app.use("/regions", require("./routes/region.routes"));
app.use("/api/system-settings", require("./routes/systemSettings.routes"));
app.use("/websites", require("./routes/authorityWebsite.routes"));
app.use("/account-guides", require("./routes/accountGuide.routes"));


// Error Handler (ALWAYS LAST)
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
