require(['config/config'], function() {
    require(['backbone-routers/router'],
        function(Router) {
            // Adaptive.$ </3 jQuery
            jQuery.noConflict();

            new Router();
        }
    );
});
