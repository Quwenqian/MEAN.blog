/*!
 * 主路由文件
 */

const express = require("express");
const router = express.Router();
const article = require("../controllers/article");

// 配置博客文章相关路由
// 主页
router.get("/", article.list);

// 创建文章
router.route("/add")
    .get((req, res, next) => {
        res.render("write", {});
    })
    .post(article.add);
router.post("/articles", article.add);

// 文章列表
router.get("/articles", article.list);

// 指定文章
router.route("/articles/:id")
    .get(article.getById)
    .delete(article.remove);

// 删除指定文章（GET方式）
router.get("/articles/:id/do-remove", article.remove);

// 文件上传处理
router.post("/upload", article.upload);

module.exports = router;