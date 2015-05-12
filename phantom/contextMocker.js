// Context Mocker
// --------------
//
// Generates the context for a given view and fixture.

// Uh...not sure why this doesn't work without the .js
require(['/tests/runner/config.js'], function() {
    require(['require', '$', 'lodash', 'lib/documentFactory',
            'adaptivejs/defaults', 'adaptivejs/view'],
        function(require, $, _, DocumentFactory, defaults, AdaptiveView) {
            var ctx;

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

                $.attachDocument(doc);

                var defaultContext = defaults.getContext(doc);
                var context = AdaptiveView.evaluateContext(mockView, defaultContext);

                ctx = formatContext(context);

                // Let the Schemer server know we're done
                window.callPhantom && window.callPhantom(ctx);
            };

            if (!window.viewPath) {
                window.viewPath = document.location.hash.match(/viewPath=([\w//]+)/)[1];
            }

            if (!window.fixturePath) {
                window.fixturePath = document.location.hash.match(/fixturePath=(text![\w//\.!]+)/)[1];
            }

            // TODO: Replace with a direct PhantomJS call
            require([window.viewPath, window.fixturePath], function(view, fixture) {
                generateContext(view, fixture);
            });
        });
});
