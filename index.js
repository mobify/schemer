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

// List all Adaptive.js views in the project
app.get('/views', function(req, res) {
    fs.readdir('./adaptation/views', function(err, files) {
        res.send(files);
    });
});

// Return requested schema
app.get('/schema', function(req, res) {
    var schemaPath = './' + req.query.path;

    if (schemaPath) {
        fs.readFile(schemaPath, function(err, data) {
            // Missing file (not an actual error), or error?
            var errorCode = err && err.code === 'ENOENT' ? 404 : 500;

            if (err) {
                res.status(errorCode).send('Error reading schema');
            } else {
                res.send(data);
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

    if (body.path && body.context) {
        // Save to schema folder
        fs.writeFile(body.path, body.context, function(err) {
            if (err) { throw err; }

            res.send('Your offering pleases me.');
        });
    } else {
        res.status(400)
            .send('What is the meaning of this travesty?! ' +
            'Either the path or context is missing.');
    }
});

// Get context for a given view
app.get('/context', function(req, res) {
    // TODO: Path should be generated via configuration option
    var generatorPath = SERVER_URL + CONTEXT_MOCKER;
    var paths = req.query;

    var viewName = req.query.viewName;

    /* TODO: Template these as a configuration setting, so that we can swap
    out for Adaptive 2.0
     */
    var viewPath = 'adaptation/views/' + viewName;
    var fixturePath = 'tests/fixtures/' + viewName + '.html';

    var pathString = '#viewPath=' + viewPath + '&fixturePath=text!' + fixturePath;

    var getContext = function() {
        // First verify fixture exists
        fs.readFile(fixturePath, function(err, fixture) {
            var is404 = err && err.code === 'ENOENT';

            if (err && !is404) {
                res.status(500).send('Error reading fixture');
                return;
            } else if(err && is404) {
                res.send(false);
                return;
            }

            var args = [
                path.join(__dirname, '/phantom/main.js'),
                generatorPath + pathString
            ];

            console.log('Spawning PhantomJS');

            // Don't spawn every time, if possible
            childProcess.execFile(phantomPath, args, function(err, stdout, stderr) {
                if (err) {
                    throw err;
                }

                res.send({
                    generatedContext: JSON.parse(stdout)
                });
            });
        });
    };

    if (viewPath && fixturePath) {
        getContext();
    } else {
        res.status(500).send('Missing view or fixture path!');
    }
});

http.listen(SERVER_PORT, function() {
    console.log('scheming on ' + SERVER_URL);
});
