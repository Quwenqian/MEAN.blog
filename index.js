/*!
 * 入口文件
 */

const express = require("express");
const favicon = require("serve-favicon");
const logger = require("morgan");
// const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const config = require("./config");
const routes = require("./routes/routes");
const app = express();
const pkg = require("./package.json");

// 导入模板引擎工具中间件
const helper = require("./helpers/view-helpers");

// 配置模板引擎
app.engine("html", ejs.__express);
app.set("views", "./views");
app.set("view engine", "html");

// 配置中间件
app.use(favicon(__dirname + "/public/favicon.ico"));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());

// 静态文件目录
app.use(express.static(__dirname + "/public"));

// 配置模板引擎工具中间件
app.use(helper());

// 配置路由
app.use(routes);

// 404处理
app.use(function(req, res, next) {
    res.status(404).json({error: "Not Found"});
});

// 错误处理
app.use(function(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    console.error(err.stack);
    res.status(500).json({error: "Internal Server Error"});
});

/* istanbul ignore next */
if (!module.parent) {
    app.listen(config.port, function () {
        console.log(`${pkg.name} Server Running at http://${config.host}:${config.port}`);
    });
}