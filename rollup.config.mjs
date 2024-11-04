import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

export default {
    input: 'src/app.ts',
    output: {
        dir: 'dist',
        format: 'cjs',  // Cambia a 'cjs' para CommonJS
        sourcemap: true
    },
    external: ['dotenv', 'qrcode-terminal'],
    onwarn: (warning, warn) => {
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
    },
    plugins: [
        typescript({ tsconfig: "./tsconfig.json" }),  // Especifica el tsconfig
        commonjs(),
        nodeResolve(),
        json()
    ],
};
