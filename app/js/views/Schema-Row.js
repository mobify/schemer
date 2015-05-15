// Schema Row View
// ---------------
//
// Contains the representation of a single row in the schema list, and its
// associated action buttons (create, verify, etc.)

define(['jquery', 'lodash', 'backbone', 'backbone-models/Schema',
        'text!backbone-templates/schema-row.html'],

    function($, _, Backbone, Schema, template){

        var View = Backbone.View.extend({
            tagName: 'tr',

            initialize: function(options) {
                this.listenTo(this.model, 'change', this.render);
                this.router = options.router;

                this.render();
            },

            // View Event Handlers
            events: {
                'click .js-refresh': 'refreshSchema',
                'click .js-create': 'createContext',
                'click .js-review': 'reviewSchema'
            },

            // Renders the view's template to the UI
            render: function() {
                var data = this.model.toJSON();

                $.extend(data, {
                    SCHEMA_STATUS: this.model.SCHEMA_STATUS
                });

                // TODO: Upgrade Lodash to latest version
                this.template = _.template(template, data);

                this.$el.html(this.template);

                // Maintains chainability
                return this;
            },

            refreshSchema: function() {
                this.model.fetch();
            },

            createContext: function() {
                this.model.createContext();
            },

            reviewSchema: function() {
                this.router.navigate('review-schema/' + this.model.get('name'),
                    { trigger: true });
            }

        });

        return View;

    }

);