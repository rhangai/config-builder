ConfigBuilder
==============================

Create your configuration files with ease.

Installation
--------------------------
```sh
npm install --save-dev "@renanhangai/config-builder"
# or
yarn add --dev "@renanhangai/config-builder"
```

Usage 
----------

```sh
config-builder [inputs...] -o outputfile
```

### Types ###

Every file will be parsed/written according to its extension. The following types are supported:

| Type  | Input | Output |
| ----- | ----- | -----  |
| js    | Y     | Y      |
| json  | Y     | Y      |
| json5 | Y     | N      |
| yaml  | Y     | Y      |
| php   | N     | Y      |

```sh
# Reading
config-builder input.json
config-builder input.default.json +input.yml
config-builder input.default.json input2.yml +custom.json +env.json

# Writing
config-builder [inputs...] -o file.js
config-builder [inputs...] -o file.yml
config-builder [inputs...] -o file.php
```

Processing
-----------
Inputs will merged, and processed by using the doT template syntax. And keys starting with `$` are skipped.

### `input.json`
```json
{
  "$database": {
    "name":     "my_database",
    "host":     "localhost",
    "username": "root",
    "password": "root"
  },
  "mysql": {
    "dns": "mysql:dbname={{= it.$database.name }};host={{= it.$database.host }};port={{= it.$database.port || 3316 }};charset=utf8",
    "username": "{{= it.$database.username }}",
    "password": "{{= it.$database.password }}"
  },
  "sh": {
    "cmd": "mysql",
    "args": [
      "-u", "{{= it.$database.username }}",
      "-p{{= it.$database.password }}",
      "{{= it.$database.name }}"
    ]
  }
}
```

When run `config-builder input.json`, will output
```json
{
  "mysql": {
    "dns": "mysql:dbname=my_database;host=localhost;port=3316;charset=utf8",
    "username": "root",
    "password": "root"
  },
  "sh": {
    "cmd": "mysql",
    "args": [
      "-u",
      "root",
      "-proot"
      "my_database"
    ]
  }
}
```

You can access the environment variables with `it.$env` (Therefore you cannot overwrite it with your settings)

Inline Configuration
----------

Inline configuration is a way to provide inline
```sh
config-builder debug=false
# { debug: false }

config-builder input.json '$database.password=123456'
# {
#   "mysql": {
#     "dns": "mysql:dbname=my_database;host=localhost;port=3316;charset=utf8",
#     "username": "root",
#     "password": "123456"
#   },
#   "sh": {
#     "cmd": "mysql",
#     "args": [
#       "-u",
#       "root",
#       "-p123456",
#       "my_database"
#     ]
#   }
# }
```

Optional Inputs
--------

All inputs are mandatory, but sometimes it is useful to have optional config files to overwrite your configuration if they exist. In that case, you can:
```sh
config-builder input.default.json +input.json
```

Then, the file `input.json` will not be required, and will not throw in the case it does not exists.

Environment variable inputs
--------

If the input begins with `$`, then it will be read directly from process.env
```sh
config-builder \$MY_CONFIG_FILE
```

Then, the input will be used as process.env.MY_CONFIG_FILE

Asking for questions
--------

This modules also uses the inquirer to prompt for values

Create a `questions.js` file:
```js
module.exports = [{
  "type": "input",
  "name": "username",
  "message": "What is your username?"
}]
```

Then an input config:
```json
{
  "db": {
    "username": "{{= it.$answers.name }}",
  }
}
```

If the name is something like: `$env.MY_VAR`, then the environment variable will be overwritten and the default value will be the current environment value

Output directory
--------

You can pass an `--output-dir` parameter to output files on the given directory
```sh
config-builder test.json --output-dir build/configs -o config.json -o config.yml
```

The files will be generated as `build/configs/config.json` and `build/configs/config.yml`

There is an option to pass an output dir as a list of paths, so the last valid path will be used (good with environmental variables). Ex:
```sh
config-builder test.json --output-dir "dist:config" -o output.json
config-builder test.json --output-dir "dist:$OUTPUT_DIR" -o output.json
```
On the first case `dist:config` will be split into `[ "dist", "config" ]`, as both are valid paths, but `config` comes after, the file will be generated as `config/output.json`

On the second one `dist:$OUTPUT_DIR` will be expandaded, and if OUTPUT_DIR is empty, it will be `dist:` -> `["dist", ""]`

Extending configuration
--------

If the input configuration have the property `$extends` it will be loaded before the current file. May be anything such as the arguments above.

```json
{
  "$extends": "other.json",
  "debug": false
}
```

```json
// other.json
{
  "$extends": "other.json",
  "debug": true,
  "example": 10
}
```

If you run `config-build input.json` the output will be `{ debug: false, example: 10 }`


Advanced options
------------------

A file can also be of another type, by using the `:` modifier.

By running `config-builder test.txt:json`, the file test.txt will be treated as a json. The same is valid for output files: `config-build input.json -o output.ext:yaml`


Template compiling
------------------

You can also use the config builder to compile template files using the dot compiler

```sh
# Generate the file.txt by compiling the file.template.txt
config-builder input.json -t ./file.template.txt:./file.txt
```

Template compiling .env files
------------------

Supose you have an env file: `env.template`
```.env
# Mode
APP_ENV=development
DB_HOST=my-db-host
```

```sh
config-builder input.json -t env.template:.env:env
```

API
-------------------

You can also use the builder programatically.

```js
const ConfigBuilder = require( "@renanhangai/config-builder" );

ConfigBuilder.run( [ "fileA.json", "fileB.yml" ], "output.json" )
	.then( function( config ) {
		console.log( "Files written." );
	});
```

Docker
-----------------

There is an image available to use with docker if you do not wish to install node on your machine.

```sh
docker run --rm -i renanhangai/config-builder --help
```
You can even alias it: `alias config-builder="docker run --rm -i renanhangai/config-builder"`

In case you are developing automated scripts with it, i recommend you sourcing:
```bash
# Include script
CONFIG_BUILDER_IMAGE=renanhangai/config-builder
eval $(docker run --rm -i "${CONFIG_BUILDER_IMAGE}" --shell docker-bash)

# Run the config-builder
config-builder ...

# If you with to pass environment variables to the build, you must whitelist as docker does not read by default the current env
CONFIG_BUILDER_WHITELIST="DEBUG MY_VAR" config-builder ...
```