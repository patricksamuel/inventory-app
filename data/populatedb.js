#! /usr/bin/env node

const { Client } = require("pg");
require("dotenv").config();
const SQL = `

DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    categories_title VARCHAR (255),
    description VARCHAR (255)
);

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    game_title VARCHAR (255),
    game_price DECIMAL (10,2),
    category_id INTEGER REFERENCES categories(id)
);

INSERT INTO categories (categories_title, description) VALUES
    ('Action', 'Fast-paced action games'),
    ('RPG', 'Role-playing games'),
    ('Sports', 'Sports simulation games');

INSERT INTO items (game_title, game_price, category_id) VALUES
    ('God of War', 59.99, 1),
    ('Final Fantasy XVI', 49.99, 2),
    ('FIFA 25', 39.99, 3),
    ('Dark Souls', 29.99, 1);


`;

async function main() {
  console.log("seeding...");
  const client = new Client({
// ← take the connection string from the command line
  connectionString: process.argv[2] || `postgresql://${process.env.DBUSERNAME}:${process.env.DBPASSWORD}@localhost:5432/inventory-app-db`,

});
  await client.connect();
  await client.query(SQL);
  await client.end();
  console.log("done");
}

main();
