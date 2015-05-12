// Schema Row View
// ---------------
//
// Contains the representation of a single row in the schema list, and its
// associated action buttons (create, verify, etc.)

define(['jquery', 'lodash', 'backbone', 'backbone-models/Schema',
        'text!backbone-templates/schema-row.html'],

    function(jQuery, _, Backbone, Schema, template){

        var View = Backbone.View.extend({
            // The DOM Element associated with this view
            tagName: 'tr',

            // View constructor
            initialize: function(options) {
                this.listenTo(this.model, 'change', this.render);
                this.router = options.router;

                // Calls the view's render method
                this.render();
            },

            // View Event Handlers
            events: {
                'click .js-create': 'createContext',
                'click .js-verify': 'verifyContext'
            },

            // Renders the view's template to the UI
            render: function() {
                var data = this.model.toJSON();

                jQuery.extend(data, {
                    SCHEMA_STATUS: this.model.SCHEMA_STATUS
                });

                // TODO: Upgrade Lodash to latest version
                // Setting the view's template property using the Underscore template method
                this.template = _.template(template, data);

                // Dynamically updates the UI with the view's template
                //console.log('El: ', this.$el);
                this.$el.html(this.template);

                // Maintains chainability
                return this;
            },

            createContext: function() {
                this.model.createContext();
            },

            verifyContext: function() {
                this.router.navigate('verify-schema/' + this.model.get('name'),
                    { trigger: true });
            }

        });

        // Returns the View class
        return View;

    }

);