var express = require("express");
var schedule = require("node-schedule");

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

async function getUserTask(uid) {
  try {
    return await database
      .ref(`/users/${uid}/taskData/tasks`)
      .get()
      .then((tasks) => {
        if (tasks.val()) {
          let taskList = [];
          for (let index in tasks.val()) {
            const task = tasks.val()[index];
            if (task.alertDate) {
              const taskDate = new Date(task.alertDate);
              const currentDate = new Date();
              if (
                taskDate.getFullYear() === currentDate.getFullYear() &&
                taskDate.getMonth() === currentDate.getMonth() &&
                taskDate.getDate() === currentDate.getDate() &&
                taskDate.getHours() === currentDate.getHours() &&
                taskDate.getMinutes() === currentDate.getMinutes()
              ) {
                taskList.push({
                  content: task.content,
                });
              }
            }
          }
          return taskList;
        } else {
          return null;
        }
      })
      .catch(() => {
        return null;
      });
  } catch (e) {
    return null;
  }
}

async function getUserTokens(uid) {
  try {
    return await database
      .ref(`/users/${uid}/token`)
      .get()
      .then((tokens) => {
        if (tokens.val()) {
          return [...tokens.val()];
        } else {
          return null;
        }
      })
      .catch(() => {
        return null;
      });
  } catch (e) {
    return null;
  }
}

async function getAlertList() {
  try {
    const data = await admin
      .auth()
      .listUsers()
      .then(async (userList) => {
        return await Promise.all(
          userList.users.map((user) => {
            //Task Data 추출
            return getUserTokens(user.uid).then(async (tokens) => {
              if (tokens) {
                return await Promise.all(
                  tokens?.map((token) => {
                    return getUserTask(user.uid).then((tasks) => {
                      if (tasks) {
                        return tasks?.map((task) => {
                          return {
                            content: task.content,
                            token: token,
                          };
                        });
                      } else {
                        return null;
                      }
                    });
                  })
                );
              } else {
                return null;
              }
            });
          })
        );
      });
    let alertList = [];
    for (let index in data) {
      if (data[index]) {
        for (let index2 in data[index]) {
          if (data[index][index2]) {
            data[index][index2].forEach((task) => {
              alertList.push(task);
            });
          }
        }
      }
    }
    return alertList;
  } catch (e) {
    console.log(e);
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

app.get("/pushMsg", function (req, res) {
  getAlertList()
    .then((alertList) => {
      alertList?.forEach((alert) => {
        const message = {
          notification: {
            title: "오늘 일정이 있습니다.",
            body: alert.content,
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
          token: alert.token,
        };
        admin
          .messaging()
          .send(message)
          .then(() => {
            console.log("scheduled message sent");
          })
          .catch((err) => {
            console.log("scheduled message failed");
          });
      });
    })
    .then(() => {
      res.send("Success");
    })
    .catch(() => {
      res.send("Failure");
    });
});

// const j = schedule.scheduleJob("* * * * *", async function () {
//   getAlertList().then((alertList) => {
//     alertList?.forEach((alert) => {
//       const message = {
//         notification: {
//           title: "오늘 일정이 있습니다.",
//           body: alert.content,
//         },
//         webpush: {
//           notification: {
//             requireInteraction: true,
//             icon: "https://dovb.vercel.app/icon/favicon-32x32.png",
//           },
//           fcm_options: {
//             link: "https://dovb.vercel.app/",
//           },
//         },
//         token: alert.token,
//       };
//       admin
//         .messaging()
//         .send(message)
//         .then(() => {
//           console.log("scheduled message sent");
//         })
//         .catch((err) => {
//           console.log("scheduled message failed");
//         });
//     });
//   });
// });

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
