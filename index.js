#!/usr/bin/env node

const SERVER_PORT = 3000;
const SERVER_URL = 'http://localhost:3000/';
const MOCK_VIEW_PATH = 'phantom/index.html';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');

var fs = require('fs');

// Serve the Adaptive.js project whose folder we're in
app.use('/', express.static('.'));
app.use('/tests/', express.static('/tests'));

// Schemer paths
app.use('/schemer/', express.static(__dirname + '/app'));
app.use('/node_modules/', express.static(__dirname + '/node_modules'));
app.use('/phantom/', express.static(__dirname + '/phantom'));

// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '1mb'
}));

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
    var generatorPath = SERVER_URL + MOCK_VIEW_PATH;
    var paths = req.query;

    var viewPath = paths.viewPath;
    var fixturePath = paths.fixturePath;

    // Pass directly to PhantomJS
    var pathString = '#viewPath=' + viewPath +
        '&fixturePath=text!' + fixturePath;

    var path = require('path');
    var childProcess = require('child_process');
    var phantomjs = require('phantomjs');
    var phantomPath = phantomjs.path;

    var getContext = function() {
        // First verify fixture exists
        fs.readFile(fixturePath, function(err, fixture) {

            if (err) {
                var errorCode = err && err.code === 'ENOENT' ? 404 : 500;
                var errorMessage = errorCode === 404 ? 'Missing fixture' : 'Error reading fixture';
                res.status(errorCode).send(errorMessage);

                return;
            }

            console.log('Path: ', generatorPath + pathString);

            var args = [
                path.join(__dirname, '/phantom/main.js'),
                generatorPath + pathString
            ];

            console.log('Preparing to spawn PhantomJS');

            // Don't spawn every time, if possible
            childProcess.execFile(phantomPath, args, function(err, stdout, stderr) {
                if (err) {
                    throw err;
                }

                console.log('Received context');

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
