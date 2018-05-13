const commander = require( "commander" );
const Aigle = require( "aigle" );
const _ = require( "lodash" );
const fs = require( "fs-extra" );
const path = require( "path" );
const Reader = require( "./Reader" );
const Writer = require( "./Writer" );


module.exports = class ConfigBuilder {

	constructor( options ) {
		options = _.extend( {}, options );
		options.readers = _.defaults( options.readers, Reader.getDefaults() );
		options.writers = _.defaults( options.writers, Writer.getDefaults() );

		this._options = options;
		this._config  = {};
	}


	add( input ) {
		// Array, resolve every item independently
		if ( Array.isArray( input ) )
			return Aigle.resolve( input ).eachSeries( ( i ) => this.add( i ) );

		// String, try to load the file
		if ( typeof(input) === 'string' ) {
			let type = null;
			const parsed = input.split( /(?!\\)\#/, 2 );
			if ( parsed.length > 1 ) {
				type  = parsed[1];
				input = input.substr( 0, input.length - (type.length + 1) );
			} else {
				type = path.extname( input ).substr(1);
			}

			const reader = this._options.readers[type];
			if ( !reader )
				throw new Error( "Invalid type "+type );

			return fs.readFile( input, 'utf8' )
				.then( ( content ) => reader.call( null, content ) )
				.then( ( config ) => this.add( config ) );
		}

		// Function, call the function
		if ( typeof(input) === 'function' ) {
			return Promise.resolve( input.call( null ) )
				.then( ( config ) => this.add( config ) );
		}

		// Object, merge
		if ( typeof(input) === 'object' ) {
			this._mergeObject( input );
			return;
		}
	}

	_mergeObject( obj ) {
		_.merge( this._config, obj );
	}

	write( output ) {
		console.log( this._config );
	}

	static runFromArgv( argv ) {
		const program = new commander.Command;
		program
			.version( '0.0.1' )
			.option( '-o, --output <paths>', "Output files", collect, [] )
			.arguments( '[inputs...]' )
			.parse( argv );
		return this.runFromOptions( program.args[0], program.output, {} );
	}

	static runFromOptions( input, output, options ) {
		const builder = new ConfigBuilder( options );
		return Promise.resolve()
			.then( () => builder.add( input ) )
			.then( () => builder.write( output ) )
			.then( () => true );
	}

};

// Collect for argument
function collect(val, memo) {
	memo.push(val);
	return memo;
}