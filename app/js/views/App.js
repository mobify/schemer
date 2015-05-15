// Schemer
// -------

define([
    'jquery',
    'backbone',
    'backbone-models/Project',
    'backbone-views/Project'
],
function($, Backbone, Project, ProjectView) {

    var View = Backbone.View.extend({
        el: '#app',

        initialize: function(view) {
            new ProjectView({
                model: new Project
            });

            this.render(view);
        },

        events: {
        },

        render: function() {
            return this;
        }
    });

    return View;
});
