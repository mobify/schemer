require(['config/config'], function() {
    require(['backbone-routers/router'],
        function(Router) {
            new Router();
        }
    );
});
