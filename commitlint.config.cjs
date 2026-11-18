const types = [
    'build',
    'chore',
    'ci',
    'docs',
    'feat',
    'fix',
    'perf',
    'refactor',
    'revert',
    'style',
    'test',

    //custom
    'tweak',
    'wip',
    'locale',
];

module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [2, 'always', types],
        // 'body-max-line-length': [0, 'always', 100],
    },
};
