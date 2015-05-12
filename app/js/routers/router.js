// App Router
// ----------
//
//

define(['jquery', 'backbone', 'backbone-views/App', 'backbone-models/Schema',
        'backbone-views/Schema-Verify', 'backbone-collections/Schemata',
        'backbone-views/Schema-List'],
    function($, Backbone, AppView, Schema, SchemaVerifyView, Schemata,
             SchemaListView) {
        var Router = Backbone.Router.extend({
            initialize: function() {
                // Tells Backbone to start watching for hashchange events
                Backbone.history.start();
            },
            // All of your Backbone Routes (add more)
            routes: {
                // When there is no hash on the url, the home method is called
                '': 'index',
                'verify-schema/:viewName': 'verify'
            },
            index: function() {
                var app = new AppView();

                new SchemaListView({
                    model: new Schemata,
                    el: app.$el,
                    router: this
                });
            },
            verify: function(viewName) {
                var app = new AppView();

                var model = new Schema({
                    name: viewName
                });

                new SchemaVerifyView({
                    el: app.$el,
                    model: model,
                    app: app,
                    router: this
                })
            }
        });

        // Returns the Router class
        return Router;
    }

);