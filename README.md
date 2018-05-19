ConfigBuilder
==============================

Configuration helper.

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
config-builder [inputs...] -o output.config.json
```

Processing
-----------
Inputs will be processed by using the doT template syntax. And keys starting with `$` are skipped.

### input.json
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

Will output
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

Types
----------

Every file will be parsed/written according to its extension. The following types are supported:

| Type  | Input | Output |
| ----- | ----- | -----  |
| js    | Y     | Y      |
| json  | Y     | Y      |
| json5 | Y     | N      |
| yaml  | Y     | Y      |
| php   | N     | Y      |

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