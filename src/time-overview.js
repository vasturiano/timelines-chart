/**
 * Based on http://bl.ocks.org/mbostock/6232620
 */

import Kapsule from 'kapsule';
import * as d3 from 'd3';

export default Kapsule({
    props: {
        domainRange: {},
        currentSelection: {},
        onChange: { default: (selectionStart, selectionEnd) => {}}
    },
    stateInit: {
        timeScale: d3.scaleUtc(),
        brush: d3.brushX()
    },
    init(el, state, {
        width = 300,
        height = 20,
        margins = { top: 0, right: 0, bottom: 20, left: 0 },
        tickFormat = null
    }) {
        const brushWidth = width - margins.left - margins.right,
            brushHeight = height - margins.top - margins.bottom;

        state.timeScale.range([0, brushWidth]);

        state.xGrid = d3.axisBottom()
            .scale(state.timeScale)
            .tickSize(-brushHeight)
            .tickFormat("");

        state.xAxis = d3.axisBottom()
            .scale(state.timeScale)
            .tickFormat(tickFormat)
            .tickPadding(0);

        state.brush
            .extent([[0, 0], [brushWidth, brushHeight]])
            .on('end', function() {
                if (!d3.event.sourceEvent) return;

                const selection = (d3.event.selection || [0, brushWidth]).map(state.timeScale.invert);
                state.onChange(selection[0], selection[1]);
            });

        // Build dom
        state.svg = d3.select(el).append('svg')
            .attr('class', 'brusher')
            .attr('width', width)
            .attr('height', height);

        const brusher = state.svg.append('g')
            .attr('transform', `translate(${margins.left},${margins.top})`);

        brusher.append('rect')
            .attr('class', 'grid-background')
            .attr('width', brushWidth)
            .attr('height', brushHeight);

        brusher.append('g')
            .attr('class', 'x grid')
            .attr("transform", "translate(0," + brushHeight + ")");

        brusher.append('g')
            .attr('class', 'x axis')
            .attr("transform", "translate(0," + brushHeight + ")");

        brusher.append('g')
            .attr('class', 'brush')
            .call(state.brush)
            .selectAll('rect')
                .attr('height', brushHeight);

    },
    update(state) {
        const timeWindow = state.domainRange[1] - state.domainRange[0];

        if (timeWindow <= 0) return;

        state.timeScale.domain(state.domainRange);
        state.xGrid.scale(state.timeScale);
        state.xAxis.scale(state.timeScale);

        state.svg.select('.x.grid')
            .call(state.xGrid)
            .selectAll('.tick')
                .classed("minor", d => d.getHours());

        state.svg.select('.x.axis')
            .call(state.xAxis)
            .selectAll('text').attr('y', 8);

        state.svg.select('.brush')
            .call(state.brush.move, state.currentSelection.map(state.timeScale));
    }
});