require.config({
    baseUrl: '../',
    paths: {
        'chai': 'node_modules/chai/chai',
        'mocha': 'node_modules/mocha/mocha'
    },
    'shim': {
        'mocha': {
            init: function() {
                this.mocha.setup('bdd');
                return this.mocha;
            }
        }
    }
});
