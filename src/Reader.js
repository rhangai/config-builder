const Util = require( "./Util" );
module.exports = class Reader {

	static getDefaults() {
		return {
			js:    Reader.readJs,
			json:  Reader.readJson,
			json5: Reader.readJson,
			yml:   Reader.readYaml,
			yaml:  Reader.readYaml,
		}
	}

	static readJs( input ) {
		const vm = require( "vm" );
		const context = { 
			require: require,
			process: { env: process.env },
			module: { exports: {} },
		};
		vm.runInNewContext( input, context );
		return context.module.exports;
	}
	
	static readJson( input ) {
		const JsonLib = Util.tryRequire( "json5" ) || JSON;
		return JsonLib.parse( input );
	}

	static readYaml( input ) {
		const YAML = Util.require( "js-yaml", "Cannot read yaml files" );
		return YAML.safeLoad( input );
	}

};