(function() {
    console.log('Context Mocker Ready');
    var fixturePath = window.fixturePath || location.hash.match(/fixturePath=([^\s]+)/)[1];
    var el = document.getElementById('fixture');

    // Wait for response from mobify-client
    window.addEventListener('message', function(e) {
        var response = e.data;
        console.log('Received response from mobify-client. ', e.origin);

        // Verify that message is from mobify-client
        if (e.origin !== 'http://localhost:3000' || typeof response !== 'object') {
            return;
        }

        console.log('Sending response: ', window.callPhantom);

        // Let the Schemer server know we're done
        window.callPhantom && window.callPhantom(response.context);
    }, false);

    // Load the page
    el.src = fixturePath;
})();