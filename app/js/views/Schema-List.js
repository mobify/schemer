// Schema List
// -----------
//
// View that manages display of the schema list. Contains multiple Schema Row
// child views.

define(['jquery', 'underscore', 'backbone', 'backbone-models/Schema',
        'text!backbone-templates/schema-list.html', 'backbone-views/Schema-Row'],

    function(jQuery, _, Backbone, Schema, template, SchemaRowView){

        var View = Backbone.View.extend({
            // View constructor
            initialize: function(options) {
                this.listenTo(this.model, 'add', this.addOne);

                this.router = options.router;

                // Calls the view's render method
                this.render();
                this.fetch();
            },

            // View Event Handlers
            events: {
            },

            addOne: function (schema) {
                var view = new SchemaRowView({ model: schema, router: this.router });
                this.$el.find('tbody').append(view.render().el);
            },

            fetch: function() {
                var schemata = this.model;

                jQuery.ajax({
                    url: '/views',
                    method: 'GET',
                    success: function(data) {
                        jQuery.each(data, function(idx, name) {
                            schemata.add(new Schema({
                                name: name.replace(/\.js/, '')
                            }));
                        });
                    }
                });
            },

            // Renders the view's template to the UI
            render: function() {
                // Setting the view's template property using the Underscore template method
                this.template = _.template(template, {});

                this.$el.html(this.template);

                // Maintains chainability
                return this;
            }

        });

        // Returns the View class
        return View;

    }

);