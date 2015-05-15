// Schema Model
// ------------
//

define(['jquery', 'backbone', 'toastr', 'jsondiffpatch'],
    function($, Backbone, toastr, jsondiffpatch) {
        var SCHEMA_STATUS = {
            PENDING: 'fetching',
            MISMATCH: 'changed',
            MATCH: 'match',
            MISSING: 'missing',
            ERROR: 'error'
        };

        // Verify if a schema's changed
        var updateDelta = function(savedContext) {
            var model = this;
            var generatedContext = model.get('generatedContext');

            if (!generatedContext) {
                generateContext(model.get('name'), function(generatedContext) {
                    if (!generatedContext) { return; }

                    var delta = jsondiffpatch.diff(savedContext, generatedContext);

                    model.set({
                        status: delta ? SCHEMA_STATUS.MISMATCH : SCHEMA_STATUS.MATCH,
                        savedContext: savedContext,
                        generatedContext: generatedContext
                    });

                    model.trigger('ready');
                });
            } else {
                var delta = jsondiffpatch.diff(savedContext, generatedContext);

                model.set({
                    status: delta ? SCHEMA_STATUS.MISMATCH : SCHEMA_STATUS.MATCH,
                    savedContext: savedContext
                });

                model.trigger('ready');
            }
        };

        // Generate context by running the fixture through the project view
        var generateContext = function(viewName, cb) {
            $.ajax({
                url: '/context',
                type: 'GET',
                data: {
                    viewPath: 'adaptation/views/' + viewName,
                    fixturePath: 'tests/fixtures/' + viewName + '.html'
                },
                success: function(data) {
                    if (!data) {
                        toastr.error('Error generating context, fixture doesn\'t exist');
                    }

                    cb(data.generatedContext);
                },
                error: function(xhr, status) {
                    toastr.error('Error retrieving generated view context: ' + status);
                }
            });
        };

        var Model = Backbone.Model.extend({

            url: '/schema/',

            defaults: {
                name: 'Uninitialized Schema',
                status: SCHEMA_STATUS.PENDING,
                actions: '',
                // Context saved on the server
                savedContext: null,
                // Fresh context generated on this machine (developer might've
                // modified the view/fixture)
                generatedContext: null
            },

            // Model Constructor
            initialize: function() {
                var model = this;
                this.SCHEMA_STATUS = SCHEMA_STATUS;

                model.fetch();
            },

            // TODO: Backbone should do this automatically. No $.ajax needed.
            fetch: function(savedContext) {
                var model = this;

                if (savedContext) {
                    updateDelta.call(model, savedContext);
                    return;
                }

                $.ajax({
                    url: model.url,
                    type: 'GET',
                    data: {
                        path: 'schema/' + model.get('name') + '.json'
                    },
                    success: function(result) {
                        var savedContext;

                        // Schema hasn't been created yet
                        if (!result) {
                            model.set({
                                status: SCHEMA_STATUS.MISSING,
                                savedContext: null
                            });
                            return;
                        }

                        try {
                            savedContext = JSON.parse(result);
                            updateDelta.call(model, savedContext);
                        } catch(e) {
                            model.set({
                                status: SCHEMA_STATUS.ERROR,
                                savedContext: null
                            });

                            toastr.error('Invalid schema');
                        }
                    },
                    error: function() {
                        model.set({
                            status: SCHEMA_STATUS.ERROR,
                            savedContext: null
                        });

                        // Used to let
                        model.trigger('ready');
                    }
                });
            },

            createContext: function() {
                var model = this;

                generateContext(this.get('name'), function(context) {
                    if (!context) { return; }

                    model.set({
                        generatedContext: context
                    });

                    // TODO: Add { wait: true }?
                    model.save({
                        savedContext: context
                    });
                });
            },

            save: function(attrs) {
                var model = this;

                if (attrs.savedContext) {
                    $.post(this.url, {
                        path: 'schema/' + this.get('name') + '.json',
                        context: JSON.stringify(attrs.savedContext)
                    }, function () {
                        model.set({
                            savedContext: attrs.savedContext
                        });

                        toastr.info('Schema saved');
                    });
                }
            }

        });

        return Model;

    }
);
