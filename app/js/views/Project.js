// Schemer
// -------

define(['jquery', 'backbone', 'text!backbone-templates/project-details.html'],
function($, Backbone, template) {

    var View = Backbone.View.extend({
        el: '#project',

        initialize: function(view) {
            this.listenTo(this.model, 'change', this.render);
            this.render(view);
        },

        events: {
        },

        render: function() {
            this.template = _.template(template, this.model.toJSON());

            this.$el.html(this.template);

            return this;
        }
    });

    return View;
});
