// Schemer
// -------

define(['jquery', 'backbone'],
function($, Backbone) {

    var View = Backbone.View.extend({
        el: '#app',

        initialize: function(view) {
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
