var express = require("express");
var app = express();
require("dotenv").config();

var admin = require("firebase-admin");

var serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dovb-blog-default-rtdb.firebaseio.com",
});

const database = admin.database();

async function getTokens() {
  try {
    return database
      .ref("/fcmToken")
      .get()
      .then((tokens) => {
        return tokens.val();
      });
  } catch (e) {
    return null;
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

app.get("/getTokens", function (req, res) {
  getTokens()
    .then((tokens) => {
      res.send(tokens);
    })
    .catch((err) => {
      res.status(res.statusCode).end();
      res.send(null);
    });
});

app.post("/pushMsg", function (req, res) {
  var token = req.body.token;
  var msg = req.body.msg;
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
    .then(() => {
      res.send("success");
    })
    .catch((err) => {
      res.status(res.statusCode).end();
      res.send(null);
    });
});

app.post("/pushForUser", function (req, res) {
  var msg = req.body.msg;
  var tokens = req.body.tokens;
  if (tokens.length !== 0) {
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
          res.send("Successfully sent message");
        })
        .catch(async (error) => {
          //await deleteToken(token);
        });
    });
  } else {
    res.send("No token");
  }
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
