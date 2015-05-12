require.config({
    baseUrl: '/',
    paths: {
        // Schema App
        'backbone': 'node_modules/backbone/backbone',
        'backbone-routers': '/schemer/js/routers',
        'backbone-views': '/schemer/js/views',
        'backbone-collections': '/schemer/js/collections',
        'backbone-templates': '/schemer/js/templates',
        'backbone-models': '/schemer/js/models',
        'backbone-app': '/schemer/js/app',

        'jquery': 'bower_components/jquery/dist/jquery',
        'underscore': 'node_modules/underscore/underscore',
        'lodash': 'node_modules/lodash/dist/lodash',
        'jsondiffpatch': 'node_modules/jsondiffpatch/public/build/jsondiffpatch-full',
        // jsondiffpatch expects the module to be named as `formatters`
        'formatters': '/schemer/js/vendor/custom-formatter',
        'toastr': 'bower_components/toastr/toastr',

        'text': 'node_modules/text/text'
    },
    shim: {
        'dust-core': {
            'exports': 'dust'
        },
        'dust-full': {
            'exports': 'dust'
        },
        'baseSelectorLibrary': {
            'exports': '$'
        },
        'jsondiffpatch': {
            'deps': ['formatters'],
            'exports': 'jsondiffpatch'
        }
    },
    glob: {
        middlewarePathPrefix: '/'
    }
});
