// Schema Model
// ------------
//

define(['jquery', 'backbone', 'toastr', 'jsondiffpatch'],
    function($, Backbone, toastr, jsondiffpatch) {
        var SCHEMA_STATUS = {
            PENDING: 'fetching',
            MISMATCH: 'mismatch',
            MATCH: 'match',
            MISSING: 'missing',
            ERROR: 'error'
        };

        // Generate context by running the fixture through the project view
        var generateContext = function(viewName, cb) {
            $.ajax({
                url: '/context',
                type: 'GET',
                data: {
                    viewName: viewName
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

                var updateDelta = function(savedContext) {
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

                if (savedContext) {
                    updateDelta(savedContext);
                    return;
                }

                $.ajax({
                    url: model.url,
                    type: 'GET',
                    data: {
                        path: 'schema/' + model.get('name') + '.json'
                    },
                    success: function(data) {
                        var savedContext;

                        try {
                            savedContext = JSON.parse(data);
                        } catch(e) {
                            // This is fine - we'll see that our saved context
                            // (which'll be empty) is different from generated
                            // context
                        }

                        updateDelta(savedContext);
                    },
                    error: function(xhr) {
                        model.set({
                            status: xhr.status === 404 ? SCHEMA_STATUS.MISSING : SCHEMA_STATUS.ERROR,
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
                    }, function (data) {
                        toastr.info('Schema saved');

                        /* TODO: Just trigger change doesn't correctly seem to
                         trigger a UI update
                         */
                        model.trigger('change');

                        // Don't bother fetching the saved context again
                        model.fetch(attrs.savedContext);
                    });
                }
            }

        });

        return Model;

    }
);
