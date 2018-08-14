const commander = require( "commander" );
const _ = require( "lodash" );
const fs = require( "fs-extra" );
const path = require( "path" );
const doT = require('dot');
const Reader = require( "./Reader" );
const Writer = require( "./Writer" );
const Util = require( "./Util" );

module.exports = class ConfigBuilder {

	constructor( options ) {
		options = _.extend( {}, options );
		options.cwd = options.cwd || process.cwd();
		options.outputDir = path.resolve( options.cwd, options.outputDir || "./" );
		options.readers = _.defaults( options.readers, Reader.getDefaults() );
		options.writers = _.defaults( options.writers, Writer.getDefaults() );

		this._options = options;
		this._config  = {};
	}

	add( input, needProcess ) {
		return Promise.resolve( this._add( input ) )
			.then( () => ( needProcess !== false ? this.process() : null ) )
	}
	_add( input ) {
		// Array, resolve every item independently
		if ( Array.isArray( input ) )
			return Util.asyncEachSeries( input, ( i ) => this._add( i ) );

		// String, try to load the file
		if ( typeof(input) === 'string' ) {
			if ( !input )
				return;
				
			if ( input.charAt(0) === '$' && input.indexOf("=") < 0 ) 
				return this._add( process.env[input.substr(1)] );

			const inputObject = this._parseInputConfig( input );
			if ( inputObject )
				return this._add( inputObject );
			const file = this._parseFile( input );

			const reader = this._options.readers[file.type];
			if ( !reader )
				throw new Error( "Invalid type "+file.type );

			const filepath = path.resolve( this._options.cwd, file.path );
			return fs.readFile( filepath, 'utf8' )
				.then( ( content ) => reader.call( null, content ), ( err ) => ( file.optional ? null : Promise.reject( err ) ) )
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
		return Promise.resolve( this._write( output ) )
			.then( () => this._config );
	}
	_write( output ) {
		// Array, resolve every item independently
		if ( Array.isArray( output ) )
			return Util.asyncEachSeries( output, ( o ) => this._write( o ) );

		// String, write
		if ( typeof(output) === 'string' ) {
			const file = this._parseFile( output );
			if ( file.path === "-" && !file.type )
				file.type = "stdout";

			const writer = this._options.writers[file.type];
			if ( !writer )
				throw new Error( "Invalid type for writing "+file.type );


			const config = _.cloneDeep( this._config );

			// Stdout writing
			if ( file.path === '-' ) {
				console.log( writer.call( null, config ) );
				return;
			}

			const filepath = path.resolve( this._options.outputDir, file.path );
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

	compileTemplate( template ) {
		return Promise.resolve( this._compileTemplate( template ) )
			.then( () => this._config );
	}
	_compileTemplate( template ) {
		// Array, resolve every item independently
		if ( Array.isArray( template ) )
			return Util.asyncEachSeries( template, ( t ) => this._compileTemplate( t ) );
		if ( typeof(template) !== 'string' )
			return;

		const templatePaths = template.split( ":" );
		const inPath  = templatePaths[0];
		const outPath = path.resolve( this._options.outputDir, templatePaths[1] );
		return fs.readFile( inPath, 'utf8' )
			.then( ( content ) => {
				const template = doT.template( content, _.extend( {}, doT.templateSettings, {
					strip: false,
				}));
				return template( this._config );
			})
			.then( ( content ) => fs.outputFile( outPath, content, 'utf8' ) );
	}

	/**
	 * Process file
	 */
	process() {
		Object.defineProperty( this._config, '$env', {
			get: function() { return process.env; },
		});
		const proxy  = ConfigBuilder._createProxy( this._config, this._config );
		this._config = JSON.parse( JSON.stringify( proxy ) );
	}
	/**
	 * Create the proxy resolving the configuration
	 */
	static _createProxy( config, root ) {
		if ( typeof(config) === 'string' ) {
			const template = doT.template( config, _.extend( {}, doT.templateSettings, {
				strip: false,
			}));
			return template( root );
		} else if ( typeof(config) === 'object' ) {
			const obj = Array.isArray( config ) ? [] : {};
			root = root || obj;
			_.each( config, function( value, key ) {
				const enumerable = typeof(key) === 'string' && key.charAt(0) !== '$';
				Object.defineProperty( obj, key, {
					enumerable: enumerable,
					configurable: true,
					get: function() { 
						const value = ConfigBuilder._createProxy( config[key], root );
						Object.defineProperty( obj, key, { 
							enumerable: enumerable, 
							value: value,
						} );
						return value;
					}
				});
			});
			return obj;
		}
		return config;
	}

	_mergeObject( obj, cwd ) {
		_.merge( this._config, obj );
	}

	_parseFile( filename ) {
		let optional = false;
		if ( filename.charAt(0) === '+' ) {
			optional = true;
			filename = filename.substr(1);
		}

		let type = null;
		for ( let i = 0, len = filename.length; i<len; ++i ) {
			if ( filename.charAt(i) === ":" && (i == 0 || ( filename.charAt(i-1) !== "\\" ) ) ) {
				type     = filename.substr(i+1);
				filename = filename.substr(0, i);
				break;
			}
		}
		filename = filename.replace( /\\\:/g, ":" );
		filename = filename.replace( /\\\+/g, "+" );
		
		if ( type == null )
			type = path.extname( filename ).substr(1);
		return { path: filename, type: type, optional: optional };
	}

	_parseInputConfig( input ) {
		let searchIndex = 0, equalSignIndex;
		while ( true ) {
			equalSignIndex = input.indexOf( "=", searchIndex );
			if ( equalSignIndex < 0 )
				return false;
			if ( equalSignIndex == 0 || input.charAt( equalSignIndex - 1 ) !== "\\" )
				break;
			searchIndex = equalSignIndex + 1;
		}

		const configPath = input.substr( 0, equalSignIndex ).trim();
		let configValue = input.substr( equalSignIndex + 1 ).trim();
		try { configValue = JSON.parse( configValue ); } catch(e) {};

		const obj = {};
		_.set( obj, configPath, configValue );
		return obj;
	}

	static runFromArgv( argv ) {
		const program = new commander.Command;
		program
			.version( require( "../package.json" ).version )
			.option( '-o, --output <paths>', "Output files", collect, [] )
			.option( '-t, --template <paths>', "Compile template files", collect, [] )
			.option( '-d, --output-dir <dir>', "Directory to output files" )
			.arguments( '[inputs...]' )
			.parse( argv );

		let output = program.output;
		if ( !output || ( output.length <= 0 ) )
			output = "-";

		const outputDir = (program.outputDir || "").split( ":" );
		return ConfigBuilder.run( program.args, output, {
			outputDir: _.findLast( outputDir, Boolean ),
			template: [].concat( program.template ).filter( Boolean ),
		} );
	}

	static run( input, output, options ) {
		const builder = new ConfigBuilder( options );
		return Promise.resolve()
			.then( () => builder.add( input ) )
			.then( () => builder.compileTemplate( options.template ) )
			.then( () => builder.write( output ) );
	}

};

// Collect for argument
function collect(val, memo) {
	memo.push(val);
	return memo;
}
