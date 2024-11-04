const typescript = require('rollup-plugin-typescript2');
const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json'); // Importa el plugin JSON

module.exports = {
    input: 'src/app.ts',
    output: {
        file: 'dist/app.js',
        format: 'cjs', // CommonJS
    },
    onwarn: (warning) => {
        if (warning.code === 'UNRESOLVED_IMPORT') return;
    },
    plugins: [
        nodeResolve(),
        commonjs(),
        typescript(),
        json(), // Añade el plugin JSON
    ],
};
