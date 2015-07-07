// Schema Verify
// -------------
//
// Verifies the stored schema against the new generated context.

define(['jquery', 'lodash', 'backbone', 'backbone-models/Schema',
        'text!backbone-templates/schema-review.html', 'jsondiffpatch',
        'formatters', 'toastr'
    ],
    function($, _, Backbone, Schema, template, jsondiffpatch,
             _customFormatter, toastr) {
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

        var View = Backbone.View.extend({
            el: '#js-schema-review',

            initialize: function(options) {
                this.router = options.router;
                this.template = _.template(template);

                // Wait till data's ready
                this.listenTo(this.model, 'ready', this.render);
                this.listenTo(this.model, 'saved', this.schemaSaved);
            },

            events: {
                'click .js-back-to-list': 'backToList',
                'click .js-accept-change': 'acceptChange',
                'click .js-ignore-change': 'ignoreChange',
                'click .js-remove-ignore': 'removeIgnore'
            },

            render: function() {
                // Render template and initialize
                this.$el.html(this.template(this.model.toJSON()));

                // TODO: We shouldn't show unchanged items in the first place
                jsondiffpatch.formatters.hideUnchanged();

                return this;
            },

            backToList: function() {
                this.router.navigate('/', { trigger: true });
            },

            schemaSaved: function() {
                toastr.info('Schema saved');
                this.render();
            },

            acceptChange: function(e) {
                var $node = $(e.target).closest('[data-key]');
                var key = $node.attr('data-key');

                // TODO: Modify jsondiffpatch to give us the key directly
                var path = findPath($node).join('.');

                var savedContext = this.model.get('savedContext');
                var generatedContext = this.model.get('generatedContext');

                e.stopPropagation();

                if (!key) {
                    toastr.error('Clicked key not found!');
                }

                // Save generated value to schema
                _.set(savedContext, path, _.get(generatedContext, path));

                this.model.save({
                    'savedContext': savedContext
                });
            },

            ignoreChange: function(e) {
                var $node = $(e.target).closest('[data-key]');
                var key = $node.attr('data-key');
                var ignoredKeys = this.model.get('ignoredKeys') || [];

                // TODO: Modify jsondiffpatch to give us the key directly
                var path = findPath($node).join('.');

                ignoredKeys.push(path);

                this.model.save({
                    ignoredKeys: ignoredKeys
                });
            },

            // Remove one of the ignored keys from the schema
            removeIgnore: function(e) {
                e.preventDefault();
                e.stopPropagation();

                var $link = $(e.target);
                var ignoredKeys = this.model.get('ignoredKeys') || [];

                // make sure the link is the link, not the span containing the x
                if ($link.parent('a').length) {
                    $link = $link.parent();
                }

                var keyString = $link.text();

                // we want to remove the x at the end of the text
                keyString = keyString.substring(0, keyString.length - 1);

                ignoredKeys.splice(ignoredKeys.indexOf(keyString), 1);

                this.model.save({
                    ignoredKeys: ignoredKeys
                });
            }

        });

        return View;

    }

);