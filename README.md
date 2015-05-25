Schemer
=======

![Image](app/images/schemer.gif)

Schema comparison tool for Adaptive.js 1.0 projects.

## What's a schema?
A schema's the saved context values for an Adaptive.js view. This represents the
state of a saved fixture (essentially the saved page the view is intended for),
when the view is applied to it.

## What does this tool do?
It allows you to compare the saved schema against the current version, and 
highlights any variations, surfacing unintended changes to the schema.

## What's the difference between a `schema` and a `context`? 
A schema is a context against a view/fixture pair, with some metadata. In other
 words, the schema will contain: 
 
 - The schema name
 - The view path the schema was generated with (relative to project folder)
 - The fixture path the schema was generated with (relative to project folder)
 - The generated context of the view with the fixture

## Installation
Install from NPM, or checkout this repo and run `npm link`. The `schemer` 
command should now be available globally. 
 
## How to use
Run `schemer` in an Adaptive project directory. This will spin up a local server
at http://locahost:3000/schemer. 

Open the page in a browser to list the views of a project and see the status of
schemas for the project. Click the `create` button if a schema has not been
created yet. This assumes that a fixture for the view exists in the project
`tests/fixtures` folder.
 
If the saved schema doesn't match the current state, click the `review` button
to view the differences, and accept the ones that are intentional.
 
## Using in a project
Run Schemer and generate a schema for a view after a view development is 
complete. Any time after that, run schemer to verify that the schema for the
view is correct. 

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