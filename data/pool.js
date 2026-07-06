// data/pool.js
const { Pool } = require("pg");

module.exports = new Pool({
  host: "localhost",
  user: process.env.DBUSERNAME,
  database: process.env.DBDATABASE,
  password: process.env.DBPASSWORD,
  port: 5432,
});