import Kapsule from 'kapsule';
import * as d3 from 'd3';

const MoveToFront = Kapsule({
    init(el) { el.parentNode.appendChild(el); }
});

const TextFitToBox = Kapsule({
    props: {
        bbox: { default: { width: null, height: null} },
        passes: { default: 3 }
    },
    init(el, state) {
        state.el = d3.select(el);
    },
    update(state) {
        d3.range(state.passes).some(() => {
            const startSize = parseInt(state.el.style('font-size').split('px')[0]);
            const bbox = state.el.node().getBBox();
            const newSize = Math.floor(startSize * Math.min(state.bbox.width / bbox.width, state.bbox.height / bbox.height));

            if (newSize === startSize) return true; // Shortcut out

            state.el.style('font-size', newSize + 'px');
        });
    }
});

const TextAbbreviateToFit = Kapsule({
    props: {
        maxWidth: {}
    },
    init(el, state) {
        state.el = d3.select(el);
    },
    update(state) {
        const origTxt = state.el.text(),
            el = state.el.node();
        let nChars = Math.round(origTxt.length*state.maxWidth/el.getBBox().width*1.2);  // Start above
        while(--nChars && state.maxWidth/el.getBBox().width<1){
            state.el.text(abbreviateText(origTxt, nChars));
        }

        //

        function abbreviateText(txt, maxChars) {
            return txt.length<=maxChars?txt:(
                txt.substring(0, maxChars*2/3)
                + '...'
                + txt.substring(txt.length - maxChars/3, txt.length)
            );
        }
    }
});

const Gradient = Kapsule({
    props: {
        id: {}, // Use with: .attr('fill', 'url(#<gradId>)');
        colorScale: { default: d3.scaleLinear().range(['black', 'white']) },
        angle: { default: 0 } // 0 (left-right), 90 (down-up))
    },
    init(el, state) {
        state.id = `areaGradient${Math.round(Math.random()*10000)}`;
        state.gradient = d3.select(el).append('linearGradient');
    },
    update(state) {
        const rad = Math.PI * state.angle/180;

        state.gradient
            .attr('y1', Math.round(100*Math.max(0, Math.sin(rad))) + '%')
            .attr('y2', Math.round(100*Math.max(0, -Math.sin(rad))) + '%')
            .attr('x1', Math.round(100*Math.max(0, -Math.cos(rad))) + '%')
            .attr('x2', Math.round(100*Math.max(0, Math.cos(rad))) + '%')
            .attr('id', state.id);

        const stopsScale = d3.scaleLinear()
            .domain([0,100])
            .range(state.colorScale.domain());

        let colorStops = state.gradient.selectAll('stop')
            .data(d3.range(0, 100.01, 20)); // 11 stops is sufficient to cover all noticeable color nuances

        colorStops.exit().remove();
        colorStops.merge(colorStops.enter().append('stop'))
            .attr('offset', d => `${d}%`)
            .attr('stop-color', d => state.colorScale(stopsScale(d)));
    }
});

const DropShadow = Kapsule({
    // Use with: .attr('filter', 'url(#<shadowId>)'))
    props: {
        id: { default: `areaGradient${Math.round(Math.random()*10000)}` }
    },
    init(el, state) {
        state.filter = d3.select(el).append('defs')
            .append('filter')
                .attr('height', '130%');

        state.filter.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 3);

        state.filter.append('feOffset')
            .attr('dx', 2)
            .attr('dy', 2)
            .attr('result', 'offsetblur');

        const feMerge = state.filter.append('feMerge');

        feMerge.append('feMergeNode');
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');
    },
    update(state) {
        state.filter.attr('id', state.id);
    }
});

const Throbber = Kapsule({
    props: {
        x: { default: 0 },
        y: { default: 0},
        r: { default: 8 },
        color: { default: 'darkblue' },
        duration: { default: 0.7 },
        angleFull: { default: 120 }
    },
    init(el, state) {
        el = d3.select(el);
        state.path = el.append('path');
        state.transform = state.path.append('animateTransform')
            .attr('attributeName', 'transform')
            .attr('attributeType', 'XML')
            .attr('type', 'rotate')
            .attr('begin', '0s')
            .attr('fill', 'freeze')
            .attr('repeatCount', 'indefinite');
    },
    update(state) {
        state.path
            .attr('d', genDonutSlice(state.x, state.y, state.r, state.r/3, 0, state.angleFull))
            .attr('fill', state.color);

        state.transform
            .attr('from', '0 ' + state.x + ' ' + state.y)
            .attr('to', '360 ' + state.x + ' ' + state.y)
            .attr('dur', state.duration + 's');

        //

        function genDonutSlice(cx, cy, r, thickness, startAngle, endAngle) {
            startAngle = startAngle/180*Math.PI;
            endAngle = endAngle/180*Math.PI;

            const outerR=r;
            const innerR=r-thickness;

            const p=[
                [cx+outerR*Math.cos(startAngle), cy+outerR*Math.sin(startAngle)],
                [cx+outerR*Math.cos(endAngle), cy+outerR*Math.sin(endAngle)],
                [cx+innerR*Math.cos(endAngle), cy+innerR*Math.sin(endAngle)],
                [cx+innerR*Math.cos(startAngle), cy+innerR*Math.sin(startAngle)]
            ];
            const angleDiff = endAngle - startAngle;
            const largeArc = ((angleDiff % (Math.PI * 2)) > Math.PI)?1:0;
            const path = [];

            path.push('M' + p[0].join());
            path.push('A' + [outerR,outerR,0,largeArc,1,p[1]].join());
            path.push('L' + p[2].join());
            path.push('A' + [innerR,innerR,0,largeArc,0,p[3]].join());
            path.push('z');

            return path.join(' ');
        }
    }
});

const Image = Kapsule({
    props: {
        imgUrl: {},
        x: { default: 0 },
        y: { default: 0 },
        maxWidth: { default: 20 },
        maxHeight: { default: 20 },
        svgAlign: { default: 'xMidYMid' }
    },
    methods: {
        show(state) {
            state.img
                .attr('width', state.maxWidth)
                .attr('height', state.maxHeight);

            return this;
        },
        hide(state) {
            state.img
                .attr('width', 0)
                .attr('height', 0);

            return this;
        }
    },
    init(el, state) {
        state.img = d3.select(el).append('image');
    },
    update(state) {
        state.img
            .attr('xlink:href', state.imgUrl)
            .attr('x', state.x)
            .attr('y', state.y)
            .attr('width', state.maxW)
            .attr('height', state.maxH)
            .attr('preserveAspectRatio', state.svgAlign + ' meet');
    }
});

export {
    MoveToFront,
    TextFitToBox,
    TextAbbreviateToFit,
    Gradient,
    DropShadow,
    Throbber,
    Image
};