require("dotenv").config();           // MUST be first — before any require that reads process.env

const express = require("express");
const path = require("node:path");
const app = express();

// Middleware
app.use(express.static(path.join(__dirname, "public")));   // serve CSS/static files
app.use(express.urlencoded({ extended: true }));            // parse POST form data into req.body
app.use(express.json());                                    // parse JSON bodies

// View engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Routes
const gameRouter = require("./routes/gameRouter");
app.use("/", gameRouter);

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));