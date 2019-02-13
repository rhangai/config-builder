const commander = require( "commander" );
const _ = require( "lodash" );
const fs = require( "fs-extra" );
const path = require( "path" );
const Reader = require( "./Reader" );
const Writer = require( "./Writer" );
const Util = require( "./Util" );
const Ask = require( "./Ask" );
const Compiler = require( "./compiler" );
const EnvCompiler = require( "./compiler/EnvCompiler" );
const getStdin = require( "get-stdin" );
const LibUtil = require( "./lib/util" );

module.exports = class ConfigBuilder {

	constructor( options ) {
		options = _.extend( {}, options );
		options.cwd = options.cwd || process.cwd();
		options.maxDepth = (options.maxDepth|0) || 50;
		options.outputDir = path.resolve( options.cwd, options.outputDir || "./" );
		options.readers = _.defaults( options.readers, Reader.getDefaults() );
		options.writers = _.defaults( options.writers, Writer.getDefaults() );

		this._options = options;
		this._config  = EnvCompiler.createEnvContext({}, [process.env] );
		this._config.$util = LibUtil;
		this._outputConfig = null;
	}
	
	ask( questions ) {
		return Ask( questions, this._options )
			.then( ( answers ) => this._addAnswers( answers ) );
	}
	_addAnswers( answers ) {
		const envOverwrite = answers.$env || {};
		for( const key in envOverwrite ) {
			process.env[key] = envOverwrite[key];
		}
		return this.add( { $answers: answers }, false );
	}

	add( input ) {
		this._outputConfig = null;
		return Promise.resolve( this._add( input, this._options.cwd ) );
	}
	_add( input, cwd, level ) {
		level = level | 0;
		if ( level >= this._options.maxDepth )
			throw new Error( `Too nested configuration. Only allowed ${this._options.maxDepth} levels when configuring` );
		const nextLevel = level + 1;

		// Array, resolve every item independently
		if ( Array.isArray( input ) )
			return Util.asyncEachSeries( input, ( i ) => this._add( i, cwd, nextLevel ) );

		// String, try to load the file
		if ( typeof(input) === 'string' ) {
			if ( !input )
				return;
				
			// If is an environment variable, try to add it
			if ( input.charAt(0) === '$' && input.indexOf("=") < 0 ) 
				return this._add( process.env[input.substr(1)], cwd, nextLevel );

			const inputObject = this._parseInputConfig( input );
			if ( inputObject )
				return this._add( inputObject, cwd, nextLevel );
			const file = this._parseFile( input );

			const reader = this._options.readers[file.type || 'json'];
			if ( !reader )
				throw new Error( "Invalid type "+file.type );

			return this._readInput( cwd, file.path )
				.then( ( content ) => reader.call( null, content ), ( err ) => ( file.optional ? null : Promise.reject( err ) ) )
				.then( ( config ) => this._add( config, path.dirname( path.join( cwd, file.path ) ), nextLevel ) );
		}

		// Function, call the function
		if ( typeof(input) === 'function' ) {
			return Promise.resolve( input.call( null ) )
				.then( ( config ) => this._add( config, cwd, nextLevel ) );
		}

		// Object, merge
		if ( typeof(input) === 'object' ) {
			if ( !input )
				return;
			return this._mergeObject( input, cwd, nextLevel );
		}
	}

	write( output ) {
		if ( this._outputConfig == null )
			this.process();
		return Promise.resolve( this._write( output ) )
			.then( () => this._outputConfig );
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


			const config = _.cloneDeep( this._outputConfig );

			// Stdout writing
			if ( file.path === '-' ) {
				console.log( writer.call( null, config ) );
				return;
			}

			const filepath = this._resolveOutputPath( file.path );
			return Promise.resolve( writer.call( null, config ) )
				.then( ( content ) => fs.outputFile( filepath, content, 'utf8' ) );
		}

		// Function, call
		if ( typeof(output) === 'function' ) {
			const config = _.cloneDeep( this._outputConfig );
			return Promise.resolve( output.call( null, config ) );
		}
		
		// Object, merge
		if ( typeof(output) === 'object' ) {
			_.extend( output, _.cloneDeep( this._outputConfig ) );
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
		const outPath = this._resolveOutputPath( templatePaths[1] );
		const mode    = templatePaths[2] || null;
		return fs.readFile( inPath, 'utf8' )
			.then( ( content ) => Compiler.compile( content, this._config, mode ) )
			.then( ( content ) => fs.outputFile( outPath, content, 'utf8' ) );
	}

	_resolveOutputPath( filename ) {
		if ( filename.substr(0, 2) === "./" )
			return filename;
		return path.resolve( this._options.outputDir, filename );
	}

	/**
	 * Process file
	 */
	process() {
		const proxy = ConfigBuilder._createProxy( this._config, this._config );
		this._outputConfig = JSON.parse( JSON.stringify( proxy ) );
	}
	/**
	 * Create the proxy resolving the configuration
	 */
	static _createProxy( config, root ) {
		if ( typeof(config) === 'string' ) {
			return Compiler.compile( config, root );
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

	_mergeObject( obj, cwd, level ) {
		if ( typeof(obj) === 'object' && obj.$extends ) {
			return Promise.resolve()
				.then( () => this._add( obj.$extends, cwd, level ) )
				.then( () => _.merge( this._config, _.omit( obj, [ '$extends' ] ) ) );
		}
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
		
		if ( type == null && filename !== '-' ) {
			type = path.extname( filename ).substr(1);
		}
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

	_readInput( cwd, filepath ) {
		if (filepath === '-' )
			return getStdin();
		filepath = path.resolve(cwd, filepath);
		return fs.readFile(filepath, 'utf8');
	}

	static runFromArgv( argv ) {
		const program = new commander.Command;
		program
			.version( require( "../package.json" ).version )
			.option( '-o, --output <paths>', "Output files", collect, [] )
			.option( '-t, --template <paths>', "Compile template files", collect, [] )
			.option( '-d, --output-dir <dir>', "Directory to output files" )
			.option( '--depth <depth>', "The maxDepth option" )
			.option( '--ask <file>', "Ask using inquirer", collect, [] )
			.arguments( '[inputs...]' )
			.parse( argv );

		let output = program.output;
		if ( !output || ( output.length <= 0 ) )
			output = "-";

		const outputDir = (program.outputDir || "").split( ":" );
		return ConfigBuilder.run( program.args, output, {
			questions: program.ask,
			maxDepth: program.depth,
			outputDir: _.findLast( outputDir, Boolean ),
			template: [].concat( program.template ).filter( Boolean ),
		} );
	}

	static run( input, output, options ) {
		const builder = new ConfigBuilder( options );
		return Promise.resolve()
			.then( () => builder.ask( options.questions ) )
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
