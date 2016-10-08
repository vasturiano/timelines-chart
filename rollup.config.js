import commonJs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import postCss from 'rollup-plugin-postcss';

export default {
    entry: 'src/index.js',
    dest: 'dist/stacked-timelines-chart.js',
    format: 'umd',
    moduleName: 'StackedTimelinesChart',
    plugins: [
        commonJs(),
        nodeResolve({
            jsnext: true,
            main: true
        }),
        postCss()
    ]
};