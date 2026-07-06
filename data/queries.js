// data/queries.js

const pool = require("../data/pool")

exports.getAllCategories = async() => {
    const {rows} = await pool.query("SELECT * FROM categories")
    return rows;
}

exports.getGamesofCategory = async(id) => {
    const {rows} = await pool.query("SELECT items.* FROM items JOIN categories ON items.category_id = categories.id WHERE categories.id = $1;",[id])
    return rows;
}

exports.getSpecificCategoryInfo = async (id) => {
    const {rows} = await pool.query("SELECT * from categories WHERE id = $1;",[id])
    return rows [0];
}



exports.addCategory = async (obj) => {
    const {rows} = await pool.query("INSERT INTO categories (categories_title, description) VALUES ($1,$2);",[obj.categories_title, obj.description])
}

exports.editCategory = async (id,categories_title, description) => {
    const {rows} = await pool.query("UPDATE categories SET categories_title = $1, description=$2 where id = $3 ;",[categories_title,description, id])
}

exports.deleteCategory = async (id) => {
    await pool.query("UPDATE items SET category_id = NULL WHERE category_id = $1;",[id])
    await pool.query("DELETE FROM categories WHERE id = $1;",[id])
}

exports.addGame = async (obj) => {
    const {rows} = await pool.query("INSERT INTO items (game_title, game_price, category_id ) VALUES ($1,$2, $3);",[obj.game_title, obj.game_price, obj.category_id])
}

exports.editGame = async (id,game_title, game_price,category_id) => {
    const {rows} = await pool.query("UPDATE items SET game_title = $1, game_price=$2, category_id=$4 where id = $3 ;",[game_title,game_price, id,category_id])
}

exports.getSpecificGameInfo = async (id) => {
    const {rows} = await pool.query("SELECT * from items WHERE id = $1;",[id])
    return rows [0];
}
