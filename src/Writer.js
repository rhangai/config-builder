const _ = require( "lodash" );
module.exports = class Writer {

	static getDefaults() {
		return {
			js:   Writer.writeJs,
			json: Writer.writeJson,
			stdout: Writer.writeStdout,
			yaml: Writer.writeYaml,
			yml:  Writer.writeYaml,
			php:  Writer.writePHP,
		}
	}
	
	static writeJs( config ) {
		return `module.exports = ${JSON.stringify( config, null, '\t' )}\n`;
	}
	
	static writeJson( config ) {
		return JSON.stringify( config );
	}

        static writeStdout( config ) {
		const prettyjson = require( "prettyjson" );
		return prettyjson.render( config, { inlineArrays: true } );
                return JSON.stringify( config, null, "  " );
        }

	static writeYaml( config ) {
		const YAML = require( "js-yaml" );
		return YAML.safeDump( config );
	}
	static writePHP( config ) {
		return "<?php\nreturn "+Writer.writePHPValue( config );
	}
	static writePHPValue( value, identChar, identLevel ) {
		identChar  = identChar || "\t";
		identLevel = identLevel|0;
		if ( Array.isArray( value ) ) {
			const identSelf = _.repeat( identChar, identLevel );
			const ident     = identSelf+identChar;
			return "array(\n" + value.map( (i) => ident + Writer.writePHPValue( i, identChar, identLevel + 1 ) ).join( ",\n" ) + ",\n"+identSelf+")";
		} else if ( typeof(value) === 'object' ) {
			const identSelf = _.repeat( identChar, identLevel );
			const ident     = identSelf+identChar;
			const body      = _.map( value, ( item, key ) => {
				key  = JSON.stringify( key );
				item = Writer.writePHPValue( item, identChar, identLevel + 1 );
				return ident + key + " => " + item;
			}).join( ",\n" );
			return "array(\n" + body + ",\n"+identSelf+")";
		}
		return JSON.stringify( value );
	}
};
