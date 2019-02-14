const fs = require( "fs-extra" );
const path = require( "path" );
const ASSETS_DIR = path.resolve( __dirname, "../../assets" );

module.exports = {
	print( mode ) {
		mode = mode.toLowerCase();
		if ( mode === 'docker-bash' ) {
			return this.printFile( path.resolve( ASSETS_DIR, './shell/docker-bash' ) );
		}
	},
	printFile( file ) {
		return fs.readFile( file, 'utf8' )
			.then( ( buffer ) => process.stdout.write( buffer ) )
		;
	},
}