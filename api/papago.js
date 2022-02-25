var express = require("express");
var app = express();
require("dotenv").config();
var client_id = process.env.PAPAGO_CLIENT_ID;
var client_secret = process.env.PAPAGO_CLIENT_SECRET;

app.post("/", function (req, res) {
  var query = req.body.query;
  var api_url = "https://openapi.naver.com/v1/papago/n2mt";
  var request = require("request");
  var options = {
    url: api_url,
    form: { source: "en", target: "ko", text: query },
    headers: {
      "X-Naver-Client-Id": client_id,
      "X-Naver-Client-Secret": client_secret,
    },
  };
  request.post(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.writeHead(200, { "Content-Type": "text/json;charset=utf-8" });
      res.end(body);
    } else {
      res.status(response.statusCode).end();
      console.log("error = " + response.statusCode);
    }
  });
});

module.exports = app;
