// Schema Model
// ------------
//

define(['jquery', 'backbone', 'jsondiffpatch'],
    function($, Backbone, jsondiffpatch) {
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
                model.generateContext(model.get('name'), function(generatedContext) {
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

                            model.trigger('error', 'Invalid schema');
                        }
                    },
                    error: function(xhr) {
                        model.set({
                            status: SCHEMA_STATUS.ERROR,
                            savedContext: null
                        });

                        model.trigger('error', 'Error retrieving schema: ' + xhr.responseText);
                    }
                });
            },

            // Generate context by running the fixture through the project view
            generateContext: function(viewName, cb) {
                var model = this;

                $.ajax({
                    url: '/context',
                    type: 'GET',
                    data: {
                        viewPath: 'adaptation/views/' + viewName,
                        fixturePath: 'tests/fixtures/' + viewName + '.html'
                    },
                    success: function(data) {
                        if (!data) {
                            model.trigger('error', 'Error generating context, fixture doesn\'t exist');
                        }

                        cb(data.generatedContext);
                    },
                    error: function(xhr, status) {
                        model.trigger('error', 'Error retrieving generated view context: ' + status);
                    }
                });
            },

            createContext: function() {
                var model = this;

                model.generateContext(this.get('name'), function(context) {
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

                        model.trigger('saved');
                    });
                }
            }

        });

        return Model;

    }
);
