const express = require("express");
const app = express();
const papago = require("./api/papago");
const cors = require("cors");
require("dotenv").config();

const corsOptions = {
  origin: process.env.TARGET_URL,
};

app.use(cors(corsOptions));
app.use(express.json({ extended: true }));
app.use("/api/translate", papago);

app.get("/", function (req, res) {
  res.send("WELCOM! DOVB`S API PROXY SERVER");
});

const PORT = process.env.PORT || 80;
app.listen(PORT, function () {
  console.log(`Server is running on ${PORT}`);
});
