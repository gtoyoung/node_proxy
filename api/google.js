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
      projection: { _id: 0, token: 1, notification: 1 },
    };

    // notification이 true인 필드만 가져오도록 설정
    const query = { notification: true };

    const result = await tokens.find(query, options).toArray();
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

    // 등록된 토큰이 존재할 경우 존재하는 파일 삽입
    if (exist !== null) return exist;

    const insertQuery = { token: token, notification: true };
    await tokens.insertOne(insertQuery);
    return null;
  } catch (e) {
    console.log(e);
    return "fail";
  } finally {
    await client.close();
  }
}

async function update(token, notification) {
  try {
    await client.connect();
    const database = client.db("google");
    const tokens = database.collection("fcm_token");
    const filter = { token: token };

    const update = { $set: { notification: notification } };
    const result = await tokens.updateOne(filter, update);
    return result.acknowledged;
  } catch (e) {
    console.log(e);
    return false;
  } finally {
    await client.close();
  }
}

app.get("/push", function (req, res) {
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
          res.send("Successfully sent message");
          console.log("Successfully sent message:", response);
        })
        .catch((error) => {
          res.send("fail sent message");
          console.log(error);
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

app.post("/updateToken", function (req, res) {
  var token = req.body.token;
  var notification = req.body.notification;
  update(token, notification)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(res.statusCode).end();
      console.log(err);
    });
});

module.exports = app;
