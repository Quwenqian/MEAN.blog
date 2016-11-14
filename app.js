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

app.listen(config.port, function () {
    console.log(`App Server listen at http://${config.host}:${config.port}`);
});