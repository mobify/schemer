(function(window, document, detector, mobifyjsUrl, main) {

// Start Mobify object with initial timestamp when loaded.
    window.Mobify = {points: [+new Date]};

// if mobify=(1|0) override is set in hash or cookie, force mobify on/off.
    var override = /((; )|#|&|^)mobify=(\d)/.exec(location.hash + '; ' + document.cookie);
    if (override && override[3]) {
        // if mobify=0, do not run mobify.
        if (!+override[3]) return;
    }
// else do not run mobify if Mobify object exists, or detector fails.
    else if (!detector()) {
        return;
    }

    function attachScriptBeforeMobifyTag(script, id, classNames, src) {
        var mobifyTagScript = document.getElementsByTagName('script')[0];
        script.src = src;
        script.id = id;
        script.setAttribute("class", classNames);
        mobifyTagScript.parentNode.insertBefore(script, mobifyTagScript);
    }

    document.write('<plaintext style="display:none">');

// On next tick, load library and main executable
    setTimeout(function() {
        var Mobify = window.Mobify = window.Mobify || {};
        Mobify.capturing = true;
        var mobifyjsScript = document.createElement('script');
        var scriptClasses = "mobify";
        var errorHandler = function() {
            var now = new Date();
            // Set now to 5 minutes ahead
            now.setTime(now.getTime() + 300000);
            document.cookie = 'mobify=0' +
                '; expires=' + now.toGMTString() +
                '; path=/';
            // Reload the page (location.reload has problems in FF)
            window.location = window.location.href;
        };
        mobifyjsScript.onload = function(){
            if (main) {
                // if main is a path to a main file
                if (typeof main === 'string') {
                    var mainScript = document.createElement('script');
                    mainScript.onerror = errorHandler;
                    attachScriptBeforeMobifyTag(mainScript, "main-executable", scriptClasses, mainUrl);
                } else {
                    // Set main on Mobify object to be used later for re-insertion
                    window.Mobify.mainExecutable = main.toString();
                    main();
                }
            }
        };
        mobifyjsScript.onerror = errorHandler;
        attachScriptBeforeMobifyTag(mobifyjsScript, "mobify-js", scriptClasses, mobifyjsUrl);

    });

})( window, document,
    // detector function
    function () {
        return true;
    },
    'http://localhost:8080/mobify.js'
);