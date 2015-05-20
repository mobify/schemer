// Schema Row View
// ---------------
//
// Contains the representation of a single row in the schema list, and its
// associated action buttons (create, verify, etc.)

define(['jquery', 'lodash', 'toastr', 'backbone', 'backbone-models/Schema',
        'text!backbone-templates/schema-row.html'],

    function($, _, toastr, Backbone, Schema, template){

        var View = Backbone.View.extend({
            tagName: 'tr',

            initialize: function(options) {
                this.listenTo(this.model, 'change', this.render);
                this.listenTo(this.model, 'error', this.schemaError);
                this.listenTo(this.model, 'saved', this.schemaSaved);

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

            schemaError: function(msg) {
                toastr.error(msg);
            },

            schemaSaved: function() {
                toastr.info('Schema saved');
                this.render();
            },

            refreshSchema: function() {
                this.setPending();
                this.model.fetch();
            },

            createContext: function() {
                this.model.createContext();
            },

            setPending: function() {
                this.model.set({
                    status: this.model.SCHEMA_STATUS.PENDING
                });
                this.render();
            },

            reviewSchema: function() {
                this.setPending();
                this.router.navigate('review-schema/' + this.model.get('name'),
                    { trigger: true });
            }

        });

        return View;

    }

);