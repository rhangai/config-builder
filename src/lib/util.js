const crypto = require( "crypto" );

module.exports = {
	random(n, encoding = 'base64') {
		encoding = encoding.toLowerCase();
		let byteLen = n;
		if (encoding === 'hex') byteLen = Math.ceil(n / 2.0);
		else if (encoding === 'base64') byteLen = Math.ceil((n * 3) / 4.0);

		return crypto
			.randomBytes(byteLen)
			.toString(encoding)
			.substr(0, n);
	},
	writeEnv(it, obj) {
		const envs = [];
		for (const key in obj) {
			envs.push(`${key}=${it.$env(key, obj[key])}`);
		}
		return envs.join('\n');
	},
};