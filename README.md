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

Advanced options
------------------

A file can also be of another type, by using the `:` modifier.

By running `config-builder test.txt:json`, the file test.txt will be treated as a json. The same is valid for output files: `config-build input.json -o output.ext:yaml`


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