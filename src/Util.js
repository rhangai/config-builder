module.exports = class Util {

	static asyncEachSeries( list, iterator ) {
		if ( !Array.isArray( list ) )
			throw new Error( "asyncEach expects an array" );
		return new Promise( ( resolve, reject ) => {
			const next = function( i ) {
				if ( i >= list.length ) {
					resolve();
					return;
				}
				const promise = new Promise( r => r( iterator.call( null, list[i] ) ) );
				promise.then( () => next(i+1), reject );
			};
			next(0);
		});
	}

	static require( lib, reason ) {
		let m = Util.tryRequire( lib );
		if ( !m )
			throw new Error( `${JSON.stringify(lib)} could not be loaded. ${reason || ""}` );
		return m;
	}
	static tryRequire( lib ) {
		try {
			return require( lib );
		} catch( e ) {
			return null;
		}
	}
};
