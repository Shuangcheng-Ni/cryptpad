define([
    'jquery',
    '/common/diffMarked.js',
    '/bower_components/nthen/index.js',
    '/common/sframe-common.js',
    '/common/hyperscript.js',
    '/common/sframe-app-framework.js',
    '/common/sframe-common-codemirror.js',
    '/common/common-interface.js',
    '/common/common-util.js',
    '/common/common-hash.js',
    '/code/markers.js',
    '/common/visible.js',
    '/common/TypingTests.js',
    '/customize/messages.js',
    'cm/lib/codemirror',


    'css!cm/lib/codemirror.css',
    'css!cm/addon/dialog/dialog.css',
    'css!cm/addon/fold/foldgutter.css',

    'cm/mode/gfm/gfm',
    'cm/addon/mode/loadmode',
    'cm/mode/meta',
    'cm/addon/mode/overlay',
    'cm/addon/mode/multiplex',
    'cm/addon/mode/simple',
    'cm/addon/edit/closebrackets',
    'cm/addon/edit/matchbrackets',
    'cm/addon/edit/trailingspace',
    'cm/addon/selection/active-line',
    'cm/addon/search/search',
    'cm/addon/search/match-highlighter',
    'cm/addon/search/searchcursor',
    'cm/addon/dialog/dialog',
    'cm/addon/fold/foldcode',
    'cm/addon/fold/foldgutter',
    'cm/addon/fold/brace-fold',
    'cm/addon/fold/xml-fold',
    'cm/addon/fold/markdown-fold',
    'cm/addon/fold/comment-fold',
    'cm/addon/display/placeholder',

    'css!/customize/src/print.css',
    'less!/code/app-code.less'

], function (
    $,
    DiffMd,
    nThen,
    SFCommon,
    h,
    Framework,
    SFCodeMirror,
    UI,
    Util,
    Hash,
    Markers,
    Visible,
    TypingTest,
    Messages,
    CMeditor) {
    window.CodeMirror = CMeditor;

    var MEDIA_TAG_MODES = Object.freeze([
        'markdown',
        'gfm',
        'html',
        'asciidoc',
        'htmlembedded',
        'htmlmixed',
        'index.html',
        'php',
        'velocity',
        'xml',
    ]);

    //预览页面换行输出
    var wrTextBr = function ($preview, text_string) {
        $preview.empty();
        string_array = text_string.split("\n");
        string_array.forEach(function (element) {
            $preview.append($("<p>").text(element));
        })
    }



    // 创建主题切换按钮
    var mkThemeButton = function (framework) {
        var $theme = $(h('button.cp-toolbar-appmenu', [
            h('i.cptools.cptools-palette'),
            h('span.cp-button-name', Messages.toolbar_theme)
        ]));
        var $content = $(h('div.cp-toolbar-drawer-content', {
            tabindex: 1
        })).hide();

        // set up all the necessary events
        UI.createDrawer($theme, $content);

        framework._.toolbar.$theme = $content;
        framework._.toolbar.$bottomL.append($theme);
    };

    // 创建按作者着色的按钮
    var mkCbaButton = function (framework, markers) {
        var $showAuthorColorsButton = framework._.sfCommon.createButton('', true, {
            text: Messages.cba_hide,
            name: 'authormarks',
            icon: 'fa-paint-brush',
        }).hide();
        framework._.toolbar.$theme.append($showAuthorColorsButton);
        markers.setButton($showAuthorColorsButton);
    };
    // 创建打印按钮
    var mkPrintButton = function (framework, $content, $print) {
        var $printButton = framework._.sfCommon.createButton('print', true);
        $printButton.click(function () {
            $print.html($content.html());
            window.focus();
            window.print();
            framework.feedback('PRINT_CODE');
        });
        framework._.toolbar.$drawer.append($printButton);
    };
    // 创建 Markdown 工具栏
    var mkMarkdownTb = function (editor, framework) {
        var $codeMirrorContainer = $('#cp-app-code-container');
        var markdownTb = framework._.sfCommon.createMarkdownToolbar(editor);
        $codeMirrorContainer.prepend(markdownTb.toolbar);

        framework._.toolbar.$bottomL.append(markdownTb.button);

        var modeChange = function (mode) {
            if (['markdown', 'gfm'].indexOf(mode) !== -1) { return void markdownTb.setState(true); }
            markdownTb.setState(false);
        };

        return {
            modeChange: modeChange
        };
    };
    // 创建帮助菜单
    var mkHelpMenu = function (framework) {
        var $codeMirrorContainer = $('#cp-app-code-container');
        var helpMenu = framework._.sfCommon.createHelpMenu(['text', 'code']);
        $codeMirrorContainer.prepend(helpMenu.menu);

        framework._.toolbar.$drawer.append(helpMenu.button);
    };
    //

    //previews:用于渲染不同格式（如Markdown、HTML、AsciiDoc）的预览功能
    var previews = {};
    previews['gfm'] = function (val, $div, common) {
        DiffMd.apply(DiffMd.render(val), $div, common);
    };
    previews['markdown'] = previews['gfm'];
    previews['htmlmixed'] = function (val, $div, common) {
        DiffMd.apply(val, $div, common);
    };
    previews['asciidoc'] = function (val, $div, common) {
        require([
            'asciidoctor',
            '/lib/highlight/highlight.pack.js',
            'css!/lib/highlight/styles/' + (window.CryptPad_theme === 'dark' ? 'dark.css' : 'github.css')
        ], function (asciidoctor) {
            var reg = asciidoctor.Extensions.create();
            var Highlight = window.hljs;

            reg.inlineMacro('media-tag', function () {
                var t = this;
                t.process(function (parent, target) {
                    var d = target.split('|');
                    return t.createInline(parent, 'quoted', `<media-tag src="${d[0]}" data-crypto-key="${d[1]}"></media-tag>`).convert();
                });
            });

            var html = asciidoctor.convert(val, { attributes: 'showtitle', extension_registry: reg });

            DiffMd.apply(html, $div, common);
            $div.find('pre code').each(function (i, el) {
                Highlight.highlightBlock(el);
            });
        });
    };



    // 创建预览面板
    // 编程编辑器中创建一个实时预览面板，用户可以通过点击预览按钮在编辑器和预览之间切换
    var mkPreviewPane = function (editor, CodeMirror, framework, isPresentMode) {
        var $previewContainer = $('#cp-app-code-preview');//定义一个 jQuery 对象 $previewContainer，表示预览区域的容器
        var $preview = $('#cp-app-code-preview-content');//定义一个 jQuery 对象 $preview，表示预览区域的内容。
        var $editorContainer = $('#cp-app-code-editor');//定义一个 jQuery 对象 $editorContainer，表示编辑器的容器。
        var $codeMirrorContainer = $('#cp-app-code-container');//定义一个 jQuery 对象 $codeMirrorContainer，表示 CodeMirror 编辑器的容器。
        var $codeMirror = $('.CodeMirror');//定义一个 jQuery 对象 $codeMirror，表示 CodeMirror 编辑器实例。

        //使用 jQuery 的 appendTo 方法将一个带有类名 cp-app-code-preview-empty 的图像元素添加到预览容器 $previewContainer 中。
        //图像的 src 属性指向 CryptPad 的灰色 logo。
        $('<img>', {
            src: '/customize/CryptPad_logo_grey.svg',
            alt: '',
            class: 'cp-app-code-preview-empty'
        }).appendTo($previewContainer);

        //使用 framework 对象的方法 createButton 创建一个名为 $previewButton 的预览按钮
        var $previewButton = framework._.sfCommon.createButton('preview', true);//使用 framework 对象的方法 createButton 创建一个名为 $previewButton 的预览按钮

        //强制绘制预览。首先根据 CodeMirror.highlightMode 获取对应的预览函数，如果没有找到对应的预览函数则直接返回。
        //然后，根据编辑器的内容是否为空，显示或隐藏预览容器，并调用预览函数渲染预览内容。
        var forceDrawPreview = function () {
            var f = previews[CodeMirror.highlightMode];
            if (!f) { return; }
            try {
                if (editor.getValue() === '') {
                    $previewContainer.addClass('cp-app-code-preview-isempty');
                    return;
                }
                $previewContainer.removeClass('cp-app-code-preview-isempty');

                //f(String(text("Hello, world!")), $preview, framework._.sfCommon);//原代码

                var $preview = $('#cp-app-code-preview-content');


                //--------preview换行测试---lpd--------------------

                /*var text_array=editor.getValue().split("\n");
                text_array.forEach(function(element){
                    $preview.append(element+"<br>");
                })*/

                //先改成左边的值
                wrTextBr($preview, editor.getValue());
                //$preview.text(wrTextBr(editor.getValue()));

            } catch (e) { console.error(e); }
        };

        //定义一个名为 drawPreview 的函数，使用 Util.throttle 限制函数的调用频率。
        //如果没有找到对应的预览函数或预览按钮没有被激活，则直接返回。否则，调用 forceDrawPreview 函数。
        var drawPreview = Util.throttle(function () {
            if (!previews[CodeMirror.highlightMode]) { return; }
            if (!$previewButton.is('.cp-toolbar-button-active')) { return; }
            //forceDrawPreview();//暂时注释掉
        }, 400);

        //为预览按钮 $previewButton 添加点击事件处理器。在处理器中，首先使用 setTimeout 设置预览的延时，然后根据 CodeMirror.highlightMode 和预览容器的可见性切换预览容器的显示状态。
        //接着，根据预览容器的可见性，调整 CodeMirror 编辑器的容器类名以控制布局，并更新预览按钮的激活状态。
        // 最后，使用 framework._.sfCommon.setPadAttribute 方法设置预览模式属性。
        var previewTo;
        //应该改这个1111111--------------------------------------------
        //---------------------------------------------------------------------------------------------------
        $previewButton.click(function () {
            clearTimeout(previewTo);
            // $codeMirror.addClass('transition');//为 $codeMirror 添加 transition 类，使其在预览切换时产生过渡动画效果。
            previewTo = setTimeout(function () {
                $codeMirror.removeClass('transition');
            }, 500);//在延时结束时，移除 $codeMirror 的 transition 类,设置延时为 500 毫秒。
            if (!previews[CodeMirror.highlightMode]) {
                $previewContainer.show();
            }
            // $previewContainer.toggle();//切换预览容器 $previewContainer 的可见状态

            // 根据预览容器的可见状态执行以下操作：

            // ------始终执行分支--nsc

            // 如果预览容器可见，调用 forceDrawPreview 函数强制绘制预览，
            // 移除 $codeMirrorContainer 的 cp-app-code-fullpage 类，使其呈现分屏效果，
            // 并为预览按钮 $previewButton 添加激活状态。使用 framework._.sfCommon.setPadAttribute 方法将预览模式属性设置为 true。
            // if ($previewContainer.is(':visible')) {

            //-------------------新加新加ljy------------------------------------
            //------加上报错信息--nsc
            //------修复输出中含"Standard out:\n"时截断的bug--nsc

            console.log(editor.getValue());
            var $preview = $('#cp-app-code-preview-content');
            $preview.text('这段代码我也是第一次遇到，正在编译中！！！') // ------增加提示--nsc
            var code = editor.getValue();

            var data = {
                "source": code,
                "options": {
                    "userArguments": "-std=c++23",
                    "compilerOptions": {
                        "skipAsm": true,
                        "executorRequest": false
                    },
                    "filters": {
                        "binary": false,
                        "binaryObject": false,
                        "commentOnly": true,
                        "demangle": true,
                        "directives": true,
                        "execute": true,
                        "intel": true,
                        "labels": true,
                        "libraryCode": false,
                        "trim": false
                    },
                    "tools": [],
                    "libraries": []
                },
                "lang": "c++",
                "allowStoreCodeDebug": true
            };
            var url = "https://go.godbolt.org/api/compiler/g122/compile";
            fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
                .then(response => {
                    return response.text();
                    // return response.json();
                    // return document.getElementsByClassName("card execution-stdout").textContent;
                })
                .then(payload => {//增加错误处理
                    // 检查payload中是否包含"Standard err:"
                    if (payload.includes("Standard out:")) {
                        // 从payload中提取需要的部分
                        var pos = payload.indexOf("Standard out:\n") + "Standard out:\n".length;
                        var output = payload.substring(pos).trim();
                        console.log(output);
                        // 将提取的输出输出到页面中
                        // document.getElementById("output").textContent = output;

                        //----lpd--
                        wrTextBr($preview, output);
                        //$preview.text(output);
                    } else {
                        // 如果payload中无"Standard out:"，则输出错误信息
                        var pos = payload.indexOf("Standard error:\n") + "Standard error:\n".length;
                        var errmsg = payload.substring(pos).trim().replace(/\033\[.*?\[K/g, '');
                        console.log("Compilation error.");
                        console.log(errmsg);
                        wrTextBr($preview, errmsg);
                        //$preview.text(errmsg);

                    }
                })



            //forceDrawPreview();//暂时注释掉

            //-------------------新加新加ljy------------------------------------
            $codeMirrorContainer.removeClass('cp-app-code-fullpage');
            $previewButton.addClass('cp-toolbar-button-active');
            framework._.sfCommon.setPadAttribute('previewMode', true, function (e) {
                if (e) { return console.log(e); }
            });




            // }

            // ------删除分支--nsc

            //如果预览容器不可见，为 $codeMirrorContainer 添加 cp-app-code-fullpage 类使其全屏显示，移除预览按钮 $previewButton 的激活状态。
            // 使用 framework._.sfCommon.setPadAttribute 方法将预览模式属性设置为 false。
            // else {
            //     $codeMirrorContainer.addClass('cp-app-code-fullpage');
            //     $previewButton.removeClass('cp-toolbar-button-active');
            //     framework._.sfCommon.setPadAttribute('previewMode', false, function (e) {
            //         if (e) { return console.log(e); }
            //     });
            // }
        });

        framework._.toolbar.$bottomM.append($previewButton);

        $preview.click(function (e) {
            if (!e.target) { return; }
            var $t = $(e.target);
            if ($t.is('a') || $t.parents('a').length) {
                e.preventDefault();
                var $a = $t.is('a') ? $t : $t.parents('a').first();
                var href = $a.attr('href');
                if (/^\/[^\/]/.test(href)) {
                    var privateData = framework._.cpNfInner.metadataMgr.getPrivateData();
                    href = privateData.origin + href;
                } else if (/^#/.test(href)) {
                    var target = document.getElementById('cp-md-0-' + href.slice(1));
                    if (target) { target.scrollIntoView(); }
                    return;
                }
                framework._.sfCommon.openUnsafeURL(href);
            }
        });

        var modeChange = function (mode) {
            if (previews[mode]) {
                $previewButton.show();
                framework._.sfCommon.getPadAttribute('previewMode', function (e, data) {
                    if (e) { return void console.error(e); }
                    if (data !== false) {
                        $previewContainer.show();
                        $previewButton.addClass('cp-toolbar-button-active');
                        $codeMirrorContainer.removeClass('cp-app-code-fullpage');
                        if (isPresentMode) {
                            $editorContainer.addClass('cp-app-code-present');
                            $previewButton.hide();
                        }
                    }
                });
                return;
            }
            $editorContainer.removeClass('cp-app-code-present');
            $previewButton.hide();
            $previewContainer.hide();
            $previewButton.removeClass('active');
            $codeMirrorContainer.addClass('cp-app-code-fullpage');
        };

        var isVisible = function () {
            return $previewContainer.is(':visible');
        };

        framework.onReady(function () {
            // add the splitter
            var splitter = $('<div>', {
                'class': 'cp-splitter'
            }).appendTo($previewContainer);

            $previewContainer.on('scroll', function () {
                splitter.css('top', $previewContainer.scrollTop() + 'px');
            });

            var $target = $codeMirrorContainer;

            splitter.on('mousedown', function (e) {
                e.preventDefault();
                var x = e.pageX;
                var w = $target.width();
                var handler = function (evt) {
                    if (evt.type === 'mouseup') {
                        $(window).off('mouseup mousemove', handler);
                        return;
                    }
                    $target.css('width', (w - x + evt.pageX) + 'px');
                    editor.refresh();
                };
                $(window).off('mouseup mousemove', handler);
                $(window).on('mouseup mousemove', handler);
            });

            var previewInt;
            var clear = function () { clearInterval(previewInt); };

            // keep trying to draw until you're confident it has been drawn
            previewInt = setInterval(function () {
                // give up if it's not a valid preview mode
                if (!previews[CodeMirror.highlightMode]) { return void clear(); }
                // give up if content has been drawn
                if ($preview.text()) { return void clear(); }
                // only draw if there is actually content to display
                if (editor && !editor.getValue().trim()) { return void clear(); }
                forceDrawPreview();
            }, 1000);
        });

        framework._.sfCommon.getPadAttribute('previewMode', function (e, data) {
            if (e) { return void console.error(e); }
            if (data === false && $previewButton) {
                $previewButton.click();
            }
        });

        Visible.onChange(function (visible) {
            if (visible) {
                drawPreview();
            }
        });

        DiffMd.onPluginLoaded(drawPreview);

        return {
            forceDraw: forceDrawPreview,
            draw: drawPreview,
            modeChange: modeChange,
            isVisible: isVisible
        };
    };

    //创建按作者着色功能
    var mkColorByAuthor = function (framework, markers) {
        var common = framework._.sfCommon;
        var $cbaButton = framework._.sfCommon.createButton(null, true, {
            icon: 'fa-paint-brush',
            text: Messages.cba_title,
            name: 'cba'
        }, function () {
            var div = h('div');
            var $div = $(div);
            var content = h('div', [
                h('h4', Messages.cba_properties),
                h('p', Messages.cba_hint),
                div
            ]);
            var setButton = function (state) {
                var button = h('button.btn');
                var $button = $(button);
                $div.html('').append($button);
                if (state) {
                    // Add "enable" button
                    $button.addClass('btn-secondary').text(Messages.cba_enable);
                    UI.confirmButton(button, {
                        classes: 'btn-primary'
                    }, function () {
                        $button.remove();
                        markers.setState(true);
                        common.setAttribute(['code', 'enableColors'], true);
                        setButton(false);
                    });
                    return;
                }
                // Add "disable" button
                $button.addClass('btn-danger-alt').text(Messages.cba_disable);
                UI.confirmButton(button, {
                    classes: 'btn-danger'
                }, function () {
                    $button.remove();
                    markers.setState(false);
                    common.setAttribute(['code', 'enableColors'], false);
                    setButton(true);
                });
            };
            setButton(!markers.getState());
            UI.alert(content);
        });
        framework._.toolbar.$theme.append($cbaButton);
    };

    var mkFilePicker = function (framework, editor, evModeChange) {
        evModeChange.reg(function (mode) {
            if (MEDIA_TAG_MODES.indexOf(mode) !== -1) {
                // Embedding is enabled
                framework.setMediaTagEmbedder(function (mt, d) {
                    editor.focus();
                    var txt = $(mt)[0].outerHTML;
                    if (editor.getMode().name === "asciidoc") {
                        if (d.static) {
                            txt = d.href + `[${d.name}]`;
                        } else {
                            txt = `media-tag:${d.src}|${d.key}[]`;
                        }
                    }
                    editor.replaceSelection(txt);
                });
            } else {
                // Embedding is disabled
                framework.setMediaTagEmbedder();
            }
        });
    };

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////

    var andThen2 = function (editor, CodeMirror, framework, isPresentMode) {//接收editor, CodeMirror, framework, isPresentMode参数

        // 从framework中获取common和privateData对象
        var common = framework._.sfCommon;
        var privateData = common.getMetadataMgr().getPrivateData();

        // 创建预览面板和markdown工具栏
        var previewPane = mkPreviewPane(editor, CodeMirror, framework, isPresentMode);
        var markdownTb = mkMarkdownTb(editor, framework);

        // 创建主题切换按钮
        mkThemeButton(framework);

        // 创建标记（markers）对象，用于处理光标和作者颜色等
        var markers = Markers.create({
            common: common,
            framework: framework,
            CodeMirror: CodeMirror,
            devMode: privateData.devMode,
            editor: editor
        });
        // 创建颜色选择器按钮
        mkCbaButton(framework, markers);

        // 获取打印相关的DOM元素
        var $print = $('#cp-app-code-print');
        var $content = $('#cp-app-code-preview-content');
        // 创建打印按钮
        mkPrintButton(framework, $content, $print);

        // 如果不是嵌入模式，则创建帮助菜单
        if (!privateData.isEmbed) {
            mkHelpMenu(framework);
        }

        // 创建一个模式更改事件
        var evModeChange = Util.mkEvent();
        evModeChange.reg(previewPane.modeChange);
        evModeChange.reg(markdownTb.modeChange);


        CodeMirror.mkIndentSettings(framework._.cpNfInner.metadataMgr);// 初始化CodeMirror的缩进设置
        CodeMirror.init(framework.localChange, framework._.title, framework._.toolbar); // 初始化CodeMirror
        mkFilePicker(framework, editor, evModeChange);// 创建文件选择器

        // 如果编辑器不是只读模式，配置主题和语言
        if (!framework.isReadOnly()) {
            CodeMirror.configureTheme(common, function () {
                CodeMirror.configureLanguage(common, null, evModeChange.fire);
            });
        } else {
            CodeMirror.configureTheme(common);
        }



        // 当内容更新时，执行以下操作
        framework.onContentUpdate(function (newContent) {
            // 设置高亮模式
            var highlightMode = newContent.highlightMode;
            if (highlightMode && highlightMode !== CodeMirror.highlightMode) {
                CodeMirror.setMode(highlightMode, evModeChange.fire);
            }

            // 修复标记偏移
            //markers.checkMarks(newContent);

            // 更新编辑器内容
            // CodeMirror.contentUpdate("waaaaaaaa");//lkj add 注释 here：用于修改界面以及内容更新
            CodeMirror.contentUpdate(newContent);//lkj add 注释 here：用于修改界面以及内容更新
            previewPane.draw();

            // 重绘预览面板
            markers.setMarks();

            framework.localChange();
        });

        framework.setContentGetter(function () {
            CodeMirror.removeCursors();
            var content = CodeMirror.getContent();
            content.highlightMode = CodeMirror.highlightMode;
            previewPane.draw();

            markers.updateAuthorMarks();
            content.authormarks = markers.getAuthorMarks();

            return content;
        });

        var cursorTo;
        var updateCursor = function () {
            if (cursorTo) { clearTimeout(cursorTo); }
            if (editor._noCursorUpdate) { return; }
            cursorTo = setTimeout(function () {
                framework.updateCursor();
            }, 500); // 500ms to make sure it is sent after chainpad sync
        };
        framework.onCursorUpdate(CodeMirror.setRemoteCursor);
        framework.setCursorGetter(CodeMirror.getCursor);
        editor.on('cursorActivity', updateCursor);

        framework.onEditableChange(function () {
            editor.setOption('readOnly', framework.isLocked() || framework.isReadOnly());
        });

        framework.setTitleRecommender(CodeMirror.getHeadingText);

        framework.onReady(function (newPad) {
            editor.focus();

            if (newPad && !CodeMirror.highlightMode) {
                CodeMirror.setMode('gfm', evModeChange.fire);
                //console.log("%s => %s", CodeMirror.highlightMode, CodeMirror.$language.val());
            }

            markers.ready();
            common.getPadMetadata(null, function (md) {
                if (md && md.error) { return; }
                if (!Array.isArray(md.owners)) { return void markers.setState(false); }
                if (!common.isOwned(md.owners)) { return; }
                // We're the owner: add the button and enable the colors if needed
                mkColorByAuthor(framework, markers);
                if (newPad && Util.find(privateData, ['settings', 'code', 'enableColors'])) {
                    markers.setState(true);
                }
            });


            var fmConfig = {
                dropArea: $('.CodeMirror'),
                body: $('body'),
                onUploaded: function (ev, data) {
                    var parsed = Hash.parsePadUrl(data.url);
                    var secret = Hash.getSecrets('file', parsed.hash, data.password);
                    var fileHost = privateData.fileHost || privateData.origin;
                    var src = fileHost + Hash.getBlobPathFromHex(secret.channel);
                    var key = Hash.encodeBase64(secret.keys.cryptKey);
                    var mt = UI.mediaTag(src, key).outerHTML;
                    editor.replaceSelection(mt);
                }
            };
            common.createFileManager(fmConfig);
        });

        framework.onDefaultContentNeeded(function () {
            editor.setValue('');
        });

        framework.setFileExporter(CodeMirror.getContentExtension, CodeMirror.fileExporter);
        framework.setFileImporter({}, function () {
            /*  setFileImporter currently takes a function with the following signature:
                (content, file) => {}
                I used 'apply' with 'arguments' to avoid breaking things if this API ever changes.
            */
            var ret = CodeMirror.fileImporter.apply(null, Array.prototype.slice.call(arguments));
            previewPane.modeChange(ret.mode);
            return ret;
        });

        framework.setNormalizer(function (c) {
            return {
                content: c.content,
                highlightMode: c.highlightMode,
                authormarks: c.authormarks
            };
        });

        editor.on('change', function (cm, change) {
            markers.localChange(change, framework.localChange);
        });

        framework.start();


        window.easyTest = function () {
            var test = TypingTest.testCode(editor);
            return test;
        };
    };

    var getThumbnailContainer = function () {
        var $preview = $('#cp-app-code-preview-content');
        if ($preview.length && $preview.is(':visible')) {
            return $preview[0];
        }
    };

    // 创建一个基于CodeMirror的代码编辑器，同时提供预览功能
    // 1、创建一个Framework实例，
    //2、初始化CodeMirror实例，
    //3、根据当前是否处于演示模式来调用andThen2函数，实现相应的功能
    var main = function () {
        var CodeMirror;
        var editor;
        var framework;

        nThen(function (waitFor) {//处理异步任务

            // 传入一些配置参数，如工具栏容器、内容容器等。同时在回调函数中将新创建的实例赋值给变量framework
            Framework.create({
                toolbarContainer: '#cme_toolbox',
                contentContainer: '#cp-app-code-editor',
                thumbnail: {
                    getContainer: getThumbnailContainer,
                    filter: function (el, before) {
                        if (before) {
                            //$(el).parents().css('overflow', 'visible');
                            $(el).css('max-height', Math.max(600, $(el).width()) + 'px');
                            return;
                        }
                        $(el).parents().css('overflow', '');
                        $(el).css('max-height', '');
                        editor.refresh();
                    }
                }
            }, waitFor(function (fw) { framework = fw; }));

            // 插入一些新元素，包括textarea、预览容器和打印容器。
            $('#cp-app-code-editor').append([
                h('div#cp-app-code-container', h('textarea#editor1', { name: 'editor1' })),
                h('div#cp-app-code-preview', [
                    h('div#cp-app-code-preview-content'),
                    h('div#cp-app-code-print')
                ])
            ]);

            nThen(function (waitFor) {
                $(waitFor());
            }).nThen(function () {
                // 创建一个CodeMirror实例，并将editor变量设置为新创建的CodeMirror实例的editor属性。
                // 最后将#cp-app-code-container的样式设置为cp-app-code-fullpage。
                CodeMirror = SFCodeMirror.create(null, CMeditor);
                $('#cp-app-code-container').addClass('cp-app-code-fullpage');
                editor = CodeMirror.editor;
            }).nThen(waitFor());

        }).nThen(function (/*waitFor*/) {
            // 检查当前是否处于演示模式
            framework._.sfCommon.isPresentUrl(function (err, val) {
                andThen2(editor, CodeMirror, framework, val);
            });
        });
    };
    main();
});
