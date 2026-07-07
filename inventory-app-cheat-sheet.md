# Inventory App — Full Stack Cheat Sheet

A reference covering Express + PostgreSQL + EJS patterns, SQL fundamentals, validation, deployment to Render + Neon, and common gotchas — all from building the inventory app.

---

## 1. Project Setup

### Initialize
```bash
mkdir inventory-app && cd inventory-app
npm init -y
npm install express ejs pg express-validator dotenv
```

### File structure
```
inventory-app/
├── app.js                # Entry point
├── .env                  # Local env vars (gitignored)
├── .gitignore
├── package.json
├── data/
│   ├── pool.js           # Database connection
│   ├── queries.js        # All SQL queries
│   └── populatedb.js     # Seed script
├── controllers/
│   └── gameController.js # Route handlers
├── routes/
│   └── gameRouter.js     # Route definitions
└── views/
    ├── index.ejs
    ├── game-list.ejs
    ├── game-view.ejs
    ├── edit-category.ejs
    └── partials/
        └── errors.ejs
```

### .gitignore (create BEFORE first commit)
```
node_modules/
.env
```

### .env (local development)
```dotenv
PORT=3000
DATABASE_URL=postgresql://XXXX:XXXX@localhost:5432/inventory-app-db
```

> No spaces after `=`. Spaces get included in the value and break things.

### app.js essentials
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
```

> `process.env.PORT` is required for Render. `|| 3000` is the local fallback.

---

## 2. Database Connection (pool.js)

### Works for both local and production
```javascript
const { Pool } = require("pg");

module.exports = new Pool({
    connectionString: process.env.DATABASE_URL,
});
```

- Locally: `DATABASE_URL` points to `localhost`
- On Render: `DATABASE_URL` points to Neon (SSL handled by the connection string)

---

## 3. SQL Fundamentals

### Command order
```
SELECT columns FROM table WHERE condition
INSERT INTO table (columns) VALUES (values)
UPDATE table SET column = value WHERE condition
DELETE FROM table WHERE condition
```

> Think: **what table → what to change → which rows**

### Create tables
```sql
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    categories_title VARCHAR(255),
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    game_title VARCHAR(255),
    game_price DECIMAL(10,2),
    category_id INTEGER REFERENCES categories(id)
);
```

- `GENERATED ALWAYS AS IDENTITY` = auto-incrementing id
- `DECIMAL(10,2)` = 10 total digits, 2 after decimal. Max: `99999999.99`
- `REFERENCES categories(id)` = foreign key linking items to categories

### Insert rows
```sql
INSERT INTO categories (categories_title, description) VALUES ('Action', 'Fast-paced games');
INSERT INTO items (game_title, game_price, category_id) VALUES ('God of War', 59.99, 1);
```

> Categories must be inserted first — items reference them.

### Foreign keys and JOIN

The `category_id` on items points to `id` on categories. A JOIN combines them temporarily for display — it never changes either table.

```sql
-- Get items with their category name
SELECT items.*, categories.categories_title
FROM items
JOIN categories ON items.category_id = categories.id;

-- Filter by category
SELECT items.*
FROM items
JOIN categories ON items.category_id = categories.id
WHERE categories.id = 1;
```

> JOIN builds the full picture, WHERE narrows it down.

### Querying NULL values
```sql
SELECT * FROM items WHERE category_id IS NULL;
```

> Use `IS NULL`, not `= NULL`. NULL isn't a value, it's the absence of one.

### ON DELETE behavior (set on the table, not per query)

| Option | What happens when parent is deleted |
|---|---|
| Default (nothing) | Blocks the delete — error |
| `ON DELETE CASCADE` | Deletes child rows too |
| `ON DELETE SET NULL` | Sets the foreign key to NULL |

Manual alternative (no ALTER TABLE needed):
```javascript
exports.deleteCategory = async (id) => {
    await pool.query("UPDATE items SET category_id = NULL WHERE category_id = $1;", [id]);
    await pool.query("DELETE FROM categories WHERE id = $1;", [id]);
};
```

---

## 4. Database Queries (queries.js patterns)

### Always use parameterized queries ($1, $2...) to prevent SQL injection

```javascript
// Get all
exports.getAllCategories = async () => {
    const { rows } = await pool.query("SELECT * FROM categories;");
    return rows;
};

// Get one (return single object, not array)
exports.getSpecificCategoryInfo = async (id) => {
    const { rows } = await pool.query("SELECT * FROM categories WHERE id = $1;", [id]);
    return rows[0];
};

// Get filtered
exports.getGamesOfCategory = async (id) => {
    const { rows } = await pool.query("SELECT * FROM items WHERE category_id = $1;", [id]);
    return rows;
};

// Insert (use RETURNING * if you need the new row back)
exports.addCategory = async (obj) => {
    const { rows } = await pool.query(
        "INSERT INTO categories (categories_title, description) VALUES ($1, $2) RETURNING *;",
        [obj.categories_title, obj.description]
    );
    return rows[0];
};

// Update
exports.editCategory = async (id, categories_title, description) => {
    await pool.query(
        "UPDATE categories SET categories_title = $1, description = $2 WHERE id = $3;",
        [categories_title, description, id]
    );
};

// Delete
exports.deleteCategory = async (id) => {
    await pool.query("UPDATE items SET category_id = NULL WHERE category_id = $1;", [id]);
    await pool.query("DELETE FROM categories WHERE id = $1;", [id]);
};
```

---

## 5. Routes

### GET = read, POST = change

```javascript
const gameController = require("../controllers/gameController");

// Categories
router.get("/", gameController.categoriesListGet);
router.post("/createcategory", gameController.categoryCreate);
router.get("/:categoriesId", gameController.gamesListGet);
router.post("/:categoriesId/edit", gameController.categoriesEditPost);
router.post("/:categoriesId/delete", gameController.categoryDelete);

// Games
router.get("/game/:id", gameController.gameViewGet);
router.post("/game/:id/edit", gameController.gameViewPost);
router.post("/:categoryId/addgame", gameController.gameAddtoCategoryPost);
```

> Always start route paths with `/`. Missing the slash causes "Cannot POST" errors.
> Keep route parameter names consistent — if the route says `:categoriesId`, the controller must use `req.params.categoriesId`.

### Why POST for delete?
- GET requests can be triggered by crawlers, prefetching, bookmarks, browser back button
- POST requires deliberate form submission
- Rule: GET is safe (no side effects), POST is for actions that change data

---

## 6. Controllers

### Basic pattern
```javascript
exports.categoriesListGet = async (req, res) => {
    const categories = await db.getAllCategories();
    res.render("index", { categories });
};
```

### With validation (array export pattern)
```javascript
exports.categoryCreate = [
    body("categories_title").trim()
        .isLength({ min: 1, max: 30 }).withMessage("Required, max 30 chars"),
    body("description").trim()
        .isLength({ min: 1, max: 200 }).withMessage("Required, max 200 chars"),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render("index", {
                errors: errors.array(),
            });
        }
        const { categories_title, description } = matchedData(req);
        await db.addCategory({ categories_title, description });
        res.redirect("/");
    }
];
```

### Common gotchas
- Validators must be in the array, not nested in another array
- `isAlpha()` rejects spaces — "Action Games" would fail. Use `isLength()` instead
- Always `await` database calls before redirecting
- When re-rendering on validation error, pass ALL variables the template needs
- `res.redirect("/:id")` is literal — use `res.redirect("/" + id)` for actual values

### Validation reference
```javascript
body("field").trim().isLength({ min: 1, max: 30 })     // text length
body("price").isFloat({ min: 0.01 })                    // positive decimal
body("category_id").isInt({ min: 1 })                   // positive integer
```

> Full list: https://github.com/validatorjs/validator.js#validators

---

## 7. EJS Templates

### Passing data to templates
```javascript
// Controller — pass the whole object when the template needs multiple properties
res.render("game-list", {
    categoryId: categoryId,
    category: categoryInfo.categories_title,
    description: categoryInfo.description,
    games: gamesinCategory
});
```

### Looping
```html
<ul>
    <% games.forEach(game => { %>
        <li><%= game.game_title %>, <%= game.game_price %></li>
    <% }) %>
</ul>
```

### Forms — always use leading `/` in action
```html
<!-- Adding a game to a specific category -->
<form action="/<%= categoryId %>/addgame" method="POST">
    <input type="text" name="game_title" required>
    <input type="number" name="game_price" step="0.01" required>
    <button type="submit">Add Game</button>
</form>
```

> Without the leading `/`, the path appends to the current URL: `/game/game/1/edit` instead of `/game/1/edit`

### Dropdown with pre-selected value
```html
<select name="category_id" required>
    <% categories.forEach(cat => { %>
        <option value="<%= cat.id %>"
            <%= cat.id === game.category_id ? 'selected' : '' %>>
            <%= cat.categories_title %>
        </option>
    <% }) %>
</select>
```

### Delete with confirmation
```html
<form action="/<%= categoryId %>/delete" method="POST"
      onsubmit="return confirm('Are you sure? Games will become uncategorized.')">
    <button type="submit">Delete Category</button>
</form>
```

### Hidden input (pass data without showing it)
```html
<input type="hidden" name="category_id" value="<%= category.id %>">
```

---

## 8. Seed Script (populatedb.js)

```javascript
const { Client } = require("pg");
require("dotenv").config();

const SQL = `
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    categories_title VARCHAR(255),
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    game_title VARCHAR(255),
    game_price DECIMAL(10,2),
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
        connectionString: process.argv[2] || process.env.DATABASE_URL,
    });
    await client.connect();
    await client.query(SQL);
    await client.end();
    console.log("done");
}

main();
```

> `DROP TABLE` ensures clean ids starting at 1. Drop `items` first because it references `categories`.

### Run locally
```bash
node data/populatedb.js
```

### Run against production (Neon)
```bash
node data/populatedb.js "your-neon-connection-string"
```

---

## 9. PostgreSQL Local Setup

### Useful psql commands
```
\c database_name          -- connect to a database
\dt                       -- list all tables
\d table_name             -- show table structure
\dp table_name            -- show access privileges
\du                       -- list all users/roles
```

### Granting permissions
```sql
GRANT ALL ON SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
ALTER TABLE items OWNER TO your_user;
ALTER TABLE categories OWNER TO your_user;
```

### Resetting a password
```sql
ALTER USER your_user WITH PASSWORD 'new_password';
```

> You cannot view existing passwords — only reset them.

### GUI tools
- **pgAdmin** — official, free, web-based (pgadmin.org)
- **TablePlus** — lightweight, Mac-native (tableplus.com)
- **DBeaver** — free, multi-database (dbeaver.io)
- **Postico** — simple, Mac-native (eggerapps.at/postico2)

---

## 10. Deploy to Neon + Render

### Step 1 — Set up Neon (hosted PostgreSQL)

1. Go to [neon.tech](https://neon.tech), sign up with GitHub
2. Click **Create Project**, name it (e.g. `inventory-app`)
3. Copy the connection string:
   ```
   postgresql://user:pass@ep-something.neon.tech/neondb?sslmode=require
   ```
4. Seed the production database:
   ```bash
   node data/populatedb.js "your-neon-connection-string"
   ```

> Local database name (`inventory-app-db`) and Neon name (`neondb`) don't need to match.

### Step 2 — Push to GitHub

```bash
# Make sure .gitignore is in place first
git init
git add .
git commit -m "initial commit"
git remote add origin your-github-repo-url
git push -u origin main
```

### Step 3 — Set up Render

1. Go to [render.com](https://render.com), sign in with GitHub
2. **New → Web Service**, select your repo
3. Settings:
   - **Branch:** main
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node app.js`
   - **Instance Type:** Free
4. Add environment variable:
   - Key: `DATABASE_URL`
   - Value: your Neon connection string

### How it works
```
VS Code → git push → GitHub → auto-deploy → Render
                                                ↓
                                         reads DATABASE_URL
                                                ↓
                                        connects to Neon DB
```

- Locally: `DATABASE_URL` points to localhost Postgres
- On Render: `DATABASE_URL` points to Neon
- Same code, different env var values

### Render reminders
- Free tier sleeps after ~15 min idle; first load takes 30–60s
- Redeploying causes brief downtime on free tier
- Check **build logs** for deploy failures, **application logs** for runtime errors

---

## 11. Quick Reference — Common Errors

| Error | Cause | Fix |
|---|---|---|
| `permission denied for table` | DB user lacks privileges | `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO user;` |
| `invalid input syntax for type integer: "NaN"` | Route param name mismatch | Make sure `req.params.name` matches `:name` in route |
| `argument handler must be a function` | Typo in controller name or missing export | Check the exact function name in your controller |
| `Cannot POST /path` | Missing route or wrong method | Ensure `router.post()` exists with leading `/` |
| `category is not defined` (in EJS) | Not passing variable to `res.render()` | Include all needed variables, especially on error re-render |
| `insert violates foreign key constraint` | Referenced id doesn't exist | Drop and recreate tables, or use existing ids |
| `must be owner of table` | Different user created the table | `ALTER TABLE name OWNER TO your_user;` |
| `does not support SSL connections` | Local Postgres with SSL config | Remove SSL option or let connection string handle it |
| Double paths like `/game/game/1` | Missing leading `/` in href or action | Always use absolute paths: `/game/1` not `game/1` |

---

## 12. VS Code Shortcuts (Mac)

| Shortcut | Action |
|---|---|
| `Option + Z` | Toggle word wrap (show long lines wrapped) |
