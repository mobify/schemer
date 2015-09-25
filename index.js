#!/usr/bin/env node

// Leaves the server running to be accessible in the browser, as opposed to
// running in a script on a CI environment
var argv = require('minimist')(process.argv.slice(2));

var _ = require('lodash');

// Schemer Settings
var port = argv.port || 3000;
const SERVER_URL = _.template('http://localhost:<%- port %>/')({port: port});

// Generates context for a given view with a fixture
const ADAPTIVEJS_CONTEXT_MOCKER_URL = 'phantom/adaptivejs/index.html';
const MOBIFYJS_CONTEXT_MOCKER_URL = 'phantom/mobifyjs/index.html';
const MOBIFYJS_VIEW_LIST_URL = 'phantom/mobifyjs/view-list.html';

// Adaptive project folders
const VIEWS_DIR = './adaptation/views';
const SCHEMA_DIR = './schemae';

const ADAPTIVEJS_VIEW_TMPL = _.template('adaptation/views/<%- name %>');
const ADAPTIVEJS_FIXTURE_TMPL = _.template('tests/fixtures/<%- name %>.html');
const MOBIFYJS_FIXTURE_TMPL = _.template('src/fixtures/<%- name %>.html');
const SCHEMA_TMPL = _.template('./schemae/<%- name %>.json');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var path = require('path');
var colors = require('colors');
var jsondiffpatch = require('jsondiffpatch');

var childProcess = require('child_process');
var phantomPath = require('phantomjs').path;

var fs = require('fs');

var framework = argv.framework || 'adaptivejs';

// Serve the Adaptive.js project whose folder we're in
app.use('/', express.static('.'));
app.use('/tests/', express.static('/tests'));

// Serve Mobify.js fixtures
app.use('/src/fixtures/', express.static('/src/fixtures'));

// Schemer app paths
app.use('/schemer/', express.static(__dirname + '/app'));
app.use('/node_modules/', express.static(__dirname + '/node_modules'));
app.use('/bower_components/', express.static(__dirname + '/bower_components'));
app.use('/phantom/adaptivejs/', express.static(__dirname + '/phantom/adaptivejs'));
app.use('/phantom/mobifyjs/', express.static(__dirname + '/phantom/mobifyjs'));

// For parsing application/x-www-form-urlencoded. 1MB limit needed because our
// contexts get pretty big.
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '1mb'
}));

// API
// ---
//

// Get information about the project
app.get('/project', function (req, res) {
    var projectFile = framework === 'adaptivejs' ? 'package.json' : 'project.json';

    fs.readFile(projectFile, function (err, data) {
        if (err) {
            req.status(400).send('Cannot find project package.json file');
            return;
        }

        var pjson = JSON.parse(data);
        var version = framework === 'adaptivejs' ? pjson.dependencies.adaptivejs : pjson.api;

        res.send({
            name: pjson.name,
            framework: {
                name: framework,
                version: version
            }
        });
    });
});

// Generate context for a given view and fixture by spinning up a PhantomJS
// instance, and mocking AdaptiveJS.
var generateContext = function (viewPath, fixturePath, cb) {
    var pathString;
    var generatorPath;

    if (framework === 'adaptivejs') {
        generatorPath = SERVER_URL + ADAPTIVEJS_CONTEXT_MOCKER_URL;
        pathString = '#viewPath=' + viewPath + '&fixturePath=text!' + fixturePath;
    } else if (framework === 'mobifyjs') {
        generatorPath = SERVER_URL + MOBIFYJS_CONTEXT_MOCKER_URL;
        pathString = '#viewPath=' + viewPath + '&fixturePath=' + SERVER_URL + fixturePath;
    }

    // First verify fixture exists
    fs.readFile(fixturePath, function (err, fixture) {
        if (err) {
            cb('Missing fixture');
            return;
        }

        var ctx;
        var args = [
            //'--remote-debugger-port=9000',
            path.join(__dirname, '/phantom/main.js'),
            generatorPath + pathString
        ];

        childProcess.execFile(phantomPath, args, {
            // Max stdout length
            maxBuffer: 1024 * 1024
        }, function (err, stdout, stderr) {
            if (err || stderr) {
                console.error(err);
                cb(err.message || stderr);
                return;
            }

            try {
                // TODO: Validate to confirm we're getting expected context
                ctx = JSON.parse(stdout);
            } catch (e) {
                cb('Error generating context: ' + e);
                return;
            }

            cb(null, ctx);
        });
    });
};

// List all views in the Adaptive.js project
var getAdaptiveViews = function (cb) {
    fs.readdir(VIEWS_DIR, function (err, views) {
        cb(err, views);
    });
};

// Get Mobify.js template choices
var getKonfTemplates = function (cb) {
    var generatorPath = SERVER_URL + MOBIFYJS_VIEW_LIST_URL;
    var args = [
        //'--remote-debugger-port=9000',
        path.join(__dirname, '/phantom/main.js'),
        generatorPath
    ];

    childProcess.execFile(phantomPath, args, {
        // Max stdout length
        maxBuffer: 1024 * 1024
    }, function (err, stdout, stderr) {
        if (err || stderr) {
            console.error(err);
            cb(err.message || stderr);
            return;
        }

        try {
            // TODO: Validate to confirm we're getting expected context
            ctx = JSON.parse(stdout);
        } catch (e) {
            cb('Error generating context: ' + e);
            return;
        }

        cb(null, ctx);
    });
};

// Get all the saved schemae in the project folder
var getSchemae = function (cb) {
    fs.readdir(SCHEMA_DIR, function (err, schemae) {
        cb(err, schemae);
    });
};

// Verify a given schema by re-generating the context for it, and comparing it
// to the saved context
var verifySchema = function (schema, cb) {
    fs.readFile(SCHEMA_DIR + '/' + schema, {encoding: 'utf8'}, function (err, contents) {
        if (err || !contents) {
            console.error('Error reading schema ' + schema + ': ', err);
            cb(false);
        }

        try {
            var savedSchema = JSON.parse(contents);

            var viewName = savedSchema.name;
            var viewPath = savedSchema.viewPath;
            var fixturePath = savedSchema.fixturePath;

            generateContext(viewPath, fixturePath, function (err, generatedContext) {
                if (err || !generatedContext) {
                    console.error('Error generating context for ', viewName, err);
                    cb(false);
                    return;
                }

                var savedContext = JSON.parse(savedSchema.savedContext);

                // Exclude ignored keys
                var ignoredKeys = savedSchema.ignoredKeys || [];

                _.forEach(ignoredKeys, function (path) {
                    delete savedContext[path];
                    delete generatedContext[path];
                });

                cb(!jsondiffpatch.diff(savedContext, generatedContext));
            });
        } catch (e) {
            console.error('Error reading saved schema ', schema, ': ', err);
            cb(false);
        }
    });
};

// Verify all the saved schemae in the project against their counterparts
var verifySchemae = function () {
    getSchemae(function (err, schema) {
        // Counter of schemae we're waiting to verify
        var openSchemaCtr = (schema && schema.length) || 0;
        var passedAll = true;

        if (err || !schema) {
            console.error('Error fetching schemae.', err);
            verificationSummary(false);
            return;
        }

        schema.forEach(function (schema) {
            verifySchema(schema, function (schemaMatch) {
                var result = schemaMatch ? 'PASS'.green : 'FAIL'.red;

                if (!schemaMatch) {
                    passedAll = false;
                }

                // Verify schema is valid
                console.log('Verifying schema ', schema, ': ', result);

                // Output summary and shutdown server
                if (--openSchemaCtr <= 0) {
                    verificationSummary(passedAll);
                }
            });
        });
    });
};

// Verification result in unsupervised mode
var verificationSummary = function (success) {
    var exitCode = success ? 0 : 1;

    console.log('\n---\n\nDone\n');

    process.exit(exitCode);
};

// List all views in the project
app.get('/views', function (req, res) {
    if (framework === 'adaptivejs') {
        getAdaptiveViews(function (err, views) {
            if (err || !views || !views.length) {
                res.status(500).send('Error fetching view list.');
            }

            var results = views.map(function (view) {
                var name = view.replace(/\.js/, '');
                var viewPath = ADAPTIVEJS_VIEW_TMPL({name: name});
                var fixturePath = ADAPTIVEJS_FIXTURE_TMPL({name: name});

                return {
                    name: name,
                    viewPath: viewPath,
                    fixturePath: fixturePath
                };
            });

            res.send(results);
        });
    } else if (framework === 'mobifyjs') {
        getKonfTemplates(function (err, views) {
            if (err || !views || !views.length) {
                res.status(500).send('Error fetching view list.');
            }

            var results = views.map(function (name) {
                var fixturePath = MOBIFYJS_FIXTURE_TMPL({ name: name });

                return {
                    name: name,
                    fixturePath: fixturePath,

                    // Mobify.js doesn't have views
                    viewPath: null
                };
            });

            res.send(results);
        });
    }
});

// Return requested schema
app.get('/schema', function (req, res) {

    var name = req.query.name;
    var schemaPath = SCHEMA_TMPL({name: name});

    if (schemaPath) {
        fs.readFile(schemaPath, function (err, fileContents) {
            // This can be an expected result, like when we're creating it for
            // the first time. Not an error, per se.
            var isMissing = err && err.code === 'ENOENT';

            var savedSchema;

            if (err && !isMissing) {
                res.status(500).send('Error reading schema');
            } else if (isMissing) {
                res.send(false);
            } else {
                try {
                    savedSchema = JSON.parse(fileContents);
                } catch (e) {
                    res.status(500).send('Error parsing context: ' + e);
                    return;
                }

                // We send the generated schema at the same time to save on
                // another round-trip request for it
                generateContext(savedSchema.viewPath, savedSchema.fixturePath,
                    function (err, generatedContext) {
                        if (err) {
                            res.status(500).send(err);
                            return;
                        }

                        var savedContext = JSON.parse(savedSchema.savedContext);

                        res.send({
                            fixturePath: savedSchema.fixturePath,
                            viewPath: savedSchema.viewPath,
                            ignoredKeys: savedSchema.ignoredKeys || [],
                            generatedContext: generatedContext,
                            savedContext: savedContext
                        });
                    });
            }
        });
    } else {
        res.status(500).send('Path argument missing in request');
    }

});

// Save a new/updated schema
app.post('/schema', function (req, res) {
    // Save to schema store
    var body = req.body;

    var schemaPath = SCHEMA_TMPL({name: body.name});

    var viewPath = body.viewPath;
    var fixturePath = body.fixturePath;
    var ignoredKeys = body.ignoredKeys || [];

    var schema = {
        name: body.name,
        viewPath: viewPath,
        fixturePath: fixturePath,
        ignoredKeys: ignoredKeys,
        savedContext: body.savedContext
    };

    // Try to look up directory
    var schemaDir = path.dirname(schemaPath);

    try {
        fs.lstatSync(schemaDir);
    } catch (e) {
        // We assume this is because a directory doesn't exist. Create it.
        fs.mkdirSync(schemaDir);
    }

    // Save to schema folder
    fs.writeFile(schemaPath, JSON.stringify(schema), function (err) {
        if (err) {
            res.status(500).send('Error saving schema: ', err);
            return;
        }

        res.send('Schema saved');
    });
});

// Get generated context for a given view
app.get('/context', function (req, res) {
    var viewPath = req.query.viewPath;
    var fixturePath = req.query.fixturePath;

    generateContext(viewPath, fixturePath, function (err, generatedContext) {
        if (err) {
            res.status(500).send(err);
            return;
        }

        res.send({
            generatedContext: generatedContext
        });
    });

});

http.listen(port, function () {
    console.log('Scheming on ' + SERVER_URL + 'schemer');
});

// Running in CI mode
if (!argv.interactive) {
    verifySchemae();
}
