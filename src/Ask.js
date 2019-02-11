const path = require( "path" );
const Util = require( "./Util" );

function ask( questions, options ) {
	if ( !questions )
		return Promise.resolve({});
	else if ( Array.isArray( questions ) ) {
		let result = {};
		return Util.asyncEachSeries( questions, function( item ) {
			return ask(item, options)
				.then( ( itemResult ) => {
					result = Object.assign( result, itemResult );
				});
		}).then( () => result );
	}
	return doAsk( questions, options );
}

function doAsk( questions, options ) {
	const inquirer = require( "inquirer" );
	if ( typeof(questions) === 'string' ) {
		const questionModule = require( path.resolve( options.cwd, questions ) );
		questions = questionModule.call( null, inquirer );
	}
	questions = [].concat( questions ).filter(Boolean);
	return inquirer.prompt( questions );
}

module.exports = ask;