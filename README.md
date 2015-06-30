Schemer
=======

![Image](app/images/schemer.gif)

Schema comparison tool for Adaptive.js 1.x and Mobify.js 1.x projects.

## What's a schema?

A schema is a context against a view/fixture pair, with some metadata. In other
 words, the schema will contain: 
 
 - The schema name
 - The view path the schema was generated with (relative to project folder). 
   Not applicable for Mobify.js projects.
 - The fixture path the schema was generated with (relative to project folder)
 - The generated context of the view with the fixture

## What does this tool do?

It allows you to compare the context in the saved schema against the current
context, and highlights any discrepancies, surfacing unintended changes to a 
view.

In other words, it lets the developer know if they've accidentally broken 
something when changing the view.

## Installation

Add a reference to the Schemer repo in your project's package.json and run
`npm install` and `bower install`. 

You can install the current development branch in the repo by adding this:

`"schemer": "git+ssh://git@github.com:mobify/schemer.git#development"`

### Mobify.js Support

In order to run Schemer against Mobify.js projects, a custom version of the 
mobify-client is provided in the vendor folder. You'll also need to run 
`npm install` in the vendor/mobify-client folder to install mobify-client 
dependencies.

## Usage

In the project directory, run the following command:

    ./node_modules/schemer/index.js [--interactive] [--framework=adaptivejs|mobifyjs] [--port XYZ]

 **--interactive**: Run Schemer in interactive mode, accessible on 
 http://localhost:3000/schemer.
 
 **--port**: Specify the port to run schemer on
 
 **--framework**: Either `adaptivejs` (default) or `mobifyjs`.
 
**Remember to run `grunt preview` or `grunt build_dev` in your project before
 running Schemer!

### Interactive Mode

You can run Schemer in a browser when creating/reviewing schemae. This is useful
during development. Navigate to schemer on http://localhost:3000 (or whatever
port you've specified) to see a list of the schemae. 
 
Click the `create` button if a schema has not been created yet. This assumes 
that a fixture for the view (of the same name) exists in the project 
`tests/fixtures` folder. So, to create a schema for a view named 'home', Schemer
will expect a fixture `tests/fixtures/home.html` in the project folder.
  
If the saved schema doesn't match the current state, click the `review` button
to view the differences, and accept the ones that are intentional.

You can also ignore a change, if that key is expected to always fail. An example
would be a key that returns a title including the present date, for example. 
Since that will always differ from the saved value, you can ignore that key to
exclude it from the comparison.

Ignored keys are listed in the review page, and can be removed by being clicked 
on.

### Mobify.js

In order to use Schemer with mobify.js, you need to have a folder `fixtures`
 within your project `src` folder, with fixtures matching the template name of
 each template.
 
You will need to run a custom version of the mobify-client you've installed. For
instance, you would run the following command in *your mobify.js project 
directory* (instead of `mobify preview`):

`[schemer-folder]/vendor/mobify-client/bin/mobify.js preview`
 
Additionally, you will need to replace the standard Mobify tag within the 
fixtures to the one provided in the `phantom/mobifyjs/tag.js`. This tag will
negate the need to preview using preview.mobify.com, and will always load the
bundle at http://localhost:8080/mobify.js

### Unsupervised/CI Mode

Schemer can run in unsupervised mode to allow integration with a continuous
integration (CI) environment like CircleCI. When running in this mode, Schemer
will run through all the saved schemae, and output results for the verification.

Schemer cannot create/edit schemae in this mode.

To integrate Schemer into your CircleCi environment, point to the Schemer 
script in your circle.yml file:

*Example*:
```
test:
    pre:
        - grunt preview:
        background: true
        - sleep 5
    override:
        - grunt test
        - ./node_modules/schemer/index.js
```

## Folder Structure

- index.js (entry point):
    - Spins up an Express server with a Backbone app
    - Creates a REST interface that:
        - Lists views (GET /views)
        - Retrieves a saved schema (GET /schema/x.json)
        - Saves a new/updated schema (POST /schema/) with the new schema content and path
        - Generates a context for a view (GET /context) with the view name. Spins
          up a PhantomJS instance to run Adaptive.js on a given view/fixture 
- app/:
    - Contains the Backbone app that consumes the REST API
- phantom/:
    - adaptivejs/: Contains Adaptive context mocker
    - mobifyjs/: Contains Mobify.js context mocker
- tests: Schemer tests
- vendor/mobify-client/:
    - Custom (read hacked) version of mobify-client that allows mobify.js to 
    report its context to Schemer. The modifications are in the 
    vendor/mobify-js/1.x/api/main.js and cont.js files.
    
    **cont.js**: The choose method sends a list of views to Schemer, to be used in
    phantom/mobifyjs/viewList.js
    
    **main.js**: The acceptData method sends the evaluated context to Schemer.
    
    Note: The 1.2 version is not included, because it didn't seem to be in
     actual use in projects. If this is incorrect, please open a PR :) 