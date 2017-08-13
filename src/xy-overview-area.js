import Kapsule from 'kapsule';
import * as d3 from 'd3';

export default Kapsule({
    props: {
        selection: { default: {
            x: [null, null], // [start, end]
            y: [null, null]  // [start, end]
        }},
        xDomain: { onChange(xDomain, state) {
            state.xScale.domain(xDomain);
        }},
        yDomain: { onChange(yDomain, state) {
            state.yScale.domain(yDomain);
        }},
        transitionDuration: 700
    },
    stateInit: {
        xScale: d3.scaleTime(),
        yScale: d3.scaleLinear()
    },
    init(el, state, {
        width,
        height,
        margin = {top: 2, right: 2, bottom: 2, left: 2 }
    }) {
        state.xScale.range([margin.left, width-state.margin.right]);
        state.yScale.range([margin.top, height-state.margin.bottom]);

        // Build dom
        state.svg = d3.select(el).append('svg')
            .attr('width', width)
            .attr('height', height);

        state.svg.append('rect')
            .attr('class', 'selection-outer-box')
            .attr('x', state.xScale.range()[0])
            .attr('y', state.yScale.range()[0])
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('width', state.xScale.range()[1])
            .attr('height', state.yScale.range()[1])
            .style('fill', '#EEE')
            .style('stroke', 'grey');

        state.selection = state.svg.append('rect')
            .attr('class', 'chart-zoom-selection')
            .attr('rx', 1)
            .attr('ry', 1)
            .attr('width', 0)
            .attr('height', 0);
    },
    update(state) {
        state.svg.select('rect.selection-outer-box')
            .attr('x', state.xScale.range()[0])
            .attr('y', state.yScale.range()[0])
            .attr('width', state.xScale.range()[1])
            .attr('height', state.yScale.range()[1]);

        state.svg.select('rect.chart-zoom-selection')
            .attr('x', state.xScale(state.selection.x[0]))
            .attr('y', state.yScale(state.selection.y[0]))
            .attr('width', state.xScale(state.selection.x[1] - state.selection.x[0]))
            .attr('height', state.yScale(state.selection.y[1] - state.selection.y[0]));
    }
});