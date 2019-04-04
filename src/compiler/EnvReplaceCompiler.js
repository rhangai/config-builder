module.exports = class EnvReplaceCompiler {
	static compile(buffer, context) {
		buffer = buffer.replace(/(.?.?)\$\{(.*?)\}/g, function(match, before, variableExpression) {
			if (before.length === 1 && before[0] === '\\') return match;
			else if (before.length === 2 && before[0] !== '\\' && before[1] === '\\') return match;
			else if (before === '\\\\') before = '\\';
			const expr = variableExpression.trim().split(':-', 2);
			return `${before}${context.$env(expr[0], expr[1])}`;
		});
		return buffer;
	}
};
