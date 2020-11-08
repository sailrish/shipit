module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json']
    },
    "env": {
        "browser": false,
        "es6": true
    },
    "extends": [
        "standard",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
		"prettier/@typescript-eslint", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
		"plugin:prettier/recommended" // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    rules: {
        // Fix these
        "no-void": "warn",
        "prefer-const" : "warn",
        // End fixes
        "space-before-function-paren": ["warn", {
            "anonymous": "never",
            "named": "never",
            "asyncArrow": "always"
        }],
        "semi": "off",
        "@typescript-eslint/semi": ["error"],
        "@typescript-eslint/member-delimiter-style": [2, {
            "multiline": {
                "delimiter": "semi",
                "requireLast": true
            },
            "singleline": {
                "delimiter": "semi",
                "requireLast": false
            }
        }],
		"@typescript-eslint/naming-convention": [
			"error",
			{
				"selector": "interface",
				"format": ["PascalCase"],
				"custom": {
					"regex": "^I[A-Z]",
					"match": true
				}
			}
		]
    },
    "settings": {}
};
