import resolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import postCss from 'rollup-plugin-postcss';
import postCssSimpleVars from 'postcss-simple-vars';
import postCssNested from 'postcss-nested';
import babel from '@rollup/plugin-babel';
import { terser } from "rollup-plugin-terser";
import dts from 'rollup-plugin-dts';

import pkg from './package.json' assert { type: 'json' };
const { name, homepage, version, dependencies, peerDependencies } = pkg;

const umdConf = {
  format: 'umd',
  name: 'TimelinesChart',
  banner: `// Version ${version} ${name} - ${homepage}`
};

export default [
  {
    input: 'src/index.js',
    output: [
      { // umd
        ...umdConf,
        file: `dist/${name}.js`,
        sourcemap: true,
      },
      { // minify
        ...umdConf,
        file: `dist/${name}.min.js`,
        plugins: [terser({
          output: { comments: '/Version/' }
        })]
      }
    ],
    plugins: [
      postCss({
        plugins: [
          postCssSimpleVars(),
          postCssNested()
        ]
      }),
      resolve(),
      commonJs(),
      babel({ exclude: 'node_modules/**' })
    ]
  },
  { // commonJs and ES modules
    input: 'src/index.js',
    output: [
      {
        format: 'cjs',
        file: `dist/${name}.common.js`,
        exports: 'auto'
      },
      {
        format: 'es',
        file: `dist/${name}.module.js`
      }
    ],
    external: [...Object.keys(dependencies || {}), ...Object.keys(peerDependencies || {})],
    plugins: [
      postCss({
        plugins: [
          postCssSimpleVars(),
          postCssNested()
        ]
      }),
      babel()
    ]
  },
  { // expose TS declarations
    input: 'src/index.d.ts',
    output: [{
      file: `dist/${name}.d.ts`,
      format: 'es'
    }],
    plugins: [dts()]
  }
];