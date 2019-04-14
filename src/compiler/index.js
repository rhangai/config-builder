const COMPILERS = {
	dot: require('./DotCompiler'),
	env: require('./EnvCompiler'),
	'env-replace': require('./EnvReplaceCompiler'),
};

const Compiler = (module.exports = {
	compile(buffer, context, mode) {
		if (mode == null) mode = ['dot', 'env-replace'];
		if (Array.isArray(mode))
			return reduce(buffer, mode, (childMode, buffer) => Compiler.compile(buffer, context, childMode));
		if (typeof mode !== 'string') throw new Error('Invalid mode to compile');
		mode = mode.toLowerCase();
		const compiler = COMPILERS[mode];
		if (!compiler) throw new Error(`Invalid compiler ${mode}`);
		return compiler.compile(buffer, context);
	},
});

function reduce(value, items, reducer) {
	return items.reduce((value, item) => {
		return reducer.call(null, item, value);
	}, value);
}
