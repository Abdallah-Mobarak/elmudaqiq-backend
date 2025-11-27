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

app.use("/uploads", express.static("uploads"));




// Routes
const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);
app.use("/countries", require("./routes/country.routes"));
app.use("/cities", require("./routes/city.routes"));
app.use("/regions", require("./routes/region.routes"));
app.use("/api/system-settings", require("./routes/systemSettings.routes"));
app.use("/websites", require("./routes/authorityWebsite.routes"));
app.use("/account-guides", require("./routes/accountGuide.routes"));
app.use("/review-guides", require("./routes/reviewGuide.routes"));
app.use("/file-stages", require("./routes/fileStages.routes"));
app.use("/review-objectives", require("./routes/reviewObjective.routes"));
app.use("/review-objective-stages", require("./routes/reviewObjectiveStage.routes"));
app.use("/review-marks-index", require("./routes/reviewMarkIndex.routes"));
app.use("/subscribers", require("./routes/subscriber.routes"));


// Error Handler (ALWAYS LAST)
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
