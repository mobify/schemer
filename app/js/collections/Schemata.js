// Schema Collection
// -----------------
//
//

define(['jquery', 'backbone', 'backbone-models/Schema'],
    function ($, Backbone, Schema) {
        var Collection = Backbone.Collection.extend({

            model: Schema

        });

        return Collection;

    }
);