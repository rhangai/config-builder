module.exports = class Reader {


	static getDefaults() {

	}

	static readJs( input ) {
		console.log( input );
	}
	
	static readJson( input ) {
		return JSON.parse( input );
	}

};