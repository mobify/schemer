// View.js
// -------

define(['jquery', 'backbone'],
function($, Backbone) {

    var View = Backbone.View.extend({
        el: '#app',

        // View is the child view to be displayed within the app view
        initialize: function(view) {
            // Calls the view's render method
            this.render(view);
        },

        events: {
        },

        render: function() {
            // Maintains chainability
            return this;
        }
    });

    // Returns the View class
    return View;
});
