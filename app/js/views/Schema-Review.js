// Schema Verify
// -------------
//
// Verifies the stored schema against the new generated context.

define(['jquery', 'backbone', 'backbone-models/Schema',
        'text!backbone-templates/schema-review.html', 'jsondiffpatch',
        'formatters', 'toastr'
    ],
    function($, Backbone, Schema, template, jsondiffpatch,
             _customFormatter, toastr) {
        var htmlEntities = function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };

        // Get full object path to a diff node element
        //
        // <div data-key="z">
        //     <div data-key="y">
        //         <div data-key="x"></div>
        //
        // Clicking on div[data-key="x"] will get us the path ['z', 'y', 'x']
        var findPath = function($el) {
            var path = [];

            var traverse = function($node) {
                if (!$node.length) { return; }

                var $parent = $node.parent().closest('[data-key]');

                path.push($node.attr('data-key'));

                traverse($parent);
            };

            traverse($el);

            return path.reverse();
        };

        // Given a source object `source`,
        // source = {
        //     a: {
        //         b: 1
        //     }
        // };
        //
        // Set the value of a chosen key `b` from the source object `source` to
        // the target object `target`
        var setObjectValueAtPath = function(source, target, path) {
            if (!(source && target && path)) {
                throw 'Missing options to setObjectValueAtPath!';
            }

            var sourceObj = source, targetObj = target;

            // Traverse object to target path
            // We want to hit source.a, not source.a.b
            for (var ctr = 0, currentKey = path[0]; ctr < path.length - 1; ++ctr, currentKey = path[ctr]) {
                sourceObj = sourceObj[currentKey];
                targetObj = targetObj[currentKey];
            }

            // Set target.a = source.a
            var lastComponent = path[path.length - 1];

            targetObj[lastComponent] = sourceObj[lastComponent];
        };

        // Encode the HTML within delta of context, preventing active HTML from
        // being inserted into the DOM
        var sanitizeHtml = function(obj) {
            for(var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'string') {
                        obj[key] = htmlEntities(obj[key]);
                    } else if(typeof obj === 'object') {
                        obj[key] = sanitizeHtml(obj[key]);
                    }
                }
            }

            return obj;
        };

        var View = Backbone.View.extend({
            el: '#js-schema-review',

            initialize: function(options) {
                this.router = options.router;

                // Wait till data's ready
                this.listenTo(this.model, 'ready', this.render);
            },

            events: {
                'click .js-back-to-list': 'backToList',
                'click .js-accept-change': 'acceptChange',
                'click .js-save': 'saveChanges'
            },

            render: function() {
                var savedContext = sanitizeHtml(_.cloneDeep(this.model.get('savedContext')));
                var generatedContext = sanitizeHtml(_.cloneDeep(this.model.get('generatedContext')));

                if (!savedContext) {
                    // TODO: Better error display
                    toastr.error('Saved context not found!');
                } else if(!generatedContext) {
                    toastr.error('Generated context not found!');
                }

                var delta = jsondiffpatch.diff(savedContext, generatedContext);

                /* TODO: Use a tool like https://github.com/inkling/htmldiff.js
                 or https://github.com/arnab/jQuery.PrettyTextDiff#documentation
                 to get more nuanced text and HTML diffing.
                 */

                /* TODO: Enhance jsondiffpatch to offer better hooks for
                 inserting action buttons
                 */

                this.template = _.template(template, {
                    delta: delta,
                    diff: jsondiffpatch.formatters.format(delta, savedContext)
                });

                // Render template and initialize
                this.$el.html(this.template);

                // TODO: We shouldn't show unchanged items in the first place
                jsondiffpatch.formatters.hideUnchanged();

                return this;
            },

            backToList: function() {
                this.router.navigate('/', { trigger: true });
            },

            acceptChange: function(e) {
                var $node = $(e.target).closest('[data-key]');
                var key = $node.attr('data-key');

                // TODO: Modify jsondiffpatch to give us the key directly
                var path = findPath($node);

                var savedContext = this.model.get('savedContext');
                var generatedContext = this.model.get('generatedContext');

                e.stopPropagation();

                if (!key) {
                    toastr.error('Clicked key not found!');
                }

                setObjectValueAtPath(generatedContext, savedContext, path);

                this.model.save({
                    'savedContext': savedContext
                });
            }

        });

        return View;

    }

);