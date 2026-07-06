const db = require("../data/queries");
const { body, validationResult, matchedData } = require("express-validator");




exports.categoriesListGet = async (req,res)=>{
    console.log("cateogirelist get controller rendering the index")
    const categories = await db.getAllCategories();
    res.render("index",{categories: categories});
}

exports.gamesListGet = async (req,res)=>{
    console.log("gamesListGet fetching the game")
    const categoryId = Number(req.params.categoriesId);
    console.log("id is", categoryId)
    const categoryInfo =await db.getSpecificCategoryInfo(categoryId);
    const gamesinCategory = await db.getGamesofCategory(categoryId); 
    res.render("game-list",{categoryId : categoryId, category: categoryInfo.categories_title, description : categoryInfo.description, games:gamesinCategory});
}


exports.categoryCreate = [
    body("categories_title").trim()
        .isLength({ min: 1, max: 30 }).withMessage(`Required max 30 chars`),
    body("description").trim()
        .isLength({ min: 1, max: 200 }).withMessage(`Required max 200 chars`),
    async (req,res)=>{
    console.log("creatign new category")


    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("index", {
        errors: errors.array(),
      });
    }
    const { categories_title, description  } = matchedData(req);
    await db.addCategory({ categories_title, description  });
    res.redirect("/");
}]

exports.categoriesEditGet = async (req,res)=>{
    console.log("categoriesEditGet controller")
    const id = Number(req.params.categoriesId)

    const category = await db.getSpecificCategoryInfo(id);
    res.render("edit-category",{category:category});
}

exports.categoriesEditPost = 
    [
    body("categories_title").trim()
    .isLength({ min: 1, max: 30 }).withMessage(`Required max 30 chars`),
    body("description").trim()
    .isLength({ min: 1, max: 200 }).withMessage(`Required max 200 chars`),

    async (req,res)=>{
    console.log("editing category")
    const id=Number(req.params.categoriesId)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const category = await db.getSpecificCategoryInfo(id)
        return res.status(400).render("edit-category", {
            errors: errors.array(),
            category:category,
        });
    }
    const { categories_title, description  } = matchedData(req);
    await db.editCategory(id, categories_title, description  );
    res.redirect("/");
}]

exports.gameAddtoCategoryPost = 
    [
    body("game_title").trim()
    .isLength({ min: 1, max: 30 }).withMessage(`Required max 30 chars`),
    body("game_price").trim()
    .isFloat({min:0.01}).withMessage(`Price must be psitive mumber`),

    async (req,res)=>{
    const categoryId = Number(req.params.categoryId)
    console.log("category id is", categoryId)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const category = await db.getSpecificCategoryInfo(categoryId)
        return res.status(400).render("game-list", {
            errors: errors.array(),
            category:category,
        });
    }
    const { game_title, game_price  } = matchedData(req);
    console.log(game_title,game_price,categoryId)
    await db.addGame({category_id: categoryId, game_title : game_title, game_price : game_price}  );
    res.redirect("/"+categoryId);
}]


exports.gameViewGet = async (req,res)=>{
    console.log("gameviewget controller")
    const id = Number(req.params.id)

    const game = await db.getSpecificGameInfo(id);
    const categories = await db.getAllCategories();
    res.render("game-view",{game:game, categories:categories});
}

exports.gameViewPost = 
    [
    body("game_title").trim()
    .isLength({ min: 1, max: 30 }).withMessage(`Required max 30 chars`),
    body("game_price").trim()
    .isFloat({min:0.01}).withMessage(`Price must be psitive mumber`),
    body("category_id").isInt({ min: 1 }).withMessage("Must select a category"),


    async (req,res)=>{
    const gameId = Number(req.params.id)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const game = await db.getSpecificGameInfo(gameId)
        return res.status(400).render("game-view", {
            errors: errors.array(),
            game:game,
        });
    }
    const { game_title, game_price, category_id } = matchedData(req);
    await db.editGame(gameId, game_title, game_price, category_id );
    res.redirect("/");
}]


exports.categoryDelete = async (req,res)=>{
    console.log("categoryDelete dleting category")
    const categoryId = Number(req.params.categoriesId);
    console.log("id to be deleted is", categoryId)
    await db.deleteCategory(categoryId);
    const categories = await db.getAllCategories();
    res.render("index",{categories: categories});
}

