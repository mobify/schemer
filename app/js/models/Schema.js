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

        var htmlEntities = function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };

        // Encode the HTML within delta of context, preventing active HTML from
        // being inserted into the DOM
        var sanitizeHtml = function(obj) {
            for(var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'string') {
                        obj[key] = htmlEntities(obj[key]);
                    } else if(typeof obj === 'object') {
                        obj[key] = sanitizeHtml(obj[key]);
                    }
                }
            }

            return obj;
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
                // jsondiffpatch representation of delta between saved/generated
                // context
                diff: null,
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
                                });
                            model.verifySchema();
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

                var savedContext = _.cloneDeep(model.get('savedContext'));
                var generatedContext = _.cloneDeep(model.get('generatedContext'));
                var delta;

                // Discard ignored keys
                var ignoredKeys = model.get('ignoredKeys') || [];

                _.forEach(ignoredKeys, function(path) {
                    delete savedContext[path];
                    delete generatedContext[path];
                });

                savedContext = sanitizeHtml(savedContext);
                generatedContext = sanitizeHtml(generatedContext);

                delta = jsondiffpatch.diff(savedContext, generatedContext);
                /* TODO:
                 1. Use a tool like https://github.com/inkling/htmldiff.js
                    or https://github.com/arnab/jQuery.PrettyTextDiff#documentation
                    to get more nuanced text and HTML diffing.
                 2. Enhance jsondiffpatch to offer better hooks for action buttons
                 */
                diff = jsondiffpatch.formatters.format(delta, savedContext);

                model
                    .set({
                        diff: sanitizeHtml(diff),
                        status: !delta ? SCHEMA_STATUS.MATCH : SCHEMA_STATUS.MISMATCH
                    });

                model.trigger('ready');
            },

            // Get generated context from Schemer API. The context generation is
            // asynchronous, so we need a callback.
            generateContext: function(cb) {
                var model = this;

                $.ajax({
                    url: '/context',
                    type: 'GET',
                    data: {
                        name: model.get('name'),
                        viewPath: model.get('viewPath'),
                        fixturePath: model.get('fixturePath')
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
                var savedContext = attrs.savedContext || this.get('savedContext');
                var generatedContext = attrs.generatedContext || this.get('generatedContext');

                model.set({
                    generatedContext: generatedContext,
                    savedContext: savedContext,
                    ignoredKeys: ignoredKeys
                });

                $.post(this.url, {
                    name: this.get('name'),
                    viewPath: this.get('viewPath'),
                    fixturePath: this.get('fixturePath'),
                    ignoredKeys: ignoredKeys,
                    savedContext: JSON.stringify(savedContext)
                }, function () {
                    model.verifySchema();
                    model.trigger('saved');
                });
            }

        });

        return Model;

    }
);
