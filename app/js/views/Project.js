// Schemer
// -------

define(['jquery', 'backbone', 'text!backbone-templates/project-details.html'],
function($, Backbone, template) {

    var View = Backbone.View.extend({
        el: '#project',

        initialize: function() {
            this.template = _.template(template);

            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'sync', this.render)
        },

        events: {
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));

            return this;
        }
    });

    return View;
});
