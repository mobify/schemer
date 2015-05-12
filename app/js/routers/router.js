// App Router
// ----------
//
//

define(['jquery', 'backbone', 'backbone-views/App', 'backbone-models/Schema',
        'backbone-views/Schema-Review', 'backbone-collections/Schemata',
        'backbone-views/Schema-List'],
    function($, Backbone, AppView, Schema, SchemaReviewView, Schemata,
             SchemaListView) {
        var Router = Backbone.Router.extend({
            initialize: function() {
                Backbone.history.start();
            },
            routes: {
                '': 'index',
                'review-schema/:viewName': 'review'
            },
            index: function() {
                var app = new AppView();

                new SchemaListView({
                    model: new Schemata,
                    el: app.$el,
                    router: this
                });
            },
            review: function(viewName) {
                var app = new AppView();

                var model = new Schema({
                    name: viewName
                });

                new SchemaReviewView({
                    el: app.$el,
                    model: model,
                    app: app,
                    router: this
                })
            }
        });

        return Router;
    }

);