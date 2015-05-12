// Schema Model
// ------------
//

define(['jquery', 'backbone', 'toastr'],
    function($, Backbone, toastr) {
        var SCHEMA_STATUS = {
            PENDING: 'pending',
            RETRIEVED: 'retrieved',
            MISSING: 'missing',
            ERROR: 'error'
        };

        // Generate context by running the fixture through the project view
        var generateContext = function(viewName, cb) {
            const VIEW_DIR = 'adaptation/views/';
            const FIXTURE_DIR = 'tests/fixtures/';

            var viewTmpl = _.template('<%= VIEW_DIR %><%= viewName %>');
            var fixtureTmpl = _.template('<%= FIXTURE_DIR %><%= viewName %>.html');

            var viewPath = viewTmpl({ VIEW_DIR: VIEW_DIR, viewName: viewName });
            var fixturePath = fixtureTmpl({ FIXTURE_DIR: FIXTURE_DIR, viewName: viewName });

            $.ajax({
                url: '/context',
                type: 'GET',
                data: {
                    viewPath: viewPath,
                    fixturePath: fixturePath
                },
                success: function(data) {

                    cb(data.generatedContext);
                },
                error: function(xhr) {
                    toastr.error('Error retrieving generated view context');
                }
            });
        };

        // Creates a new Backbone Model class object
        var Model = Backbone.Model.extend({

            url: 'http://localhost:3000/schema/',

            // Default values for all of the Model attributes
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

            // TODO: Backbone should do this automatically?
            fetch: function() {
                var model = this;

                $.ajax({
                    url: model.url,
                    type: 'GET',
                    data: {
                        path: 'schema/' + model.get('name') + '.json'
                    },
                    success: function(data) {
                        var savedContext;
                        var generatedContext = model.get('generatedContext');

                        try {
                            savedContext = JSON.parse(data);
                        } catch(e) {
                            // This is fine - we'll see that our saved context
                            // (which'll be empty) is different from generated
                            // context
                        }

                        if (!generatedContext) {
                            generateContext(model.get('name'), function(context) {
                                if (!context) { return; }

                                model.set({
                                    status: SCHEMA_STATUS.RETRIEVED,
                                    savedContext: savedContext,
                                    generatedContext: context
                                });

                                model.trigger('ready');
                            });
                        } else {
                            model.set({
                                status: SCHEMA_STATUS.RETRIEVED,
                                savedContext: savedContext
                            });

                            model.trigger('ready');
                        }
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
                        console.log('Cat overlord says: ', data);
                        toastr.info('Schema saved');

                        // TODO: Just trigger change doesn't correctly seem to
                        // trigger a UI update
                        model.trigger('change');
                        model.fetch();
                    });
                }
            }

        });

        // Returns the Model class
        return Model;

    }
);
