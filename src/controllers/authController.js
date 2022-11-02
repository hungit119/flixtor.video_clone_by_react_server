const { con } = require("../config/db");
const argon2 = require("argon2");
const { v4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { sendVerificationEmail } = require("../utils/mailer");
class AuthController {
  // [POST] /api/auth/register
  async register(req, res) {
    const { username, email, password } = req.body;
    try {
      // check existing user
      const query = `select username from user where username = '${username}'`;
      con.query(query, async function (error, rows) {
        if (error) throw error;
        if (rows.length > 0) {
          res.json({
            success: false,
            message: "username was existed !",
          });
        } else {
          // username not exist
          // hash password
          try {
            const passwordEcoded = await argon2.hash(password);
            const newUser = {
              id: v4(),
              username,
              passwordEcoded,
              email,
              rule: 1,
            };
            const query = `insert into user (id,username,email,password,rule)
            values ('${newUser.id}','${newUser.username}','${newUser.email}','${newUser.passwordEcoded}','${newUser.rule}')`;
            con.query(query, function (error, rows) {
              if (error) throw error;
              const emailVerifycationToken = jwt.sign(
                { userId: newUser.id },
                process.env.SECRET_KEY_TOKEN,
                {
                  expiresIn: "30m",
                }
              );
              const url = `${process.env.BASE_URL2}/api/auth/activate/${emailVerifycationToken}`;
              sendVerificationEmail(
                newUser.email,
                newUser.username,
                url,
                "confirm"
              );
              const accessToken = jwt.sign(
                {
                  id: newUser.id,
                  rule: newUser.rule,
                },
                process.env.SECRET_KEY_TOKEN
              );
              res.json({
                success: true,
                message: "register successfully !",
                reply: {
                  id: newUser.id,
                  username: newUser.username,
                  email: newUser.email,
                  verify: false,
                  accessToken,
                },
              });
            });
          } catch (error) {
            console.log(error.message);
          }
        }
      });
      // hashed password
      // create new user
      // return token
    } catch (error) {
      console.log(error.message);
    }
  }
  // [POST] /api/auth/login
  async login(req, res) {
    const { username, password } = req.body;
    try {
      // check username existing
      const query = `select id,username,password,rule from user where username = '${username}'`;
      con.query(query, async function (error, rows) {
        if (error) throw error;
        if (rows.length === 0) {
          return res.json({
            success: false,
            message: "user not existed",
          });
        } else {
          const decodedPassword = await argon2.verify(
            rows[0].password,
            password
          );
          if (!decodedPassword) {
            return res.status(400).json({
              success: false,
              message: "Incorrect username or password!",
            });
          } else {
            const accessToken = jwt.sign(
              { id: rows[0].id, rule: rows[0].rule },
              process.env.SECRET_KEY_TOKEN
            );
            return res.json({
              success: true,
              message: "login successfully!",
              reply: {
                username: rows[0].username,
                accessToken,
              },
            });
          }
        }
      });
      // check password valid
      //   return token
    } catch (error) {
      console.log(error.message);
    }
  }
  // [GET] /api/auth/
  auth(req, res) {
    const { userId } = req;
    const query = `select id,username,email,verify,rule from user where id = '${userId}'`;
    con.query(query, function (error, rows) {
      if (error) throw error;
      res.json({
        success: true,
        message: "load user successfully",
        userInfo: {
          ...rows[0],
          password: "00000000",
        },
      });
    });
  }
  // [GET] /api/watchlist/addedWatchlist
  addedWatchlist(req, res) {
    console.log("success");
  }
  // [POST] /api/auth/checkConfirmPassword
  checkConfirmPassword(req, res) {
    const { confirmPassword, username, email } = req.body.data;
    const query = `select password from user where id = '${req.userId}'`;
    con.query(query, async function (error, rows) {
      if (error) throw error;
      const decodedPassword = await argon2.verify(
        rows[0].password,
        confirmPassword
      );
      if (decodedPassword) {
        const query = `update user set username='${username}',email='${email}' where user.id = '${req.userId}'`;
        con.query(query, function (error, rows) {
          if (error) throw error;
          const queryAfterUpdate = `select username,email from user where id='${req.userId}'`;
          con.query(queryAfterUpdate, function (error, rows) {
            if (error) throw error;
            res.json({
              success: true,
              message: "password match confirm password",
              verify: true,
              newData: rows[0],
            });
          });
        });
      } else {
        res.json({
          success: true,
          message: "password not match confirm password",
          verify: false,
        });
      }
    });
  }
  // [GET] /api/auth/activate/:token
  activateToken(req, res) {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.SECRET_KEY_TOKEN);
    const { userId } = decoded;
    const query = `select * from user where user.id='${userId}'`;
    con.query(query, (error, rows) => {
      if (error) throw error;
      if (rows.length === 1) {
        if (rows[0].verify === 0) {
          const query = `update user set verify = 1 where user.id = '${userId}'`;
          con.query(query, (error) => {
            if (error) throw error;
            res.json({
              success: true,
              message: "Activated your account",
            });
          });
        } else {
          res.json({
            success: false,
            message: "Your account is activated",
          });
        }
      }
    });
  }
  // [POST] /api/auth/forgotPassword
  forgotPassword(req, res) {
    const { username } = req.body;
    const query = `select * from user where email='${username}'`;
    con.query(query, (error, rows) => {
      if (error) throw error;
      if (rows.length === 0) {
        res.json({
          success: false,
          message: "Email not exist on server",
        });
      } else {
        const emailUser = rows[0].email;
        const idUser = rows[0].id;
        const emailVerifycationToken = jwt.sign(
          { userId: idUser },
          process.env.SECRET_KEY_TOKEN
        );
        const url = `${process.env.BASE_URL2}/api/auth/forgotPassword/${emailVerifycationToken}`;
        sendVerificationEmail(emailUser, rows[0].username, url, "forgot");
        res.json({
          success: true,
          message:
            "An email has been sent to your mail.Please check mail and accept!",
        });
      }
    });
  }
  // [POST] /api/auth/changePassword
  async changePassword(req, res) {
    const { newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      res.json({
        success: false,
        message: "new password and confirm password must be same",
      });
    } else if (newPassword === "" || confirmPassword === "") {
      res.json({
        success: false,
        message: "new password and confirm password must be fill",
      });
    } else {
      try {
        const encodedPassword = await argon2.hash(newPassword);
        const decodedToken = jwt.verify(
          req.params.token,
          process.env.SECRET_KEY_TOKEN
        );
        const query = `update user set password = '${encodedPassword}' where id='${decodedToken.userId}'`;
        con.query(query, (error, rows) => {
          if (error) throw error;
          res.json({
            success: true,
            message: "Change password successfully",
          });
        });
        console.log(query);
      } catch (error) {
        throw error;
      }
    }
  }
}
module.exports = new AuthController();
