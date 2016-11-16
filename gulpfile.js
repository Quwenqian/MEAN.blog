/*!
 * Gulp配置文件
 */

"use strict";

const gulp = require("gulp");
const del = require("del");
const runSequence = require("run-sequence");
const browserSync = require("browser-sync");
const gulpLoadPlugins = require("gulp-load-plugins");
const pkg = require("./package.json");

const $ = gulpLoadPlugins();
const reload = browserSync.reload;


// 样式处理
gulp.task("styles", () => {
    const AUTOPREFIXER_BROWSERS = [
        "ie >= 10",
        "ie_mob >= 10",
        "ff >= 30",
        "chrome >= 34",
        "safari >= 7",
        "opera >= 23",
        "ios >= 7",
        "android >= 4.4",
        "bb >= 10"
    ];

    return gulp.src(["./public/scss/*.scss"])
        .pipe($.changed("./public/css"))
        .pipe($.sass.sync({
            precision: 10,
            outputStyle: "expanded"
        }).on("error", $.sass.logError))
        .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(gulp.dest("./public/css"))
        .pipe(browserSync.stream());
});

// 脚本处理
gulp.task("scripts", () => {
    return gulp.src(["./public/babel/*.js"])
        .pipe($.changed("./public/js"))
        .pipe($.babel())
        .pipe(gulp.dest("./public/js"))
        .pipe(browserSync.stream());
});

// 同步服务
gulp.task("serve", ["scripts", "styles", "nodemon"], () => {
    browserSync({
        port: 8000,
        notify: false,
        browser: "chrome",

        // 静态文件服务器
        // server: {
        //     baseDir: ["public"]
        // },

        // 服务器代理
        // files: ["public/**/*.*"],
        proxy: "http://localhost"
    });

    gulp.watch(["public/scss/**/*.scss"], ["styles"]);
    gulp.watch(["public/babel/**/*.js"], ["scripts"]);
    gulp.watch(["public/**/*.html", "public/img/**/*"], reload);
});

// 自动重启
gulp.task("nodemon", (cb) => {
    let started = false;

    return $.nodemon({
        script: pkg.main
    }).on("start", function () {
        if (!started) {
            cb();
            started = true;
        }
    });
});

gulp.task("default", () => {
    runSequence(["serve"]);
});