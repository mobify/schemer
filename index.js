#!/usr/bin/env node

// Leaves the server running to be accessible in the browser, as opposed to
// running in a script on a CI environment
var interactive = process.argv.indexOf('--interactive') > -1;

var _ = require('lodash');

// Schemer Settings
const SERVER_PORT = 3000;
const SERVER_URL = 'http://localhost:3000/';

// Generates context for a given view with a fixture
const CONTEXT_MOCKER_URL = 'phantom/index.html';

// Adaptive project folders
const VIEWS_DIR = './adaptation/views';
const SCHEMA_DIR = './schemae';

const VIEW_TMPL = _.template('adaptation/views/<%- name %>');
const FIXTURE_TMPL = _.template('tests/fixtures/<%- name %>.html');
const SCHEMA_TMPL = _.template('./schemae/<%- name %>.json');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var path = require('path');
var colors = require('colors');

var childProcess = require('child_process');
var phantomPath = require('phantomjs').path;

var fs = require('fs');

// Serve the Adaptive.js project whose folder we're in
// TODO: Where/how are we using these?
app.use('/', express.static('.'));
app.use('/tests/', express.static('/tests'));

// Schemer app paths
app.use('/schemer/', express.static(__dirname + '/app'));
app.use('/node_modules/', express.static(__dirname + '/node_modules'));
app.use('/bower_components/', express.static(__dirname + '/bower_components'));
app.use('/phantom/', express.static(__dirname + '/phantom'));

// For parsing application/x-www-form-urlencoded. 1MB limit needed because our
// contexts get pretty big.
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '1mb'
}));

// API
// ---
//

var getContext = function(viewPath, fixturePath, cb) {
    var generatorPath = SERVER_URL + CONTEXT_MOCKER_URL;
    var pathString = '#viewPath=' + viewPath + '&fixturePath=text!' + fixturePath;

    // First verify fixture exists
    fs.readFile(fixturePath, function(err, fixture) {
        if (err) {
            cb('Missing fixture');
            return;
        }

        var ctx;
        var args = [
            path.join(__dirname, '/phantom/main.js'),
            generatorPath + pathString
        ];

        // TODO: Reuse PhantomJS instance
        childProcess.execFile(phantomPath, args, {
            // Max context string length
            maxBuffer: 1024 * 1024
        }, function(err, stdout, stderr) {
            if (err || stderr) {
                console.error(err);
                cb(err.message || stderr);
                return;
            }

            try {
                ctx = JSON.parse(stdout);

                cb(null, ctx);
            } catch(e) {
                cb('Unexpected output while generating context: ' + stdout);
            }
        });
    });
};

// List all views in Adaptive project
var getViews = function(cb) {
    fs.readdir(VIEWS_DIR, function(err, views) {
        cb(err, views);
    });
};

var getSchemae = function(cb) {
    fs.readdir(SCHEMA_DIR, function(err, schemae) {
        cb(err, schemae);
    });
};

var verifySchema = function(schema, cb) {
    fs.readFile(SCHEMA_DIR + '/' + schema, { encoding: 'utf8' }, function(err, contents) {
        if (err || !contents) {
            console.error('Error reading schema ' + schema + ': ', err);
            cb(false);
        }

        try {
            var savedSchema = JSON.parse(contents);

            var viewName = savedSchema.name;
            var viewPath = savedSchema.viewPath;
            var fixturePath = savedSchema.fixturePath;

            getContext(viewPath, fixturePath, function(err, generatedContext) {
                if (err || !generatedContext) {
                    console.error('Error generating context for ', viewName, err);
                    cb(false);
                    return;
                }

                cb(_.matches(savedSchema)(generatedContext));
            });
        } catch(e) {
            console.error('Error reading saved schema ', schema, ': ', err);
            cb(false);
        }
    });
};

// Verify all the saved schemae in the project against their counterparts
var verifySchemae = function() {
    getSchemae(function(err, schema) {
        // Schemae we're waiting to verify
        var openSchemaCtr = schema.length;

        if (err || !schema) {
            console.error('Error fetching schemae.', err);
            return;
        }

        schema.forEach(function(schema) {
            verifySchema(schema, function(schemaMatch) {
                var result = schemaMatch ? 'PASS'.green: 'FAIL'.red;

                // Verify schema is valid
                console.log('Verifying schema ', schema, ': ', result);

                // Output summary and shutdown server
                if (--openSchemaCtr <= 0) {
                    console.log('\n---\n\nDone\n');
                    http.close();
                }
            });
        });
    });
};

// Get information about the project
app.get('/project', function(req, res) {
    fs.readFile('package.json', function(err, data) {
        if (err) {
            req.status(400).send('Cannot find project package.json file');
            return;
        }

        var pjson = JSON.parse(data);

        // TODO: Add Mobify.js compatibility
        var framework = {
                name: 'adaptivejs',
                version: pjson.dependencies.adaptivejs
            };

        res.send({
            name: pjson.name,
            framework: framework
        });
    });
});

// List all Adaptive.js views in the project
app.get('/views', function(req, res) {
    getViews(function(err, views) {
        if (err || !views || !views.length) {
            res.status(500).send('Error fetching view list.');
        }

        res.send(views);
    });
});

// Return requested schema
app.get('/schema', function(req, res) {
    var name = req.query.name;
    var schemaPath = SCHEMA_TMPL({ name: name });

    if (schemaPath) {
        fs.readFile(schemaPath, function(err, fileContents) {
            // This can be an expected result, like when we're creating it for
            // the first time. Not an error, per se.
            var isMissing = err && err.code === 'ENOENT';

            var savedSchema, savedContext;

            if (err && !isMissing) {
                res.status(500).send('Error reading schema');
            } else if(isMissing) {
                res.send(false);
            } else {
                try {
                    savedSchema = JSON.parse(fileContents);
                    savedContext = JSON.parse(savedSchema.savedContext);

                    getContext(savedSchema.viewPath, savedSchema.fixturePath, function(err, generatedContext) {
                        if (err) {
                            res.status(500).send(err);
                            return;
                        }

                        res.send({
                            fixturePath: savedSchema.fixturePath,
                            viewPath: savedSchema.viewPath,
                            generatedContext: generatedContext,
                            savedContext: savedContext
                        });
                    });
                } catch(e) {
                    res.status(500).send('Error parsing context: ' + e);
                    return;
                }
            }
        });
    } else {
        res.status(500).send('Path argument missing in request');
    }
});

// Save a new/updated schema
app.post('/schema', function(req, res) {
    // Save to schema store
    var body = req.body;

    var schemaPath = SCHEMA_TMPL({ name: body.name });

    // The view and fixture path are missing when we first create the schema,
    // so we locate them.
    var viewPath = body.viewPath || VIEW_TMPL({ name: body.name });
    var fixturePath = body.fixturePath || FIXTURE_TMPL({ name: body.name });

    var schema = {
        name: body.name,
        viewPath: viewPath,
        fixturePath: fixturePath,
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
    fs.writeFile(schemaPath, JSON.stringify(schema), function(err) {
        if (err) {
            res.status(500).send('Error saving schema: ', err);
            return;
        }

        res.send('Schema saved.');
    });
});

// Get context for a given view
app.get('/context', function(req, res) {
    var viewName = req.query.viewName;

    var viewPath = VIEW_TMPL({ name: viewName });
    var fixturePath = FIXTURE_TMPL({ name: viewName });

    getContext(viewPath, fixturePath, function(err, generatedContext) {
        if (err) {
            res.status(500).send(err);
            return;
        }

        res.send({
            generatedContext: generatedContext
        });
    });
});

http.listen(SERVER_PORT, function() {
    console.log('Scheming on ' + SERVER_URL + 'schemer');
});

if (!interactive) {
    verifySchemae();
}
