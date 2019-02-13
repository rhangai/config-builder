const COMPILERS = {
	'dot': require( './DotCompiler' ),
};

module.exports = {
	compile( buffer, context, mode ) {
		if ( mode == null )
			mode = 'dot';
		if ( typeof(mode) !== 'string' )
			throw new Error( "Invalid mode to compile" );
		mode = mode.toLowerCase();
		const compiler = COMPILERS[mode];
		if ( !compiler )
			throw new Error( `Invalid compiler ${mode}` );
		return compiler.compile(buffer, context);
	}
};