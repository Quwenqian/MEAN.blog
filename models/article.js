/*!
 * 文章数据模型文件
 */

const mongoose = require("mongoose");
// const shortid = require("shortid");
const mai = require("mongoose-auto-increment");
const co = require("co");
const config = require("../config");

// 连接MongoDB数据库
const connection = mongoose.connect(config.db.uri);

// 初始化ID自增插件
mai.initialize(connection);

// 定义文章数据结构
const ArticleSchema = mongoose.Schema({
    // _id: {
    //     type: String,
    //     default: shortid.generate
    // },
    title: String,
    author: String,
    content: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 定义文章数据模型相关方法：
ArticleSchema.statics = {
    // 获取文章列表
    list (page = 1, pageSize = 10, filter = {}) {
        let skip = page < 1 ? 0 : (page - 1) * pageSize;
        let q = filter.query || {};
        let pro = filter.pro || {};
        let sort = filter.sort || {};
        let query = this.find(q, pro).sort(sort).skip(skip).limit(pageSize);
        return co(function*(query) {
            return yield query.exec();
        }, query);
     },

    // 获取文章数量
    total (filter = {}) {
        return co(function*(_this, q) {
            return yield _this.count(q).exec();
        }, this, filter.query || {});
    },

    // 获取指定ID的文章
    getById (_id) {
        return co(function*(_this) {
            return yield _this.findOne({_id}).lean().exec();
        }, this);
    },

    // 获取指定ID文章的上一条与下一条文章的ID
    getPrevNextById (_id) {
        return co(function*(_this) {
            return yield {
                prev: _this.find().lt("_id", _id).sort({_id: -1}).findOne().lean().exec(),
                next: _this.find().gt("_id", _id).sort({_id: 1}).findOne().lean().exec()
            };
        }, this);
    },

    // 删除指定ID的文章
    del (_id) {
        return this.remove({_id}).exec();
    }
 };

// 创建文章数据模型构造函数
ArticleSchema.plugin(mai.plugin, "Article");
const Article = connection.model("Article", ArticleSchema);

module.exports = Article;