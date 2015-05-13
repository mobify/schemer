// Context Mocker
// --------------
//
// Generates the context for a given view and fixture.

// Use integration test require.js configuration file, since we'll need the same
// infrastructure.
require.config({
    paths: {
        'test-config': '/tests/runner/config'
    }
});

require(['test-config'], function() {
    // TODO: Less eww. Feed into page via PhantomJS.
    var viewPath = window.viewPath || document.location.hash.match(/viewPath=([\w//\-]+)/)[1];
    var fixturePath = window.fixturePath || document.location.hash.match(/fixturePath=(text![\w//\.!\-]+)/)[1];

    require([
        '$',
        'adaptivejs/adaptive',
        'adaptivejs/utils',
        'adaptivejs/view',
        'adaptivejs/defaults',
        'lib/documentFactory',
        'lodash',
        viewPath,
        fixturePath
    ],
    function($, Adaptive, Utils, View, defaults, DocumentFactory, _, view, fixture) {
        var formatContext = function(context) {
            var cache = [];

            // Handle circular references within the context, eg. with DOM
            // nodes, which are inherently circular
            var getValue = function (key, value) {
                if (typeof value === 'object' && value !== null) {
                    if (value.nodeType) {
                        // DOM objects
                        return value.outerHTML;
                    } else if (cache.indexOf(value) !== -1) {
                        // Circular reference found, discard key
                        return;
                    }
                    // Store value in our collection
                    cache.push(value);
                }

                return value;
            };

            return JSON.stringify(context, getValue, 2);
        };

        var generateContext = function(view, fixture) {
            var doc = DocumentFactory.makeDocument(fixture);
            var mockView = _.cloneDeep(view);
            var ctx;

            $.attachDocument(doc);

            var defaultContext = defaults.getContext(doc);
            var context = View.evaluateContext(mockView, defaultContext);

            ctx = formatContext(context);

            // Let the Schemer server know we're done
            window.callPhantom && window.callPhantom(ctx);

            // For debugging in browser
            //console.log(ctx);
        };

        generateContext(view, fixture);
    });
});
