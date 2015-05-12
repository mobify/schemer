// Schema Collection
// -----------------
//
//

define(['jquery', 'backbone', 'backbone-models/Schema'],
    function (jQuery, Backbone, Schema) {
        // Creates a new Backbone Collection class object
        var Collection = Backbone.Collection.extend({

            // Tells the Backbone Collection that all of it's models will be of type
            // Model (listed up top as a dependency)
            model: Schema

        });

        // Returns the Model class
        return Collection;

    }
);