#!/usr/bin/env node

// Schemer Settings
const SERVER_PORT = 3000;
const SERVER_URL = 'http://localhost:3000/';

// Generates context for a given view with a fixture
const CONTEXT_MOCKER = 'phantom/index.html';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var path = require('path');

var childProcess = require('child_process');
var phantomPath = require('phantomjs').path;

var fs = require('fs');

var getContext = function(viewPath, fixturePath, cb) {
    var generatorPath = SERVER_URL + CONTEXT_MOCKER;
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

// Serve the Adaptive.js project whose folder we're in
app.use('/', express.static('.'));
app.use('/tests/', express.static('/tests'));

// Schemer app paths
app.use('/schemer/', express.static(__dirname + '/app'));
app.use('/node_modules/', express.static(__dirname + '/node_modules'));
app.use('/bower_components/', express.static(__dirname + '/bower_components'));
app.use('/phantom/', express.static(__dirname + '/phantom'));

// For parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '1mb'
}));

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
    fs.readdir('./adaptation/views', function(err, views) {
        if (err || !views || !views.length) {
            res.status(500).send('Error fetching view list.');
        }

        res.send(views);
    });
});

// Return requested schema
app.get('/schema', function(req, res) {
    var schemaPath = './' + req.query.path;
    var viewPath = req.query.viewPath;
    var fixturePath = req.query.fixturePath;

    if (schemaPath) {
        fs.readFile(schemaPath, function(err, fileContents) {
            // Not a real error
            var savedContext;
            var is404 = err && err.code === 'ENOENT';

            if (err && !is404) {
                res.status(500).send('Error reading schema');
            } else if(is404) {
                res.send(false);
            } else {
                savedContext = JSON.parse(fileContents);

                getContext(viewPath, fixturePath, function(err, generatedContext) {
                    if (err) {
                        res.status(500).send(err);
                        return;
                    }

                    res.send({
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
app.post('/schema', function(req, res) {
    // Save to schema store
    var body = req.body;

    // Try to look up directory
    try {
        stats = fs.lstatSync(path.dirname(body.path));
    }
    catch (e) {
        // We assume this is because a directory doesn't exist. Create it.
        fs.mkdirSync(path.dirname(body.path));
    }

    // Save to schema folder
    if (body.path && body.context) {
        fs.writeFile(body.path, body.context, function(err) {
            if (err) { throw err; }

            res.send('Schema saved.');
        });
    } else {
        res.status(400).send('Either the path or context is missing.');
    }
});

// Get context for a given view
app.get('/context', function(req, res) {
    var viewPath = req.query.viewPath;
    var fixturePath = req.query.fixturePath;

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
    console.log('scheming on ' + SERVER_URL);
});
