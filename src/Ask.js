const path = require( "path" );
const Util = require( "./Util" );
const crypto = require( "crypto" );

const MODULES = {
	random(n, encoding = 'hex') {
		return crypto.randomBytes( n ).toString(encoding);
	}
};

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
		if ( typeof(questionModule) === 'function' )
			questions = questionModule.call( null, inquirer, Object.assign( {}, MODULES ) );
		else
			questions = questionModule;
	}
	questions = [].concat( questions ).filter(Boolean).map(normalizeQuestion);
	return inquirer.prompt( questions );
}

function normalizeQuestion( question ) {
	question = Object.assign( {}, question );
	if ( question.name.substr(0, 5) === '$env.' ) {
		const envName = question.name.substr(5);
		if ( process.env.hasOwnProperty(envName) )
			question.default = process.env[envName];
	}
	return question;
}

module.exports = ask;