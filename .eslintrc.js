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
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
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
        "space-before-function-paren": ["error", {
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
        }]
    },
    "settings": {}
};
