(function () {
    // Determine the logo path based on the current page
    // var logoPath = '/customize/CryptPad_logo.svg';
    var logoPath = '/customize/our_logo.svg';
    if (location.pathname === '/' || location.pathname === '/index.html') {
        // logoPath = '/customize/CryptPad_logo_hero.svg';
        logoPath = '/customize/our_logo.svg';
    }

    // Create a div element with the ID 'placeholder'
    var elem = document.createElement('div');
    elem.setAttribute('id', 'placeholder');
    elem.innerHTML = [
        '<div class="placeholder-logo-container">',
            '<img class="placeholder-logo" src="' + logoPath + '">',
        '</div>',
        '<div class="placeholder-message-container">',
            '<p>Loading...</p>',
        '</div>'
    ].join('');

    // Add 'dark-theme' class to the 'elem' based on the value in local storage
    var key = 'CRYPTPAD_STORE|colortheme'; // handle outer
    if (localStorage[key] && localStorage[key] === 'dark') {
        elem.classList.add('dark-theme');
    }
    if (!localStorage[key] && localStorage[key+'_default'] && localStorage[key+'_default'] === 'dark') {
        elem.classList.add('dark-theme');
    }

    // Try parsing the request data from the URL hash and add 'dark-theme' if required
    var req;
    try {
        req = JSON.parse(decodeURIComponent(window.location.hash.substring(1)));
        if ((req.theme || req.themeOS) === 'dark') { // handle inner
            elem.classList.add('dark-theme');
        }
    } catch (e) {}

    // Add an event listener for 'DOMContentLoaded'
    document.addEventListener('DOMContentLoaded', function() {
        // Append the 'elem' to the body when the document content is loaded
        document.body.appendChild(elem);
        // Record the preloading start time
        window.CP_preloadingTime = +new Date();

        // Apply smooth transition for the placeholder based on request timestamp
        if (req && req.time && (+new Date() - req.time > 2000)) {
            try {
                var logo = document.querySelector('.placeholder-logo-container');
                var message = document.querySelector('.placeholder-message-container');
                logo.style.opacity = 100;
                message.style.opacity = 100;
                logo.style.animation = 'none';
                message.style.animation = 'none';
            } catch (err) {}
        }

        // Fallback for when CSS animations are not available
        setTimeout(() => {
            try {
                document.querySelector('.placeholder-logo-container').style.opacity = 100;
                document.querySelector('.placeholder-message-container').style.opacity = 100;
            } catch (e) {}
        }, 3000);
    });
}());
