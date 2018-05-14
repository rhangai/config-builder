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
			process: { env: process.env },
			module: { exports: {} },
		};
		vm.runInNewContext( input, context );
		return context.module.exports;
	}
	
	static readJson( input ) {
		const JSON5 = require( "json5" );
		return JSON5.parse( input );
	}

	static readYaml( input ) {
		const YAML = require( "js-yaml" );
		return YAML.safeLoad( input );
	}

};