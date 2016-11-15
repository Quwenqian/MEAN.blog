/*!
 * 配置文件
 */

module.exports = {

    // 服务器配置参数
    host: "localhost",
    port: 80,

    // 数据库配置参数
    db: {
        host: "localhost",
        port: 27017,
        username: "",
        password: "",
        uri: "mongodb://localhost:27017/blog"
    },

    // 响应模式
    // String - json: 返回json数据，html: 返回html页面
    resMode: "json"
};