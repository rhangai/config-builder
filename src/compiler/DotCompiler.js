const fs = require( "fs-extra" );
const doT = require('dot');

module.exports = class DotCompiler {

	static compile( buffer, context ) {
		const template = doT.template( buffer, Object.assign( {}, doT.templateSettings, {
			strip: false,
		}));
		return template( context );
	}

};