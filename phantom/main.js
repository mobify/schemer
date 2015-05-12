var system = require('system');
var page = require('webpage').create();
var args = system.args;
var url = args[1];

bindEvents();
openPage();

function bindEvents() {
    page.onError = function(msg, trace) {
        console.error('Error :', msg);

        phantom.exit();
    };

    page.onCallback = function(data) {
        console.log(data);

        phantom.exit();
    };
}

function openPage() {
    page.open(url);
}
