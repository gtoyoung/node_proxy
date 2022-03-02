var express = require("express");
var app = express();
require("dotenv").config();

var admin = require("firebase-admin");

var serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = `mongodb+srv://dovb:${process.env.MONGO_PW}@cluster0.5qozf.mongodb.net/google?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected correctly to server");
    const database = client.db("google");
    const tokens = database.collection("fcm_token");

    //token 필드만 가져오도록 설정
    const options = {
      projection: { _id: 0, token: 1 },
    };

    const result = await tokens.find({}, options).toArray();
    return result;
  } catch (e) {
    console.log(e);
    return null;
  } finally {
    await client.close();
  }
}

async function insert(token) {
  try {
    await client.connect();
    console.log("Connected correctly to server");
    const database = client.db("google");
    const tokens = database.collection("fcm_token");

    // 기존에 등록된 토큰이 있을 경우 삽입하지 않는다.
    const query = { token: token };
    const exist = await tokens.findOne(query);

    if (exist !== null) return false;

    const insertQuery = { token: token };
    const result = await tokens.insertOne(insertQuery);
    return result;
  } catch (e) {
    console.log(e);
    return null;
  } finally {
    await client.close();
  }
}

app.get("/sendPush", function (req, res) {
  run().then((result) => {
    result.map((token) => {
      const message = {
        notification: {
          title: "Dovb`s Blog Push Test",
          body: "메세지가 잘 가나요?",
        },
        token: token.token,
      };
      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Successfully sent message:", response);
        });
    });
  });
});

// 토큰 리스트 가져오기
app.get("/getToken", function (req, res) {
  run()
    .then((data) => {
      console.log(data);
      res.send(data);
    })
    .catch((err) => console.log(err));
});

// 토큰 값 삽입
app.post("/insertToken", function (req, res) {
  insert(req.body.token)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(res.statusCode).end();
      console.log(err);
    });
});

module.exports = app;
