import resolve from 'rollup-plugin-node-resolve';
import commonJs from 'rollup-plugin-commonjs';
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
            jsnext: true,
            main: true
        }),
        commonJs(),
        postCss({
            plugins: [
                postCssSimpleVars(),
                postCssNested()
            ]
        }),
        babel({
            presets: [
                ["es2015", { "modules": false }]
            ],
            plugins: [
                "external-helpers",
                "transform-object-rest-spread",
                "transform-class-properties"
            ],
            babelrc: false
        })
    ]
};