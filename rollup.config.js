import commonJs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import postCss from 'rollup-plugin-postcss';
import postCssSimpleVars from 'postcss-simple-vars';
import postCssNested from 'postcss-nested';
import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/index.js',
    dest: 'dist/timelines-chart.js',
    format: 'umd',
    moduleName: 'TimelinesChart',
    plugins: [
        resolve({
            jsnext: false,
            main: true
        }),
        commonJs(),
        postCss({
            plugins: [
                postCssSimpleVars(),
                postCssNested()
            ]
        }),
        babel({ exclude: 'node_modules/**' })
        //babel({ ...babelOptions, babelrc: false })
    ]
};