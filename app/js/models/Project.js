// Schema Model
// ------------
//

define(['jquery', 'backbone', 'toastr'],
    function($, Backbone, toastr) {

        var Model = Backbone.Model.extend({

            url: '/project/',
            el: '#project',

            defaults: {
                name: 'Schemer',
                framework: {
                    name: '',
                    version: ''
                }
            },

            initialize: function() {
                this.fetch();
            }

        });

        return Model;

    }
);
