import postCss from 'rollup-plugin-postcss';
import postCssSimpleVars from 'postcss-simple-vars';
import postCssNested from 'postcss-nested';
import babel from 'rollup-plugin-babel';

export default {
    input: 'src/index.js',
    output: [
        {
            format: 'es',
            file: 'dist/timelines-chart.mjs'
        }
    ],
    plugins: [
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