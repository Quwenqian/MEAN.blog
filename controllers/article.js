/*!
 * 博客文章相关控制器
 */

const co = require("co");
const fs = require("fs");
const del = require("del");
const path = require("path");
const crypto = require("crypto");
const multer  = require("multer");
const shortid = require("shortid");
const config = require("../config");
const Article = require("../models/article");
const UploadedResource = Article.UploadedResource;

// 休眠工具函数，用于模拟阻塞
const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

// 文件读取Promise包装
const readFile = filePath => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
};

// 文件重命名Promise包装
const rename = (oldPath, newPath) => {
    return new Promise((resolve, reject) => {
        fs.rename(oldPath, newPath, err =>{
            if (err) reject(err);
            resolve(newPath);
        });
    });
};

// 文件上传相关配置
const storage = multer.diskStorage({
    // 文件上传路径
    destination: path.join(__dirname, "../public/uploads/"),
    // 文件命名
    filename: (req, file, cb) => {
        // 获取文件扩展名
        let ext = "." + file.originalname.split(".").pop().toLowerCase();
        cb(null, shortid.generate() + ext);
    }
});

const upload = multer({
    // 存储路径与文件名配置
    storage,
    // 上传限制配置
    limits: {
        // 文件大小限制（5M）
        fileSize: 1024 * 1024 * 5
    }
});

// 创建一条新的上传资源文档
const createUploadedResource = (file, url, ext) => {
    let ur = new UploadedResource({
        name: file.originalname,
        size: file.size,
        path: file.path,
        url: url,
        filename: file.filename,
        mimetype: file.mimetype,
        extension: ext,
        description: "文章中用户本地上传的图片"
    });
    return ur.save();
};

// 查找资源引用
const findResourceReference = content => {
    let ref = /!\[(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*\]\(\s*<?([\s\S]*?)>?(?:\s+['"][\s\S]*?['"])?\s*\)/gi;
    let http = /^https?:\/\//i;
    let refs = [];
    while (true) {
        let m = ref.exec(content);
        if (m == null) break;
        if ( !http.test(m[1]) ) refs.push(m[1]);
    }

    return [...new Set(refs)];
};

// 更新引用
// 更新引用的三种方式逻辑解释：
// 1.只newContent，oldContent为空时为递增引用操作
// 2.只传递oldContent，newContent为空时为递减引用操作
// 3.同时传递newContent与oldContent时将比较差值进行相应的递增与递减操作
const updateReference = (newContent, oldContent) => {
    if (!newContent && !oldContent) return;

    let inc = [], dec = [];
    if (newContent && !oldContent) {
        inc = findResourceReference(newContent);
    } else if (!newContent && oldContent) {
        dec = findResourceReference(oldContent);
    } else if (newContent && oldContent) {
        let newRef = findResourceReference(newContent);
        let oldRef = findResourceReference(oldContent);

        // 过滤出新增的引用
        inc = newRef.filter(v => oldRef.indexOf(v) === -1);

        // 过滤出删除的引用
        dec = oldRef.filter(v => newRef.indexOf(v) === -1);
    }

    return co(function*() {
        // 递增引用
        if (inc.length > 0) {
            yield UploadedResource.referenceIncrement({ url: {$in: inc} });
        }

        // 递减引用
        if (dec.length > 0) {
            yield UploadedResource.referenceDecrement({ url: {$in: dec} });
        }

        // 删除文件与引用文档
        let expires = yield UploadedResource.getExpired();
        expires = expires.map(v => v.path);

        // #!这里可能存在时差问题
        yield del(expires);
        yield UploadedResource.delExpired();
    })
};

module.exports = {

    // 获取文章列表
    list (req, res, next) {
        co(function*() {
            let page = parseInt(req.query.page) || 1;
            let pageSize = parseInt(req.query.pageSize) || 10;

            if (page < 1 || pageSize < 1) {
                return res.status(422).json({error : "无效参数"});
            }

            // 根据关键字搜索参数相关文章
            let filter = {sort: {_id: -1}};
            if (req.query.keywords && req.query.keywords.trim()) {

                // 正则匹配形式搜索
                let kw = req.query.keywords.trim().split(" ").join("|");
                let re = new RegExp(kw, "i");
                filter.query = {
                    $or : [
                        {author : re},
                        {title : re},
                        {content : re}
                    ]
                }
            }

            let count = yield Article.total(filter);
            let pageTotal = Math.ceil(count / pageSize);

            if (count < 1) {
                if (config.resMode == "html") return res.render(
                    req.route.path === "/articles" ? "list" : "index",
                    {pageTotal, articles : [], keywords : ""}
                );

                return res.json({pageTotal, articles : [], keywords : ""});
            }

            if (page > pageTotal) {
                return res.status(422).json({error : "无效参数"});
            }

            let tmp = {
                pageTotal,
                keywords : req.query.keywords ? req.query.keywords.trim() : "",
                articles : yield Article.list(page, pageSize, filter)
            };

            if (config.resMode == "html") return res.render(
                req.route.path === "/articles" ? "list" : "index",
                tmp
            );

            return res.json(tmp);
        }).catch((error) => {
            res.json({error});
        });
    },

    // 获取指定ID的文章
    getById (req, res, next) {
        co(function*() {
            let docs = yield {
                current : Article.getById(req.params.id),
                pn : Article.getPrevNextById(req.params.id)
            };

            let ret = Object.assign(docs.current, docs.pn);
            if (config.resMode == "html") return res.render("article", ret);

            return res.json(ret);
        }).catch((error) => {
            res.status(404).json({error});
        });
    },

    // 添加文章
    add (req, res, next) {

        // 实例化数据模型
        let article = new Article({
            title : req.body.title.trim(),
            author : req.body.author.trim(),
            content : req.body.content.trim()
        });

        // 保存
        co(function*() {
            let ret = yield article.save();
            yield updateReference(article.content);
            res.json(ret);
        }).catch((error) => {
            res.status(500).json({error});
        });
    },

    // 删除指定ID的文章
    remove (req, res, next) {
        co(function*() {
            let ret = yield Article.del(req.params.id);
            yield updateReference(null, ret.content);
            res.json({});
        }).catch((error) => {
            res.status(500).json({error});
        });
    },

    // 图片文件上传
    upload (req, res, next) {
        upload.single("editormd-image-file")(req, res, err => {
            let ret = { success: 1, message: "上传成功", url: "" };

            // 上传失败
            if (err) {
                ret.success = 0;
                ret.message = "文件上传失败，" + err;
                return res.status(500).json(ret);
            }

            // 上传成功
            co(function*() {
                // 获取文件扩展名
                let ext = "." + req.file.originalname.split(".").pop().toLowerCase();
                // 获取文件hash值
                let file = yield readFile(req.file.path);
                let md5 = crypto.createHash("md5").update(file).digest("hex");
                let newName = md5 + ext;

                // 用文件hash值来重命名文件
                yield rename(req.file.path, req.file.destination + newName);
                ret.url = "/uploads/" + newName;

                // 创建一个新的资源记录
                req.file.filename = newName;
                req.file.path = req.file.destination + newName;
                yield createUploadedResource(req.file, ret.url, ext.substr(1));
                res.json(ret);
            }).catch(error => {
                ret.success = 0;
                ret.message = "文件上传失败，" + err;
                res.status(500).json(ret);
            });
        });
    }
};