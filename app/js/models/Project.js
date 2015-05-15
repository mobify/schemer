// Schema Model
// ------------
//

define(['jquery', 'backbone', 'toastr'],
    function($, Backbone, toastr) {

        var Model = Backbone.Model.extend({

            url: '/project/',
            el: '#project',

            defaults: {
                name: 'Project',
                framework: 'adaptive.js 1.0.0'
            },

            initialize: function() {
                this.fetch();
            }

        });

        return Model;

    }
);
