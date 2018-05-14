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
		options.cwd = options.cwd || process.cwd();
		options.readers = _.defaults( options.readers, Reader.getDefaults() );
		options.writers = _.defaults( options.writers, Writer.getDefaults() );

		this._options = options;
		this._config  = {};
	}

	add( input, process ) {
		return Promise.resolve( this._add( input ) )
			.then( () => ( process !== false ? this.process() : null ) )
	}
	_add( input ) {
		// Array, resolve every item independently
		if ( Array.isArray( input ) )
			return Aigle.resolve( input ).eachSeries( ( i ) => this._add( i ) );

		// String, try to load the file
		if ( typeof(input) === 'string' ) {
			const file = this._parseFile( input );

			const reader = this._options.readers[file.type];
			if ( !reader )
				throw new Error( "Invalid type "+file.type );

			const filepath = path.resolve( this._options.cwd, file.path );
			return fs.readFile( filepath, 'utf8' )
				.then( ( content ) => reader.call( null, content ) )
				.then( ( config ) => this._add( config ) );
		}

		// Function, call the function
		if ( typeof(input) === 'function' ) {
			return Promise.resolve( input.call( null ) )
				.then( ( config ) => this._add( config ) );
		}

		// Object, merge
		if ( typeof(input) === 'object' ) {
			if ( !input )
				return;
			return this._mergeObject( input );
		}
	}

	write( output ) {
		return Promise.resolve( this._write( output ) );
	}
	_write( output ) {
		// Array, resolve every item independently
		if ( Array.isArray( output ) )
			return Aigle.resolve( output ).eachLimit( 4, ( o ) => this._write( o ) );

		// String, write
		if ( typeof(output) === 'string' ) {
			if ( output === '-' ) {
				console.log( JSON.stringify( this._config, null, "  " ) );
				return;
			}
			const file = this._parseFile( output );

			const writer = this._options.writers[file.type];
			if ( !writer )
				throw new Error( "Invalid type for writing "+file.type );

			const filepath = path.resolve( this._options.cwd, file.path );
			const config = _.cloneDeep( this._config );
			return Promise.resolve( writer.call( null, config ) )
				.then( ( content ) => fs.outputFile( filepath, content, 'utf8' ) );
		}

		// Function, call
		if ( typeof(output) === 'function' ) {
			const config = _.cloneDeep( this._config );
			return Promise.resolve( output.call( null, config ) );
		}
		
		// Object, merge
		if ( typeof(output) === 'object' ) {
			_.extend( output, _.cloneDeep( this._config ) );
			return;
		}
	}

	process() {

	}

	_mergeObject( obj, cwd ) {
		_.merge( this._config, obj );
	}

	_parseFile( filename ) {
		let type = null;
		const parsed = filename.split( /(?!\\)\#/, 2 );
		if ( parsed.length > 1 ) {
			type  = parsed[1];
			filename = filename.substr( 0, filename.length - (type.length + 1) );
		} else {
			type = path.extname( filename ).substr(1);
		}
		return { path: filename, type: type };
	}

	static runFromArgv( argv ) {
		const program = new commander.Command;
		program
			.version( '0.0.1' )
			.option( '-o, --output <paths>', "Output files", collect, [] )
			.arguments( '[inputs...]' )
			.parse( argv );
		return this.runFromOptions( program.args, program.output, {} );
	}

	static runFromOptions( input, output, options ) {
		if ( !output || ( output.length <= 0 ) )
			output = "-";
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