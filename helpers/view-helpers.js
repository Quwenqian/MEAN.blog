/**
 * 模板引擎工具中间件
 */

const url = require("url");
const qs = require("querystring");
const moment = require("moment");
const assign = Object.assign;

moment.locale("zh-CN");

const helper = {

    // 格式化日期
    formatDate (date) {
        return moment(date).fromNow();
    },

    // 查询参数处理
    createPagination (req) {
        return function (pageTotal = 1, opt = {}) {
            if (pageTotal <= 1) return "";

            let html = "",
                u = url.parse(req.url, true),
                page = parseInt(u.query.page) || 1,
                prevPage = page <= 1 ? false : page - 1,
                nextPage = page >= pageTotal ? false : page + 1;

            u = { pathname: u.pathname, query: u.query };

            for (let p = 1; p <= pageTotal && !opt.onlyPrevNext; ++p) {
                if (p == page) {
                    html += `<li class="active"><span>${p}</span></li>\n`;
                } else {
                    u.query.page = p;
                    // console.log(u.query.page, u);
                    html += `<li><a href="${url.format(u)}">${p}</a></li>\n`;
                }
            }

            // 上一页
            let pphtml = `<li class="disabled${opt.onlyPrevNext ? ' previous' : ''}"><span>上一页</span></li>\n`;
            if (false !== prevPage) {
                u.query.page = prevPage;
                pphtml = `<li${opt.onlyPrevNext ? ' class="previous"' : ''}><a href="${url.format(u)}">上一页</a></li>\n`;
            }

            // 下一页
            let nphtml = `<li class="disabled${opt.onlyPrevNext ? ' next' : ''}"><span>下一页</span></li>\n`;
            if (false !== nextPage) {
                u.query.page = nextPage;
                nphtml = `<li${opt.onlyPrevNext ? ' class="next"' : ''}><a href="${url.format(u)}">下一页</a></li>\n`;
            }

            return pphtml + html + nphtml;
        }
    }
};

module.exports = function () {
    return function (req, res, next) {
        assign(res.locals, helper, {URL: url.parse(req.url, true)});
        res.locals.createPagination = helper.createPagination(req);

        next();
    };
};