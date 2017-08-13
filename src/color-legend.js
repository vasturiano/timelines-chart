import Kapsule from 'kapsule';
import * as d3 from 'd3';
import tinycolor from 'tinycolor2';
import { TextFitToBox, Gradient } from './svg-utils.js'

const OrdinalColorLegend = Kapsule({
    props: {
        width: {},
        height: {},
        scale: {},
        label: {}
    },
    init(el, state) {
        state.el = d3.select(el);

        state.outerBox = state.el.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('rx', 3)
            .attr('ry', 3)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5)
            .attr('fill-opacity', 0)
            .style('pointer-events', 'none');


    },
    update(state) {
        const colorBinWidth = state.width / state.scale.domain().length;

        state.outerBox
            .attr('width', state.width)
            .attr('height', state.height);

        let slot = state.el.selectAll('.color-slot')
            .data(state.scale.domain());

        slot.exit().remove();

        const newSlot = slot.enter()
            .append('g')
                .attr('class', 'color-slot');

        newSlot.append('rect')
            .attr('y', 0)
            .attr('rx', 0)
            .attr('ry', 0)
            .attr('stroke-width', 0);

        newSlot.append('text')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'central');

        newSlot.append('title');

        // Update
        slot = slot.merge(newSlot);

        slot.select('rect')
            .attr('width', colorBinWidth)
            .attr('height', state.height)
            .attr('x', (d, i) => colorBinWidth*i)
            .attr('fill', d => state.scale(d));

        slot.select('text')
            .text(d => d)
            .attr('x', (d, i) => colorBinWidth*(i+.5))
            .attr('y', state.height*0.5)
            .style('fill', d => tinycolor(state.scale(d)).isLight()?'#333':'#DDD')
            .each(function(d) {
                TextFitToBox()
                    .bbox({
                        width: colorBinWidth,
                        height: state.height*0.8
                    })
                    (this);
            });

        slot.select('title')
            .text(d => `${d} ${state.label}`)
    }
});

const LinearColorLegend = Kapsule({
    props: {
        width: {},
        height: {},
        scale: {},
        label: {}
    },
    init(el, state) {
        state.gradient = Gradient()(el);

        state.el = d3.select(el);

        // Build dom
        state.box = state.el.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('rx', 3)
            .attr('ry', 3)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5);

        state.unitLabel = state.el.append('text')
            .attr('class', 'legendText')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'central');

        state.labelFitText = TextFitToBox()(state.unitLabel.node());

        state.startLabel = state.el.append('text')
            .style('text-anchor', 'start')
            .style('dominant-baseline', 'central');

        state.startLabelFitText = TextFitToBox()(state.startLabel.node());

        state.endLabel = state.el.append('text')
            .style('text-anchor', 'end')
            .style('dominant-baseline', 'central');

        state.endLabelFitText = TextFitToBox()(state.endLabel.node());
    },
    update(state) {
        state.gradient.colorScale(state.scale);

        state.box
            .attr('width', state.width)
            .attr('height', state.height)
            .style('fill', `url(#${state.gradient.id()})`);

        state.unitLabel
            .text(state.label)
            .attr('x', state.width*0.5)
            .attr('y', state.height*0.5)
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'central')
            .style('fill', tinycolor(state.scale((state.scale.domain()[state.scale.domain().length-1] - state.scale.domain()[0])/2)).isLight()?'#444':'#CCC');

        state.labelFitText.bbox({
            width: state.width * 0.8,
            height: state.height * 0.9
        });

        state.startLabel
            .text(state.scale.domain()[0])
            .attr('x', state.width*0.02)
            .attr('y', state.height*0.5)
            .style('fill', tinycolor(state.scale.range()[0]).isLight()?'#444':'#CCC' );

        state.startLabelFitText.bbox({
            width: state.width * 0.3,
            height: state.height * 0.7
        });

        state.endLabel
            .text(state.scale.domain()[state.scale.domain().length-1])
            .attr('x', state.width*0.98)
            .attr('y', state.height*0.5)
            .style('fill', tinycolor(state.scale.range()[state.scale.range().length-1]).isLight()?'#444':'#CCC' );

        state.endLabelFitText.bbox({
            width: state.width * 0.3,
            height: state.height * 0.7
        });
    }
});

const ColorLegend = Kapsule({
    props: {
        width: {},
        height: {},
        scale: {},
        label: {}
    },
    init(el, state) {
        state.legend = d3.select(el).append('g')
            .attr('class', 'legend');
    },
    update(state) {
        // Check if ordinal or linear scale
        const ordinal = (state.scale.copy().domain([1, 2]).range([1, 2])(1.5) === 1);

        state.legend.html(''); // Wipe it

        (ordinal?OrdinalColorLegend:LinearColorLegend)()
            .width(state.width)
            .height(state.height)
            .scale(state.scale)
            .label(state.label)
            (state.legend.node());
    }
});

export default ColorLegend;