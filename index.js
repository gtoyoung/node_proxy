const express = require("express");
const app = express();
const papago = require("./api/papago");

app.use(express.json({ extended: true }));
app.use("/api/translate", papago);

app.get("/", function (req, res) {
  res.send("WELCOM! DOVB`s API PROXY SERVER");
});

const PORT = process.env.PORT || 80;
app.listen(PORT, function () {
  console.log(`Server is running on ${PORT}`);
});
