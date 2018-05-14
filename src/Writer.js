module.exports = class Writer {

	static getDefaults() {
		return {
			js:   Writer.writeJs,
			json: Writer.writeJson,
			yaml: Writer.writeYaml,
			yml:  Writer.writeYaml,
		}
	}
	
	static writeJs( config ) {
		return `module.exports = ${JSON.stringify( config, null, '\t' )}\n`;
	}
	
	static writeJson( config ) {
		return JSON.stringify( config );
	}

	static writeYaml( config ) {
		const YAML = require( "js-yaml" );
		return YAML.safeDump( config );
	}
};