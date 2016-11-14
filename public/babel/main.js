/*!
 * 博客首页脚本
 */

angular.module("blog", ["ngAnimate", "ui.router", "angular-loading-bar"])

    .config([
        "$stateProvider",
        "$urlRouterProvider",
        "cfpLoadingBarProvider",
        function ($stateProvider, $urlRouterProvider, cfpLoadingBarProvider) {

            // 路由相关配置
            // 主页
            $stateProvider.state("home", {
                url : "/?page&pageSize&keywords",
                templateUrl : "templates/home.html",
                controller : "HomeController",
                resolve : {
                    articles : ["Articles", "$stateParams", function (Articles, $stateParams) {
                        return Articles.find($stateParams);
                    }]
                }
            })

            // 文章列表
            .state("list", {
                url : "/articles?page&pageSize&keywords",
                templateUrl : "templates/list.html",
                controller : "ListController",
                resolve : {
                    articles : ["Articles", "$stateParams", function (Articles, $stateParams) {
                        return Articles.find($stateParams);
                    }]
                }
            })

            // 文章发布/编辑
            .state("edit", {
                url : "/edit",
                templateUrl : "templates/edit.html",
                controller : "EditController"
            })

            // 文章详情
            .state("article", {
                url : "/articles/:id",
                templateUrl : "templates/article.html",
                controller : "ArticleController",
                resolve : {
                    article : ["Articles", "$stateParams", function (Articles, $stateParams) {
                        return Articles.getById($stateParams.id);
                    }]
                }
            });

            // 其它地址转到主页
            $urlRouterProvider.otherwise("/");

            // 加载进度条配置
            // 不显示菊花
            cfpLoadingBarProvider.includeSpinner = false;

            // 对话框默认配置
            swal.setDefaults({
                type: "question",
                confirmButtonText: "确认",
                cancelButtonText: "取消",
                confirmButtonColor: "#0085a1"
            });
        }
    ])

    // 相关服务
    // 文章资源服务
    .factory("Articles", ["$http", function ($http) {
        let baseUrl = "/articles";
        return {

            // 获取相关文章
            find(filter = {}) {
                return $http.get(baseUrl, {params : filter}).then(function (res) {
                    return res.data;
                });
            },

            // 根据指定ID获取文章
            getById(id) {
                let url = baseUrl + "/" + id;
                return $http.get(url).then(function (res) {
                    return res.data;
                });
            },

            // 保存文章
            save(article) {
                return $http.post(baseUrl, article);
            },

            // 删除指定ID文章
            remove(id) {
                let url = baseUrl + "/" + id;
                return $http.delete(url);
            }
        };
    }])

    // Markdown生成HTML
    .factory("Markdown", ["$filter", "$state", function ($filter, $state) {
        let tempId = "temp-" + Date.now();
        let $temp = null;
        let $ret = angular.element("<div></div>");

        // 解析Markdown到HTML
        let parseTo = (id, md) => {
            return editormd.markdownToHTML(id, {
                markdown: md,
                htmlDecode: "style,script|on*",
                tocm: true,
                emoji: true,
                taskList: true,
                tex: true,
                flowChart: true,
                autoLoadKaTeX: false,
                sequenceDiagram: true,
                markdownSourceCode: false,
                previewCodeHighlight: true
            }).find('a[href^="#"]').attr("href", function (i, val) {
                // 替换文章中的锚链接为UI-Router生成的链接
                return $state.href("article", {"#" : val.substr(1) });
            });
        };

        let parse = md => {
            if (!$temp) {
                $temp = angular.element('<div id="' + tempId + '"></div>');
                $temp.hide().appendTo(document.head);
            }

            $temp.empty();
            parseTo(tempId, md);
            return $temp;
        };

        return {
            // 将Markdown转换成HTML并渲染到指定ID的DOM
            render(id, md = "") {
                return parseTo(id, md);
            },

            // 生成文章摘要
            summary(md = "", plainText = true, len = 72) {
                $temp = parse(md);
                if ( plainText ) {
                    let ret = $filter("ellipsis")($temp.text(), len);
                    $temp.empty();
                    return ret;
                }

                $ret.empty();
                // 文章摘要显示逻辑说明：
                // 第一行将显示文章中找到的第一张图片或嵌入内容（如网络视频）
                // 第二行将显示文章中找到的第一段标题块（h1-h6）
                // 第三行将显示文章中的第一段段落文字（p）
                $ret.append($temp.find("p:has(img),iframe")[0]);
                $ret.append($temp.children(":header")[0]);
                $ret.append($temp.children("p").not(":has(img)")[0]);

                if ($ret.length < 1) {
                    $ret.append("<div>" + $filter("ellipsis")($temp.text(), 90) + "</div>");
                }

                $temp.empty();
                return $ret.html();
            }
        };
    }])

    // 文本截断
    .filter("ellipsis", [function () {
        return function (input, chars, breakOnWord = false) {
            if (isNaN(chars)) return input;
            if (chars <= 0) return "";
            if (input && input.length > chars) {
                input = input.substring(0, chars);

                if (!breakOnWord) {
                    var lastspace = input.lastIndexOf(" ");

                    if (lastspace !== -1) {
                        input = input.substr(0, lastspace);
                    }
                }else{
                    while(input.charAt(input.length-1) === " "){
                        input = input.substr(0, input.length -1);
                    }
                }
                return input + "…";
            }
            return input;
        };
    }])

    // 分页组件
    .directive("pager", ["$stateParams", function ($stateParams) {
        return {
            restrict : "EA",
            scope : {
                total : "="
            },
            templateUrl : "/templates/pager.html",
            link: function (scope, element, attrs) {
                scope.page = parseInt($stateParams.page || 1);
                scope.prev = scope.page - 1;
                scope.next = scope.page + 1;
                scope.pages = Object.keys(".".repeat(scope.total + 1)).splice(1);

                // 是否显示分页数字列表
                scope.showNumber = attrs.showNumber !== "false";
            }
        }
    }])

    // 相关控制器：
    // 主页
    .controller("HomeController", ["$rootScope", "$scope", "articles", "Markdown", "$sce", function ($rootScope, $scope, articles, Markdown, $sce) {
        $rootScope.title = "主页";
        $rootScope.keywords = articles.keywords;
        $scope.pageTotal = articles.pageTotal;
        $scope.articles = articles.articles;

        // 获取文章摘要
        $scope.getSummary = function (content) {
            return $sce.trustAsHtml(Markdown.summary(content, false));
        }
    }])

    // 文章列表
    .controller("ListController", ["$rootScope", "$scope", "articles", "Articles", "Markdown", function ($rootScope, $scope, articles, Articles, Markdown) {
        $rootScope.title = "文章列表";
        $rootScope.keywords = articles.keywords;
        $scope.pageTotal = articles.pageTotal;
        $scope.articles = articles.articles;
        $scope.getSummary = function (content) {
            return Markdown.summary(content);
        };

        // 删除文章
        $scope.remove = function (index) {
            let id = $scope.articles[index]._id;
            swal({
                title: "确认要删除吗？",
                text: "删除后您将无法恢复该文章！",
                type: "warning",
                confirmButtonColor: "#d33",
                confirmButtonText: "确认删除",
                showCancelButton: true,
                showLoaderOnConfirm: true,
                allowOutsideClick: false,
                preConfirm: function() {
                    return new Promise(function(resolve, reject) {
                        Articles.remove(id).then(resolve, function (res) {
                            // 出错
                            swal({
                                title: "删除失败",
                                type: "error",
                                text: "哦哦~~出了点问题，请稍后再试吧！",
                                confirmButtonText: "知道了"
                            });
                            reject();
                        });
                    });
                }
            }).then(function() {
                $scope.articles.splice(index, 1);
                $scope.$apply();
            });
        }
    }])

    // 文章发布/编辑
    .controller("EditController", ["$rootScope", "$scope", "Articles", "$state", function ($rootScope, $scope, Articles, $state) {
        $rootScope.title = "文章发布";
        $scope.article = {};

        // 配置Editor.md编辑器
        let editor = editormd("editormd", {
            path: "lib/editor.md/lib/",
            height: 480,
            // theme: "dark",
            editorTheme: "monokai",
            previewTheme: "dark",
            imageUpload: true,
            imageFormats: ["jpg", "jpeg", "gif", "png", "bmp", "webp"],
            imageUploadURL: "/upload",
            htmlDecode: "style,script|on*",
            placeholder: "使用 Markdown 编辑你的文章吧...",
            onchange: function () {
                $scope.articleForm.content.$setViewValue(this.getMarkdown());
            }
        });

        // 提交文章
        $scope.submitArticle = function () {
            $scope.articleForm.$pending = true;

            Articles.save($scope.article).then(function (res) {
                // 成功
                swal({
                    title: "发布成功",
                    type: "success",
                    text: "文章已成功发布，您需要查看这篇文章吗？",
                    confirmButtonText: "查看该文章",
                    showCancelButton: true
                }).then(function() {
                    // 跳转到刚发布的这篇文章详情页面
                    $state.go("article", {id: res.data._id});
                });
            }, function (res) {
                // 出错
                swal({
                    title: "发布失败",
                    type: "error",
                    text: "哦哦~~出了点问题，请稍后再试吧！",
                    confirmButtonText: "知道了"
                });
            }).finally(function () {
                $scope.articleForm.$pending = false;
            });
        }
    }])

    // 文章详情
    .controller("ArticleController", ["$rootScope", "$scope", "article", "Markdown", function ($rootScope, $scope, article, Markdown) {
        $rootScope.title = article.title;
        $scope.article = article;
        $scope.article.summary = Markdown.summary($scope.article.content);
        Markdown.render("article-content", $scope.article.content);
    }])
    
    // 文章搜索
    .controller("NavController", ["$rootScope", "$scope", "$state", function ($rootScope, $scope, $state) {
        $scope.search = function () {
            $state.go("list", {
                page : null,
                keywords : $scope.keywords,
                pageSize : $state.params.pageSize
            });
        };

        // 非搜索跳转时清除搜索关键字
        $rootScope.$on("$stateChangeStart", function (event, toState, toParams) {
            $scope.keywords = toParams.keywords;
        });
    }])

    .run(["$rootScope", "$anchorScroll", "$timeout", function ($rootScope, $anchorScroll, $timeout) {
        // 修正初始加载时的锚链接定位
        $rootScope.$on("$stateChangeSuccess", function () {
            $timeout($anchorScroll, 800);
        });
    }]);