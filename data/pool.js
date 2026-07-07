// data/pool.js
const { Pool } = require("pg");

const isProduction = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost");

module.exports = new Pool({
    connectionString: process.env.DATABASE_URL,

});