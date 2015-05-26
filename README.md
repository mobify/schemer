Schemer
=======

![Image](app/images/schemer.gif)

Schema comparison tool for Adaptive.js 1.0 projects.

## What's a schema?
A schema is a context against a view/fixture pair, with some metadata. In other
 words, the schema will contain: 
 
 - The schema name
 - The view path the schema was generated with (relative to project folder)
 - The fixture path the schema was generated with (relative to project folder)
 - The generated context of the view with the fixture

## What does this tool do?
It allows you to compare the context in the saved schema against the current
context, and highlights any discrepancies, surfacing unintended changes to a 
view.

In other words, it lets the developer know if they've accidentally broken 
something when changing the view.

[ Add an example of use here ]

## Installation
Install from NPM, or checkout this repo and run `npm link`. The `schemer` 
command should now be available globally. 
 
## Usage

`schemer [--interactive] [--port XYZ]`

 - **--interactive**: Run Schemer in interactive mode
 - **--port**: Specify the port to run schemer on

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
Since that'll always differ from the saved value, you can ignore that key to
exclude it from the comparison.

### Unsupervised Mode
Schemer can run in unsupervised mode to allow integration with a continuous
integration (CI) environment like CircleCI. When running in this mode, Schemer
will run through all the saved schemae, and output results for the verification.

Schemer cannot create/edit schemae in this mode.

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
    - index/contextMocker: Used by index.js to generate the mock context for a 
      given view  