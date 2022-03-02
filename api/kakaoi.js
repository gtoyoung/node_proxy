var express = require("express");
var app = express();
require("dotenv").config();
var kakaoKey = process.env.KAKAO_REST_KEY;

app.post("/", function (req, res) {
  var text = req.body.text;
  var api_url = "https://dapi.kakao.com/v2/translation/translate";
  var request = require("request");
  var options = {
    url: api_url,
    form: { src_lang: "en", target_lang: "kr", query: text },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `KakaoAK ${kakaoKey}`,
    },
    encoding: null,
  };
  request.post(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      //   res.writeHead(200, { "Content-Type": "text/json;charset=utf-8" });
      var result = JSON.parse(body);

      res.send({ result: result.translated_text });
    } else {
      res.status(response.statusCode).end();
      console.log(body);
    }
  });
});

module.exports = app;
