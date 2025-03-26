const mysql = require("mysql");
const bcrypt = require("bcrypt");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Anish",
  database: "rollcall",
});

connection.connect();

connection.query("SELECT register, password FROM users", async (err, results) => {
  if (err) throw err;

  for (let user of results) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    connection.query(
      "UPDATE users SET password = ? WHERE register = ?",
      [hashedPassword, user.register]
    );
  }

  console.log("Passwords updated!");
  connection.end();
});
