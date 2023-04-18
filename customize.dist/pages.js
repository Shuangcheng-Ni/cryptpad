define([
    '/common/hyperscript.js',
    '/common/common-language.js',
    '/customize/application_config.js',
    '/customize/messages.js',
    'jquery',
    '/api/config',
    'optional!/api/instance',
], function (h, Language, AppConfig, Msg, $, ApiConfig, Instance) {
    //用于处理CryptPad页面的一些功能，包括设置HTML、外部链接、文档链接、创建底部链接等。
    var Pages = {};

    //接下来的几个函数是用于设置HTML内容、处理外部链接、本地化文档链接等。
    Pages.setHTML = function (e, html) {
        e.innerHTML = html;
        return e;
    };

    Pages.externalLink = function (el, href) {
        if (!el) { return el; }
        el.setAttribute("rel", "noopener noreferrer");
        el.setAttribute("target", "_blank");
        if (typeof(href) === 'string') {
            el.setAttribute("href", href);
        }
        return el;
    };

    // this rewrites URLS to point to the appropriate translation:
    // French, German, or English as a default
    var documentedLanguages = ['en', 'fr', 'de'];
    Pages.localizeDocsLink = function (href) {
        try {
            var lang = Msg._getLanguage();
            if (documentedLanguages.indexOf(lang) > 0) {
                return href.replace('/en/', '/' + lang + '/');
            }
        } catch (err) {
            console.error(err);
            // if it fails just use the default href (English)
        }
        return href;
    };

    Pages.documentationLink = function (el, href) {
        return Pages.externalLink(el, Pages.localizeDocsLink(href));
    };


    // 定义了一个名为accounts的对象，其中包含了捐赠和升级的URL。
    var accounts = Pages.accounts = {
        donateURL: AppConfig.donateURL || "https://opencollective.com/cryptpad/",
        upgradeURL: AppConfig.upgradeURL
    };

    Pages.areSubscriptionsAllowed = function () {
        try {
            return ApiConfig.allowSubscriptions && accounts.upgradeURL && !ApiConfig.restrictRegistration;
        } catch (err) { return void console.error(err); }
    };

    var languageSelector = function () {
        var options = [];
        var languages = Msg._languages;
        var selected = Msg._languageUsed;
        var keys = Object.keys(languages).sort();
        keys.forEach(function (l) {
            var attr = { value: l, role: 'option'};
            if (selected === l) { attr.selected = 'selected'; }
            options.push(h('option', attr, languages[l]));
        });
        var select = h('select', {role: 'listbox', 'label': 'language'}, options);
        $(select).change(function () {
            Language.setLanguage($(select).val() || '', null, function () {
                window.location.reload();
            });
        });
        return select;
    };

    // footLink函数用于创建底部链接。
    var footLink = function (ref, loc, text, icon) {
        if (!ref) { return; }
        var attrs =  {
            href: ref,
        };
        var iconName = '';
        if (!/^\//.test(ref)) {
            attrs.target = '_blank';
            attrs.rel = 'noopener noreferrer';
        }
        if (loc) {
            attrs['data-localization'] =  loc;
            text = Msg[loc];
        }
        if (icon) {
            iconName = 'i.fa.fa-' + icon;
            icon = h(iconName);
        }
        return h('a', attrs, [icon, text]);
    };

    // 设置了一些默认的URL和实例信息，以及一些版本信息。
    Pages.versionString = "5.2.1";

    var customURLs = Pages.customURLs = {};
    (function () {
        var defaultURLs = {
            source: 'https://github.com/xwiki-labs/cryptpad',
        };
        var l = Msg._getLanguage();
        ['imprint', 'privacy', 'terms', 'roadmap', 'source'].forEach(function (k) {
            var value = AppConfig[k];
            //console.log('links', k, value);
            if (value === false) { return; }
            if (value === true) {
                customURLs[k] = defaultURLs[k];
                return;
            }
            if (typeof(value) === 'string') {
                customURLs[k] = value;
                return;
            }
            if (typeof(value) === 'object') {
                customURLs[k] = value[l] || value['default'];
            }
        });
        var value = AppConfig.hostDescription;
        Pages.hostDescription = (value && (value[l] || value.default)) ||  Msg.home_host;

        Pages.Instance = {};
        Object.keys(Instance).forEach(function (k) {
            var value = Instance[k];
            Pages.Instance[k] = value[l] || value.default || undefined;
        });

        var name;
        try {
           // name = Pages.Instance.name || new URL('/', ApiConfig.httpUnsafeOrigin).host;
           name = '忞珰';
        } catch (err) {
            //name = 'CryptPad';
            name = '忞珰';
        }
        Pages.Instance.name = name;
        Pages.Instance.description = Pages.Instance.description || Msg.main_catch_phrase;
    }());

    // 定义了一些链接，用于关于菜单、法律声明链接、隐私政策链接、服务条款链接、源代码链接、文档链接和路线图链接。
    // used for the about menu
    Pages.imprintLink = footLink(customURLs.imprint, 'imprint');
    Pages.privacyLink = footLink(customURLs.privacy, 'privacy');
    Pages.termsLink = footLink(customURLs.terms, 'terms');
    Pages.sourceLink = footLink(customURLs.source, 'footer_source');
    Pages.docsLink = footLink('https://docs.cryptpad.org', 'docs_link');
    Pages.roadmapLink = footLink(customURLs.roadmap, 'footer_roadmap');


    //Pages.infopageFooter函数用于创建信息页面的底部内容。
    Pages.infopageFooter = function () {
        return;//lkj add here
        //根据是否移除了捐赠按钮的设置，来决定是否显示捐赠按钮。如果没有移除，则生成一个指向 OpenCollective 捐赠页面的链接。
        var donateButton;
        // if (!ApiConfig.removeDonateButton) {
        if (false) {
            donateButton = footLink('https://opencollective.com/cryptpad/contribute/', 'footer_donate', null, 'money'); // TODO migrate to forkawesome and use the OpenCollective icon
        }

        return h('footer.cp-footer', [
            // 生成一个包含 CryptPad Logo 和版本号的元素，并将其放在页脚的左侧
            h('div.cp-footer-left', [
                h('a', {href:"https://cryptpad.org"}, [
                    h('div.cp-logo-foot', [
                        h('img', {
                            // src: '/customize/CryptPad_logo.svg',
                            src: '/customize/laughter.svg',
                            "aria-hidden": true,
                            alt: ''
                        }),
                        h('span.logo-font', 'CryptPad')
                    ])
                ]),
                h('span.cp-footer-version', 'v' + Pages.versionString)
            ]),
            // 生成包含网站链接和捐赠按钮的元素，并将其放在页脚的中心位置
            h('div.cp-footer-center', [
                h('div.cp-logo-btns', [
                    footLink('https://cryptpad.org', null, Msg.footer_website, 'link'),
                    donateButton,
                ])
            ]),
            // 生成一个包含语言选择器的元素，并将其放在页脚的右侧位置
            h('div.cp-footer-right', [
                h('div.cp-footer-language', [
                    h('i.fa.fa-language', {'aria-hidden': 'true'}),
                    languageSelector()
                ])
            ])
        ]);
    };

    // Pages.infopageTopbar函数用于创建信息页面的顶部导航栏。
    Pages.infopageTopbar = function () {
        return;//lkj add here


        var rightLinks;
        var username = window.localStorage.getItem('User_name');//获取了用户在本地存储中保存的用户名。这是一个通过 window.localStorage 对象来实现的操作。
        var registerLink;

        //根据是否限制注册的设置，决定是否显示注册按钮。如果不限制，则生成一个指向注册页面的链接。
        if (!ApiConfig.restrictRegistration) {
            registerLink = h('a.nav-item.nav-link.cp-register-btn', { href: '/register/'}, [
                h('i.fa.fa-user', {'aria-hidden':'true'}),
                Msg.login_register
            ]);
        }

        // 根据用户名是否为空，来决定显示登录按钮还是用户头像按钮。
        // 如果用户名为空，就显示登录和注册按钮。如果用户名不为空，就显示用户名和指向用户驱动器页面的链接。
        if (username === null) {
            rightLinks = [
                h('a.nav-item.nav-link.cp-login-btn', { href: '/login/'}, [
                    h('i.fa.fa-sign-in', {'aria-hidden':'true'}),
                    Msg.login_login
                ]),
                registerLink,
            ];
        } else {
            rightLinks = h('a.nav-item.nav-link.cp-user-btn', { href: '/drive/' }, [
                h('i.fa.fa-user-circle', {'aria-hidden':'true'}),
                " ",
                username
            ]);
        }

        var isHome = ['/', '/index.html'].includes(window.location.pathname);
        var homeLink = h('a.nav-item.nav-link.cp-back-home' /* .navbar-brand */, { href: '/index.html' }, [
            h('i.fa.fa-arrow-left'),
            h('img', {
                src: '/customize/CryptPad_logo.svg',
                "aria-hidden": true,
                alt: ''
            }),
            Msg.homePage
        ]);

        return h('nav.navbar.navbar-expand-lg',
            [
                !isHome? homeLink: undefined,
                h('a.nav-item.nav-link', { href: '/features.html'}, [
                    h('i.fa.fa-info-circle'),
                    Pages.areSubscriptionsAllowed()? Msg.pricing: Msg.features
                ]),
                h('a.nav-item.nav-link', { href: 'https://docs.cryptpad.org'},
                    [h('i.fa.fa-book', {'aria-hidden':'true'}),Msg.docs_link]),
            ].concat(rightLinks)
        );
    };

    return Pages;
});
