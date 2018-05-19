ConfigBuilder
==============================

Usage 
----------

```sh
config-builder [inputs...] -o output.config.json
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