import postcss from 'rollup-plugin-postcss';

export default {
    entry: 'src/index.js',
    dest: 'dist/stacked-timelines-chart.js',
    format: 'umd',
    moduleName: 'StackedTimelinesChart',
    plugins: [ postcss() ]
};