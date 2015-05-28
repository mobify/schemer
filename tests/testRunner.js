require(['config'], function(){
    require(['require',
             'chai',
             'mocha'],
    function(require, chai, mocha){

        var tests = [
            'tests/unit/context',

            'tests/integration/schemer'
        ];

        require(tests, function() {
            assert = chai.assert;
            if(window.mochaPhantomJS) {
                return window.mochaPhantomJS.run();
            }
            mocha.timeout(2000);
            mocha.run();
        });
    });
});
