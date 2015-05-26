// Schema Model
// ------------
//

define(['jquery', 'lodash', 'backbone', 'jsondiffpatch'],
    function($, _, Backbone, jsondiffpatch) {
        var SCHEMA_STATUS = {
            PENDING: 'fetching',
            MISMATCH: 'changed',
            MATCH: 'match',
            MISSING: 'missing',
            ERROR: 'error'
        };

        var Model = Backbone.Model.extend({

            url: '/schema/',

            defaults: {
                // Schema name
                name: null,
                // View's directory path in the project
                viewPath: null,
                // Fixture's directory path in the project
                fixturePath: null,
                // Used in UI
                status: SCHEMA_STATUS.PENDING,
                // These keys are discounted in the verification
                ignoredKeys: null,
                // Differences between schema excluding ignored keys
                delta: null,
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

            fetch: function() {
                var model = this;
                var schemaName = model.get('name');

                $.ajax({
                    url: model.url,
                    type: 'GET',
                    data: {
                        name: schemaName
                    },
                    success: function(result) {
                        // Schema hasn't been created yet
                        if (!result) {
                            model.set({
                                status: SCHEMA_STATUS.MISSING,
                                savedContext: null
                            });
                            return;
                        }

                        try {
                            model
                                .set({
                                    viewPath: result.viewPath,
                                    fixturePath: result.fixturePath,
                                    ignoredKeys: result.ignoredKeys,
                                    savedContext: result.savedContext,
                                    generatedContext: result.generatedContext
                                })
                                .verifySchema();
                        } catch(e) {
                            model
                                .set({
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

            // Compare the saved and generated context to find delta (differences)
            // Excludes ignored keys from the comparison.
            verifySchema: function() {
                var model = this;
                var savedContext = model.get('savedContext');
                var generatedContext = model.get('generatedContext');
                var delta;

                // Discard ignored keys
                var ignored = model.get('ignoredKeys');

                for (var ctr = 0, path = ignored[ctr]; ctr < ignored.length;
                     ctr++, path = ignored[ctr]) {
                    delete savedContext[path];
                    delete generatedContext[path];
                }

                delta = jsondiffpatch.diff(savedContext, generatedContext);

                model
                    .set({
                        delta: delta,
                        status: !delta ? SCHEMA_STATUS.MATCH : SCHEMA_STATUS.MISMATCH
                    });

                model.trigger('ready');
            },

            // Generate context by running the fixture through the project view
            generateContext: function(cb) {
                var model = this;
                var viewName = model.get('name');

                $.ajax({
                    url: '/context',
                    type: 'GET',
                    data: {
                        viewName: viewName
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

                model.generateContext(function(context) {
                    if (!context) { return; }

                    model.save({
                        generatedContext: context,
                        savedContext: context,
                        status: SCHEMA_STATUS.MATCH
                    });
                });
            },

            save: function(attrs) {
                var model = this;

                // Only update saved schema if one of these has changed
                if (!(attrs.savedContext || attrs.ignoredKeys)) { return; }

                var ignoredKeys = attrs.ignoredKeys || this.get('ignoredKeys');
                var savedContext = JSON.stringify(attrs.savedContext) || this.get('savedContext');

                model.set({
                    savedContext: savedContext,
                    ignoredKeys: ignoredKeys
                });

                $.post(this.url, {
                    name: this.get('name'),
                    viewPath: this.get('viewPath'),
                    fixturePath: this.get('fixturePath'),
                    ignoredKeys: ignoredKeys,
                    savedContext: savedContext
                }, function () {
                    model.verifySchema();
                    model.trigger('saved');
                });
            }

        });

        return Model;

    }
);
