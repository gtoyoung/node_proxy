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
    console.log("Get Token 서비스 시작");
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
    console.log("Get Token 서비스 끝");
    await client.close();
  }
}

async function findOne(token) {
  try {
    await client.connect();
    console.log("FindOne 서비스 시작");
    const database = client.db("google");
    const tokens = database.collection("fcm_token");

    const query = { token: token };

    const result = await tokens.findOne(query);
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
    console.log("Insert 서비스 시작");
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
    console.log("Insert 서비스 끝");
    await client.close();
  }
}

async function deleteToken(token) {
  try {
    await client.connect();
    console.log("Delete 서비스 시작");
    const database = client.db("google");
    const tokens = database.collection("fcm_token");
    const filter = { token: token };
    await tokens.deleteOne(filter);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  } finally {
    console.log("Delete 서비스 끝");
    await client.close();
  }
}

async function update(token, notification) {
  try {
    await client.connect();
    console.log("Update 서비스 시작");
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
    console.log("Update 서비스 끝");
    await client.close();
  }
}

async function setRole() {
  try {
    return await admin
      .auth()
      .setCustomUserClaims("GirZPD6UqNb0BQi1ncATOPtEU672", { admin: true })
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function getUserList(uid) {
  try {
    return await admin
      .auth()
      .getUser(uid)
      .then((user) => {
        // admin 권한이 있는 유저인지 확인
        if (user.customClaims["admin"]) {
          return admin
            .auth()
            .listUsers()
            .then((results) => {
              return results.users;
            })
            .catch(() => {
              return null;
            });
        }
      });
  } catch (e) {
    return null;
  }
}

async function getUserInfo(uid) {
  try {
    return await admin
      .auth()
      .getUser(uid)
      .then((user) => {
        return user;
      })
      .catch(() => {
        return null;
      });
  } catch (e) {
    return null;
  }
}

app.post("/pushForUser", function (req, res) {
  var msg = req.body.msg;
  var tokens = req.body.tokens;
  tokens.map((token) => {
    const message = {
      notification: {
        title: "Dovb`s Blog",
        body: msg,
      },
      webpush: {
        notification: {
          requireInteraction: true,
          icon: "https://dovb.vercel.app/icon/favicon-32x32.png",
        },
        fcm_options: {
          link: "https://dovb.vercel.app/",
        },
      },
      token: token,
    };

    admin
      .messaging()
      .send(message)
      .then((response) => {
        // res.send("Successfully sent message");
      })
      .catch(async (error) => {
        // await deleteToken(token);
      });
  });
  res.send(true);
});

app.post("/pushAll", function (req, res) {
  var msg = req.body.msg;
  run().then((result) => {
    if (result.length !== 0) {
      result.map((token) => {
        const message = {
          notification: {
            title: "Dovb`s Blog",
            body:
              msg === undefined || msg === "" ? "Please Visit My Blog" : msg,
          },
          webpush: {
            notification: {
              requireInteraction: true,
              icon: "https://dovb.vercel.app/icon/favicon-32x32.png",
            },
            fcm_options: {
              link: "https://dovb.vercel.app/",
            },
          },
          token: token.token,
        };
        admin
          .messaging()
          .send(message)
          .then((response) => {
            // res.send("Successfully sent message");
            //console.log("Successfully sent message:", response);
          })
          .catch(async (error) => {
            // 기한이 만료되었거나 등록된 앱이나 브라우저가 제거되었을 경우
            // 토큰은 더이상 제대로 동작하지 않으므로 제거해줘야함
            // await deleteToken(token.token);
          });
      });
    } else {
      res.send("Nothing to send");
    }
  });
});

// 토큰 리스트 가져오기
app.get("/getTokens", function (req, res) {
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

// 알림 사용 여부 업데이트
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

// 토큰 정보 가져오기
app.post("/get", function (req, res) {
  var token = req.body.token;
  findOne(token)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(res.statusCode).end();
      console.log(err);
    });
});

// 사용자 역할 지정하기(우선 관리자만)
app.get("/setAdmin", function (req, res) {
  setRole()
    .then(() => {
      res.send(true);
    })
    .catch(() => {
      res.status(res.statusCode).end();
      res.send(false);
    });
});

// 유저 리스트 가져오기
app.post("/getUsers", function (req, res) {
  getUserList(req.body.uid)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(res.statusCode).end();
      res.send(null);
    });
});

// 유저 정보 가져오기
app.post("/getUserInfo", function (req, res) {
  getUserInfo(req.body.uid)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(res.statusCode).end();
      res.send(null);
    });
});

module.exports = app;
