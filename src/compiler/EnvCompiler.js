const fs = require('fs-extra');
const doT = require('dot');
const dotenv = require('dotenv');
const DotCompiler = require('./DotCompiler');
const EnvReplaceCompiler = require('./EnvReplaceCompiler');

module.exports = class EnvCompiler {
	static compile(buffer, context) {
		// Get the temporary context with the variables
		const tmpConfig = dotenv.parse(buffer);
		const tmpContext = EnvCompiler.createEnvContext(context, [process.env, tmpConfig]);

		// Compile the file using dot
		const contentCompiled = DotCompiler.compile(buffer, tmpContext);

		// Get the new context with the variable
		const config = dotenv.parse(contentCompiled);
		const localConfig = {};
		const newContext = EnvCompiler.createEnvContext(context, [process.env, () => localConfig, config]);

		// Replace the file
		const lines = contentCompiled
			.split('\n')
			.map(line => {
				// Trim the line
				const lineTrim = line.trim();

				// Check if the line must be deleted
				if (lineTrim.substr(0, 3) === '#!#') return false;
				if (lineTrim.substr(0, 2) === '#!') return lineTrim.substr(2);

				// Check for environment line and overwrite it with the new variable
				const match = lineTrim.match(/^(.+?)\=(.*)$/);
				if (match) {
					let envName = match[1].trim();
					let optional = false;
					if (envName[0] === '#') {
						optional = true;
						envName = envName.substr(1).trim();
					}

					// Optional environment variable, do nothing
					if (optional && !newContext.$env.$has(envName)) {
						return line;
					}

					let envValue = newContext.$env(envName, match[2].trim());
					envValue = EnvReplaceCompiler.compile(envValue, newContext);
					localConfig[envName] = envValue;
					return `${envName}=${envValue}`;
				}
				return line;
			})
			.filter(l => l !== false);

		return lines.join('\n');
	}

	static createEnvContext(context, envList) {
		const envGetter = EnvCompiler.createEnvProxy({
			check: name => {
				const normalizedEnvList = envList.map(envItem => {
					if (typeof envItem === 'function') return envItem();
					return envItem;
				});
				return !!normalizedEnvList.find(e => e.hasOwnProperty(name));
			},
			get: name => {
				const normalizedEnvList = envList.map(envItem => {
					if (typeof envItem === 'function') return envItem();
					return envItem;
				});
				const env = normalizedEnvList.find(e => e.hasOwnProperty(name));
				return env ? env[name] : null;
			},
		});
		const newContext = { ...context };
		Object.defineProperty(newContext, '$env', {
			value: envGetter,
		});
		return newContext;
	}

	static createEnvProxy({ check, get }) {
		const envGetter = function(envName, defaultValue = '') {
			if (check(envName)) return get(envName) || '';
			return defaultValue;
		};
		const proxy = new Proxy(
			{},
			{
				get(obj, name) {
					return get(name) || '';
				},
			}
		);
		Object.setPrototypeOf(envGetter, proxy);
		envGetter.$has = check;
		return envGetter;
	}
};
