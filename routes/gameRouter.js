// routes/gameRouter.js

const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");

router.get("/", gameController.categoriesListGet)

//Categories routers
router.get("/:categoriesId", gameController.gamesListGet)
router.post("/createcategory",gameController.categoryCreate)
router.get("/:categoriesId/edit",gameController.categoriesEditGet)
router.post("/:categoriesId/edit",gameController.categoriesEditPost)
router.post("/:categoriesId/delete",gameController.categoryDelete)

//Games Router
router.get("/game/:id", gameController.gameViewGet)
router.post("/game/:id/edit",gameController.gameViewPost)
router.post("/:categoryId/addgame",gameController.gameAddtoCategoryPost)

module.exports = router;
