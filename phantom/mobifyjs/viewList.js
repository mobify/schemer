(function() {
    // Wait for response from mobify-client
    window.addEventListener('message', function(e) {
        var response = e.data;

        // Verify that message is from mobify-client
        // Note: Unlike the contextMocker, we just run this on the page. We
        // don't actually match any context keys, but we don't care, because we
        // just want the context choice list.
        if (e.origin !== 'http://localhost:3000' || typeof response !== 'object') {
            return;
        }

        // Let the Schemer server know we're done
        window.callPhantom && window.callPhantom(JSON.stringify(response.views));
    }, false);
})();