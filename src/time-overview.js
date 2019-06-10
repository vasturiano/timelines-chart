/**
 * Based on http://bl.ocks.org/mbostock/6232620
 */

import Kapsule from 'kapsule';
import { brushX as d3BrushX } from 'd3-brush';
import { axisBottom as d3AxisBottom } from 'd3-axis';
import { event as d3Event, select as d3Select } from 'd3-selection';

export default Kapsule({
  props: {
    width: { default: 300 },
    height: { default: 20 },
    margins: { default: { top: 0, right: 0, bottom: 20, left: 0 }},
    scale: {},
    domainRange: {},
    currentSelection: {},
    tickFormat: {},
    onChange: { default: (selectionStart, selectionEnd) => {}}
  },
  init(el, state) {
    state.xGrid = d3AxisBottom()
      .tickFormat('');

    state.xAxis = d3AxisBottom()
      .tickPadding(0);

    state.brush = d3BrushX()
      .handleSize(24)
      .on('end', function() {
        if (!d3Event.sourceEvent) return;

        const selection = d3Event.selection ? d3Event.selection.map(state.scale.invert) : state.scale.domain();
        state.onChange(...selection);
      });

    // Build dom
    state.svg = d3Select(el).append('svg').attr('class', 'brusher');
    const brusher = state.svg.append('g').attr('class', 'brusher-margins');
    brusher.append('rect').attr('class', 'grid-background');
    brusher.append('g').attr('class', 'x grid');
    brusher.append('g').attr('class', 'x axis');
    brusher.append('g').attr('class', 'brush');
  },
  update(state) {
    if (state.domainRange[1] <= state.domainRange[0]) return;

    const brushWidth = state.width - state.margins.left - state.margins.right,
      brushHeight = state.height - state.margins.top - state.margins.bottom;

    state.scale
      .domain(state.domainRange)
      .range([0, brushWidth]);

    state.xAxis
      .scale(state.scale)
      .tickFormat(state.tickFormat);
    state.xGrid
      .scale(state.scale)
      .tickSize(-brushHeight);

    state.svg
      .attr('width', state.width)
      .attr('height', state.height);

    state.svg.select('.brusher-margins')
      .attr('transform', `translate(${state.margins.left},${state.margins.top})`);

    state.svg.select('.grid-background')
      .attr('width', brushWidth)
      .attr('height', brushHeight);

    state.svg.select('.x.grid')
      .attr('transform', 'translate(0,' + brushHeight + ')')
      .call(state.xGrid);

    state.svg.select('.x.axis')
      .attr("transform", "translate(0," + brushHeight + ")")
      .call(state.xAxis)
      .selectAll('text').attr('y', 8);

    state.svg.select('.brush')
      .call(state.brush.extent([[0, 0], [brushWidth, brushHeight]]))
      .call(state.brush.move, state.currentSelection.map(state.scale));
  }
});