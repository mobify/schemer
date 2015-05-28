// Schema List
// -----------
//
// View that manages display of the schema list. Contains multiple Schema Row
// child views.

define([
    'jquery', 'underscore', 'backbone', 'backbone-models/Schema',
    'text!backbone-templates/schema-list.html', 'backbone-views/Schema-Row',
    'toastr'
],
function($, _, Backbone, Schema, template, SchemaRowView, toastr){

    var View = Backbone.View.extend({
        initialize: function(options) {
            this.listenTo(this.model, 'add', this.addOne);

            this.router = options.router;
            this.template = _.template(template);

            // Calls the view's render method
            this.render();
            this.fetch();
        },

        events: {
        },

        addOne: function (schema) {
            var view = new SchemaRowView({ model: schema, router: this.router });
            this.$el.find('tbody').append(view.render().el);
        },

        fetch: function() {
            var schemata = this.model;

            $.ajax({
                url: '/views',
                method: 'GET',
                success: function(results) {
                    if (!results || !results.length) {
                        toastr.error('View list is empty or invalid!');
                        return;
                    }

                    $.each(results, function(idx, view) {
                        schemata.add(new Schema({
                            name: view.name,
                            viewPath: view.viewPath,
                            fixturePath: view.fixturePath
                        }));
                    });
                },
                error: function() {
                    toastr.error('Error fetching view list!');
                }
            });
        },

        render: function() {
            this.$el.html(this.template());

            return this;
        }

    });

    return View;

});