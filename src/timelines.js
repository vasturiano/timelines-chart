import './timelines.css';

import Kapsule from 'kapsule';
import * as d3 from 'd3';
import d3Tip from 'd3-tip';
import * as d3chroma from 'd3-scale-chromatic';

import { moveToFront as MoveToFront, gradient as Gradient } from 'svg-utils';
import { fitToBox as TextFitToBox } from 'svg-text-fit';
import ColorLegend from 'd3-color-legend';
import TimeOverview from './time-overview.js';
import { alphaNumCmp } from './comparison.js';

export default Kapsule({
    props: {
        data: {
            default: [],
            onChange(data, state) {
                parseData(data);

                state.zoomX = [
                    d3.min(state.completeFlatData, function(d) { return d.timeRange[0]; }),
                    d3.max(state.completeFlatData, function(d) { return d.timeRange[1]; })
                ];

                state.zoomY = [null, null];

                if (state.overviewArea) {
                    state.overviewArea
                        .domainRange(state.zoomX)
                        .currentSelection(state.zoomX);
                }

                //

                function parseData(rawData) {

                    state.completeStructData = [];
                    state.completeFlatData = [];
                    state.totalNLines = 0;

                    var dateObjs = rawData.length?rawData[0].data[0].data[0].timeRange[0] instanceof Date:false;

                    for (var i= 0, ilen=rawData.length; i<ilen; i++) {
                        var group = rawData[i].group;
                        state.completeStructData.push({
                            group: group,
                            lines: rawData[i].data.map(function(d) { return d.label; })
                        });

                        for (var j= 0, jlen=rawData[i].data.length; j<jlen; j++) {
                            for (var k= 0, klen=rawData[i].data[j].data.length; k<klen; k++) {
                                state.completeFlatData.push({
                                    group: group,
                                    label: rawData[i].data[j].label,
                                    timeRange: (dateObjs
                                            ?rawData[i].data[j].data[k].timeRange
                                            :[new Date(rawData[i].data[j].data[k].timeRange[0]), new Date(rawData[i].data[j].data[k].timeRange[1])]
                                    ),
                                    val: rawData[i].data[j].data[k].val,
                                    labelVal: rawData[i].data[j].data[k][rawData[i].data[j].data[k].hasOwnProperty('labelVal')?'labelVal':'val']
                                });
                            }
                            state.totalNLines++;
                        }
                    }
                }
            }
        },
        width: { default: window.innerWidth, triggerUpdate: false },
        maxHeight: { default: 640 },
        maxLineHeight: { default: 12 },
        leftMargin: { default: 90, triggerUpdate: false },
        rightMargin: { default: 100, triggerUpdate: false },
        topMargin: {default: 26, triggerUpdate: false },
        bottomMargin: {default: 30, triggerUpdate: false },
        zoomX: {    // Which time-range to show (null = min/max)
            default: [null, null],
            onChange(zoomX, state) {
                if (state.svg)
                    state.svg.dispatch('zoom', { detail: {
                        zoomX: zoomX,
                        zoomY: null,
                        redraw: false
                    }});
            }
        },
        zoomY: {    // Which lines to show (null = min/max) [0 indexed]
            default: [null, null],
            onChange(zoomY, state) {
                if (state.svg)
                    state.svg.dispatch('zoom', { detail: {
                        zoomX: null,
                        zoomY: zoomY,
                        redraw: false
                    }});
            }
        },
        minSegmentDuration: {},
        zColorScale: { default: d3.scaleSequential(d3chroma.interpolateRdYlBu) },
        zQualitative: { default: false, onChange(discrete, state) {
            state.zColorScale = discrete
                ? d3.scaleOrdinal([...d3.schemeCategory10, ...d3.schemeCategory20b])
                : d3.scaleSequential(d3chroma.interpolateRdYlBu); // alt: d3.interpolateInferno
        }},
        zDataLabel: { default: '', triggerUpdate: false }, // Units of z data. Used in the tooltip descriptions
        zScaleLabel: { default: '', triggerUpdate: false }, // Units of colorScale. Used in the legend label
        enableOverview: { default: true }, // True/False
        enableAnimations: {
            default: true,
            onChange(val, state) {
                state.transDuration = val?700:0;
            }
        },

        // Callbacks
        onZoom: {}, // When user zooms in / resets zoom. Returns ([startX, endX], [startY, endY])
        onLabelClick: {} // When user clicks on a group or y label. Returns (label)
    },

    methods: {
        getNLines: s => s.nLines,
        getTotalNLines: s => s.totalNLines,
        getVisibleStructure: s => s.structData,
        getSvg: s => d3.select(s.svg.node().parentNode).html(),
        zoomYLabels(state, _) {
            if (!_) { return [y2Label(state.zoomY[0]), y2Label(state.zoomY[1])]; }
            return this.zoomY([label2Y(_[0], true), label2Y(_[1], false)]);

            //

            function y2Label(y) {

                if (y==null) return y;

                var cntDwn = y;
                for (var i=0, len=state.completeStructData.length; i<len; i++) {
                    if (state.completeStructData[i].lines.length>cntDwn)
                        return getIdxLine(state.completeStructData[i], cntDwn);
                    cntDwn-=state.completeStructData[i].lines.length;
                }

                // y larger than all lines, return last
                return getIdxLine(state.completeStructData[state.completeStructData.length-1], state.completeStructData[state.completeStructData.length-1].lines.length-1);

                //

                function getIdxLine(grpData, idx) {
                    return {
                        'group': grpData.group,
                        'label': grpData.lines[idx]
                    };
                }
            }

            function label2Y(label, useIdxAfterIfNotFound) {

                useIdxAfterIfNotFound = useIdxAfterIfNotFound || false;
                var subIdxNotFound = useIdxAfterIfNotFound?0:1;

                if (label==null) return label;

                var idx=0;
                for (var i=0, lenI=state.completeStructData.length; i<lenI; i++) {
                    var grpCmp = state.grpCmpFunction(label.group, state.completeStructData[i].group);
                    if (grpCmp<0) break;
                    if (grpCmp==0 && label.group==state.completeStructData[i].group) {
                        for (var j=0, lenJ=state.completeStructData[i].lines.length; j<lenJ; j++) {
                            var cmpRes = state.labelCmpFunction(label.label, state.completeStructData[i].lines[j]);
                            if (cmpRes<0) {
                                return idx+j-subIdxNotFound;
                            }
                            if (cmpRes==0 && label.label==state.completeStructData[i].lines[j]) {
                                return idx+j;
                            }
                        }
                        return idx+state.completeStructData[i].lines.length-subIdxNotFound;
                    }
                    idx+=state.completeStructData[i].lines.length;
                }
                return idx-subIdxNotFound;
            }
        },
        sort(state, labelCmpFunction, grpCmpFunction) {
            if (labelCmpFunction==null) { labelCmpFunction = state.labelCmpFunction }
            if (grpCmpFunction==null) { grpCmpFunction = state.grpCmpFunction }

            state.labelCmpFunction = labelCmpFunction;
            state.grpCmpFunction = grpCmpFunction;

            state.completeStructData.sort(function(a, b) {
                return grpCmpFunction(a.group, b.group);
            });

            for (var i=0, len=state.completeStructData.length;i<len;i++) {
                state.completeStructData[i].lines.sort(labelCmpFunction);
            }

            state._rerender();

            return this;
        },
        sortAlpha(state, asc) {
            if (asc==null) { asc=true }
            var alphaCmp = function (a, b) { return alphaNumCmp(asc?a:b, asc?b:a); };
            return this.sort(alphaCmp, alphaCmp);
        },
        sortChrono(state, asc) {
            if (asc==null) { asc=true }

            function buildIdx(accessFunction) {
                var idx = {};
                for (var i= 0, len=state.completeFlatData.length; i<len; i++ ) {
                    var key = accessFunction(state.completeFlatData[i]);
                    if (idx.hasOwnProperty(key)) { continue; }

                    var itmList = state.completeFlatData.filter(function(d) { return key == accessFunction(d); });
                    idx[key] = [
                        d3.min(itmList, function(d) { return d.timeRange[0]}),
                        d3.max(itmList, function(d) { return d.timeRange[1]})
                    ];
                }
                return idx;
            }

            var timeCmp = function (a, b) {

                var aT = a[1], bT=b[1];

                if (!aT || !bT) return null; // One of the two vals is null

                if (aT[1].getTime()==bT[1].getTime()) {
                    if (aT[0].getTime()==bT[0].getTime()) {
                        return alphaNumCmp(a[0],b[0]); // If first and last is same, use alphaNum
                    }
                    return aT[0]-bT[0];   // If last is same, earliest first wins
                }
                return bT[1]-aT[1]; // latest last wins
            };

            function getCmpFunction(accessFunction, asc) {
                return function(a, b) {
                    return timeCmp(accessFunction(asc?a:b), accessFunction(asc?b:a));
                }
            }

            var grpIdx = buildIdx(function(d) { return d.group; });
            var lblIdx = buildIdx(function(d) { return d.label; });

            var grpCmp = getCmpFunction(function(d) { return [d, grpIdx[d] || null]; }, asc);
            var lblCmp = getCmpFunction(function(d) { return [d, lblIdx[d] || null]; }, asc);

            return this.sort(lblCmp, grpCmp);
        },
        overviewDomain(state, _) {
            if (!state.enableOverview) { return null; }

            if (!_) { return state.overviewArea.domainRange(); }
            state.overviewArea.domainRange(_);
            return this;
        },
        refresh(state) {
            state._rerender();
            return this;
        }
    },

    stateInit: {
        height: null,
        overviewHeight: 20, // Height of overview section in bottom
        minLabelFont: 2,
        groupBkgGradient: ['#FAFAFA', '#E0E0E0'],

        xScale: d3.scaleTime(),
        yScale: d3.scalePoint(),
        grpScale: d3.scaleOrdinal(),

        xAxis: d3.axisBottom(),
        xGrid: d3.axisTop(),
        yAxis: d3.axisRight(),
        grpAxis: d3.axisLeft(),

        svg: null,
        graph: null,
        overviewAreaElem: null,
        overviewArea: null,

        graphW: null,
        graphH: null,

        completeStructData: null,
        structData: null,
        completeFlatData: null,
        flatData: null,
        totalNLines: null,
        nLines: null,

        minSegmentDuration: 0, // ms

        transDuration: 700,     // ms for transition duration

        labelCmpFunction: alphaNumCmp,
        grpCmpFunction: alphaNumCmp
    },

    init(el, state) {
        const elem = d3.select(el)
            .attr('class', 'timelines-chart');

        state.svg = elem.append('svg');
        state.overviewAreaElem = elem.append('div');

        buildDomStructure();
        addTooltips();
        addZoomSelection();
        setEvents();

        //

        function buildDomStructure () {

            state.yScale.invert = invertOrdinal;
            state.grpScale.invert = invertOrdinal;

            state.groupGradId = Gradient()
                .colorScale(d3.scaleLinear()
                    .domain([0, 1])
                    .range(state.groupBkgGradient))
                .angle(-90)
                (state.svg.node())
                .id();

            state.graphW = state.width-state.leftMargin-state.rightMargin;
            state.xScale.range([0, state.graphW])
                .clamp(true);

            state.svg.attr('width', state.width);

            var axises = state.svg.append('g');

            state.graph = state.svg.append('g')
                .attr('transform', 'translate(' + state.leftMargin + ',' + state.topMargin + ')');

            axises.attr('class', 'axises')
                .attr('transform', 'translate(' + state.leftMargin + ',' + state.topMargin + ')');

            axises.append('g')
                .attr('class', 'x-axis');

            axises.append('g')
                .attr('class', 'x-grid');

            axises.append('g')
                .attr('class', 'y-axis')
                .attr('transform', 'translate(' + state.graphW + ', 0)');

            axises.append('g')
                .attr('class', 'grp-axis');

            state.xAxis.scale(state.xScale)
                .ticks(Math.round(state.graphW*0.011));

            state.xGrid.scale(state.xScale)
                .tickFormat('')
                .ticks(state.xAxis.ticks()[0]);

            state.yAxis.scale(state.yScale)
                .tickSize(0);

            state.grpAxis.scale(state.grpScale)
                .tickSize(0);

            state.colorLegend = ColorLegend()
                (state.svg.append('g')
                    .attr('transform', `translate(${state.leftMargin + state.graphW*0.05},2)`)
                    .node()
                );

            if (state.enableOverview) {
                addOverviewArea();
            }

            // Applies to ordinal scales (invert not supported in d3)
            function invertOrdinal(val, cmpFunc) {
                cmpFunc = cmpFunc || function (a, b) {
                        return (a >= b);
                    };

                var scDomain = this.domain(),
                    scRange = this.range();

                if (scRange.length === 2 && scDomain.length !== 2) {
                    // Special case, interpolate range vals
                    scRange = d3.range(scRange[0], scRange[1], (scRange[1] - scRange[0]) / scDomain.length);
                }

                var bias = scRange[0];
                for (var i = 0, len = scRange.length; i < len; i++) {
                    if (cmpFunc(scRange[i] + bias, val)) {
                        return scDomain[Math.round(i * scDomain.length / scRange.length)];
                    }
                }

                return this.domain()[this.domain().length-1];
            }

            function addOverviewArea() {
                var overviewMargins = { top: 1, right: 20, bottom: 20, left: 20 };
                state.overviewArea = TimeOverview({
                        // Options
                        margins: overviewMargins,
                        width: state.width*0.8,
                        height: state.overviewHeight + overviewMargins.top + overviewMargins.bottom
                    })
                    .onChange((startTime, endTime) => {
                        state.svg.dispatch('zoom', { detail: {
                            zoomX: [startTime, endTime],
                            zoomY: null
                        }});
                    })
                    .domainRange(state.zoomX)
                    .currentSelection(state.zoomX)
                    (state.overviewAreaElem.node());

                state.svg.on('zoomScent', function() {
                    var zoomX = d3.event.detail.zoomX;

                    if (!state.overviewArea || !zoomX) return;

                    // Out of overview bounds
                    if (zoomX[0]<state.overviewArea.domainRange()[0] || zoomX[1]>state.overviewArea.domainRange()[1]) {
                        state.overviewArea.update(
                            [
                                new Date(Math.min(zoomX[0], state.overviewArea.domainRange()[0])),
                                new Date(Math.max(zoomX[1], state.overviewArea.domainRange()[1]))
                            ],
                            state.zoomX
                        );
                    } else { // Normal case
                        state.overviewArea.currentSelection(zoomX);
                    }
                });
            }
        }

        function addTooltips() {
            state.groupTooltip = d3Tip()
                .attr('class', 'chart-tooltip group-tooltip')
                .direction('w')
                .offset([0, 0])
                .html(function(d) {
                    var leftPush = (d.hasOwnProperty('timeRange')
                            ?state.xScale(d.timeRange[0])
                            :0
                    );
                    var topPush = (d.hasOwnProperty('label')
                            ?state.grpScale(d.group)-state.yScale(d.group+'+&+'+d.label)
                            :0
                    );
                    state.groupTooltip.offset([topPush, -leftPush]);
                    return d.group;
                });

            state.svg.call(state.groupTooltip);

            state.lineTooltip = d3Tip()
                .attr('class', 'chart-tooltip line-tooltip')
                .direction('e')
                .offset([0, 0])
                .html(function(d) {
                    var rightPush = (d.hasOwnProperty('timeRange')?state.xScale.range()[1]-state.xScale(d.timeRange[1]):0);
                    state.lineTooltip.offset([0, rightPush]);
                    return d.label;
                });

            state.svg.call(state.lineTooltip);

            state.segmentTooltip = d3Tip()
                .attr('class', 'chart-tooltip segment-tooltip')
                .direction('s')
                .offset([5, 0])
                .html(function(d) {
                    var normVal = state.zColorScale.domain()[state.zColorScale.domain().length-1] - state.zColorScale.domain()[0];
                    var dateFormat = d3.timeFormat('%Y-%m-%d %H:%M:%S');
                    return '<strong>' + d.labelVal + ' </strong>' + state.zDataLabel
                        + (normVal?' (<strong>' + Math.round((d.val-state.zColorScale.domain()[0])/normVal*100*100)/100 + '%</strong>)':'') + '<br>'
                        + '<strong>From: </strong>' + dateFormat(d.timeRange[0]) + '<br>'
                        + '<strong>To: </strong>' + dateFormat(d.timeRange[1]);
                });

            state.svg.call(state.segmentTooltip);
        }

        function addZoomSelection() {
            state.graph.on('mousedown', function() {
                if (d3.select(window).on('mousemove.zoomRect')!=null) // Selection already active
                    return;

                var e = this;

                if (d3.mouse(e)[0]<0 || d3.mouse(e)[0]>state.graphW || d3.mouse(e)[1]<0 || d3.mouse(e)[1]>state.graphH)
                    return;

                state.disableHover=true;

                var rect = state.graph.append('rect')
                    .attr('class', 'chart-zoom-selection');

                var startCoords = d3.mouse(e);

                d3.select(window)
                    .on('mousemove.zoomRect', function() {
                        d3.event.stopPropagation();
                        var newCoords = [
                            Math.max(0, Math.min(state.graphW, d3.mouse(e)[0])),
                            Math.max(0, Math.min(state.graphH, d3.mouse(e)[1]))
                        ];
                        rect.attr('x', Math.min(startCoords[0], newCoords[0]))
                            .attr('y', Math.min(startCoords[1], newCoords[1]))
                            .attr('width', Math.abs(newCoords[0] - startCoords[0]))
                            .attr('height', Math.abs(newCoords[1] - startCoords[1]));

                        state.svg.dispatch('zoomScent', { detail: {
                            zoomX: [startCoords[0], newCoords[0]].sort(d3.ascending).map(state.xScale.invert),
                            zoomY: [startCoords[1], newCoords[1]].sort(d3.ascending).map(function(d) {
                                return state.yScale.domain().indexOf(state.yScale.invert(d))
                                    + ((state.zoomY && state.zoomY[0])?state.zoomY[0]:0);
                            })
                        }});
                    })
                    .on('mouseup.zoomRect', function() {
                        d3.select(window).on('mousemove.zoomRect', null).on('mouseup.zoomRect', null);
                        d3.select('body').classed('stat-noselect', false);
                        rect.remove();
                        state.disableHover=false;

                        var endCoords = [
                            Math.max(0, Math.min(state.graphW, d3.mouse(e)[0])),
                            Math.max(0, Math.min(state.graphH, d3.mouse(e)[1]))
                        ];

                        if (startCoords[0]==endCoords[0] && startCoords[1]==endCoords[1])
                            return;

                        var newDomainX = [startCoords[0], endCoords[0]].sort(d3.ascending).map(state.xScale.invert);

                        var newDomainY = [startCoords[1], endCoords[1]].sort(d3.ascending).map(function(d) {
                            return state.yScale.domain().indexOf(state.yScale.invert(d))
                                + ((state.zoomY && state.zoomY[0])?state.zoomY[0]:0);
                        });

                        var changeX=((newDomainX[1] - newDomainX[0])>(60*1000)); // Zoom damper
                        var changeY=(newDomainY[0]!=state.zoomY[0] || newDomainY[1]!=state.zoomY[1]);

                        if (changeX || changeY) {
                            state.svg.dispatch('zoom', { detail: {
                                zoomX: changeX?newDomainX:null,
                                zoomY: changeY?newDomainY:null
                            }});
                        }
                    }, true);

                d3.event.stopPropagation();
            });

            const resetBtn = state.svg.append('text')
                .attr('class', 'reset-zoom-btn')
                .text('Reset Zoom')
                .attr('x', state.leftMargin + state.graphW*.99)
                .attr('y', state.topMargin *.8)
                .style('text-anchor', 'end')
                .on('mouseup' , function() {
                    state.svg.dispatch('resetZoom');
                })
                .on('mouseover', function(){
                    d3.select(this).style('opacity', 1);
                })
                .on('mouseout', function() {
                    d3.select(this).style('opacity', .6);
                });

            TextFitToBox()
                .bbox({
                    width: state.graphW *.4,
                    height: Math.min(13,state.topMargin *.8)
                })
                (resetBtn.node());
        }

        function setEvents() {

            state.svg.on('zoom', function() {
                var evData = d3.event.detail,
                    zoomX = evData.zoomX,
                    zoomY = evData.zoomY,
                    redraw = (evData.redraw==null)?true:evData.redraw;

                if (!zoomX && !zoomY) return;

                if (zoomX) state.zoomX=zoomX;
                if (zoomY) state.zoomY=zoomY;

                state.svg.dispatch('zoomScent', { detail: {
                    zoomX: zoomX,
                    zoomY: zoomY
                }});

                if (!redraw) return;

                state._rerender();
                if (state.onZoom) state.onZoom(state.zoomX, state.zoomY);
            });

            state.svg.on('resetZoom', function() {
                var prevZoomX = state.zoomX;
                var prevZoomY = state.zoomY || [null, null];

                var newZoomX = state.enableOverview
                        ?state.overviewArea.domainRange()
                        :[
                        d3.min(state.flatData, function(d) { return d.timeRange[0]; }),
                        d3.max(state.flatData, function(d) { return d.timeRange[1]; })
                    ],
                    newZoomY = [null, null];

                if (prevZoomX[0]<newZoomX[0] || prevZoomX[1]>newZoomX[1]
                    || prevZoomY[0]!=newZoomY[0] || prevZoomY[1]!=newZoomX[1]) {

                    state.zoomX = [
                        new Date(Math.min(prevZoomX[0],newZoomX[0])),
                        new Date(Math.max(prevZoomX[1],newZoomX[1]))
                    ];
                    state.zoomY = newZoomY;
                    state.svg.dispatch('zoomScent', { detail: {
                        zoomX: state.zoomX,
                        zoomY: state.zoomY
                    }});

                    state._rerender();
                }

                if (state.onZoom) state.onZoom(null, null);
            });
        }
    },

    update(state) {

        applyFilters();
        setupHeights();

        adjustXScale();
        adjustYScale();
        adjustGrpScale();

        renderAxises();
        renderGroups();

        renderTimelines();
        adjustLegend();

        //

        function applyFilters() {
            // Flat data based on segment length
            state.flatData = (state.minSegmentDuration>0
                    ?state.completeFlatData.filter(function(d) {
                    return (d.timeRange[1]-d.timeRange[0])>=state.minSegmentDuration;
                })
                    :state.completeFlatData
            );

            // zoomY
            if (state.zoomY==null || state.zoomY==[null, null]) {
                state.structData = state.completeStructData;
                state.nLines=0;
                for (var i=0, len=state.structData.length; i<len; i++) {
                    state.nLines += state.structData[i].lines.length;
                }
                return;
            }

            state.structData = [];
            var cntDwn = [state.zoomY[0]==null?0:state.zoomY[0]]; // Initial threshold
            cntDwn.push(Math.max(0, (state.zoomY[1]==null?state.totalNLines:state.zoomY[1]+1)-cntDwn[0])); // Number of lines
            state.nLines = cntDwn[1];
            for (var i=0, len=state.completeStructData.length; i<len; i++) {

                var validLines = state.completeStructData[i].lines;

                if(state.minSegmentDuration>0) {  // Use only non-filtered (due to segment length) groups/labels
                    if (!state.flatData.some(function(d){
                            return d.group == state.completeStructData[i].group;
                        })) {
                        continue; // No data for this group
                    }

                    validLines = state.completeStructData[i].lines.filter( function(d) {
                        return state.flatData.some( function (dd) {
                            return (dd.group == state.completeStructData[i].group && dd.label == d);
                        })
                    });
                }

                if (cntDwn[0]>=validLines.length) { // Ignore whole group (before start)
                    cntDwn[0]-=validLines.length;
                    continue;
                }

                var groupData = {
                    group: state.completeStructData[i].group,
                    lines: null
                };

                if (validLines.length-cntDwn[0]>=cntDwn[1]) {  // Last (or first && last) group (partial)
                    groupData.lines = validLines.slice(cntDwn[0],cntDwn[1]+cntDwn[0]);
                    state.structData.push(groupData);
                    cntDwn[1]=0;
                    break;
                }

                if (cntDwn[0]>0) {  // First group (partial)
                    groupData.lines = validLines.slice(cntDwn[0]);
                    cntDwn[0]=0;
                } else {    // Middle group (full fit)
                    groupData.lines = validLines;
                }

                state.structData.push(groupData);
                cntDwn[1]-=groupData.lines.length;
            }

            state.nLines-=cntDwn[1];
        }

        function setupHeights() {
            state.graphH = d3.min([state.nLines*state.maxLineHeight, state.maxHeight-state.topMargin-state.bottomMargin]);
            state.height = state.graphH + state.topMargin + state.bottomMargin;
            state.svg.transition().duration(state.transDuration)
                .attr('height', state.height);
        }

        function adjustXScale() {

            state.zoomX[0] = state.zoomX[0] || d3.min(state.flatData, function(d) { return d.timeRange[0]; });
            state.zoomX[1] = state.zoomX[1] || d3.max(state.flatData, function(d) { return d.timeRange[1]; });

            state.xScale.domain(state.zoomX);
        }

        function adjustYScale() {
            var labels = [];
            for (var i= 0, len=state.structData.length; i<len; i++) {
                labels = labels.concat(state.structData[i].lines.map(function (d) {
                    return state.structData[i].group + '+&+' + d
                }));
            }

            state.yScale.domain(labels);
            state.yScale.range([state.graphH/labels.length*0.5, state.graphH*(1-0.5/labels.length)]);
        }

        function adjustGrpScale() {
            state.grpScale.domain(state.structData.map(function(d) { return d.group; }));

            var cntLines=0;
            state.grpScale.range(state.structData.map(function(d) {
                var pos = (cntLines+d.lines.length/2)/state.nLines*state.graphH;
                cntLines+=d.lines.length;
                return pos;
            }));
        }

        function adjustLegend() {
            state.colorLegend
                .width(Math.max(120, state.graphW/3 * (state.zQualitative?2:1)))
                .height(state.topMargin*.6)
                .scale(state.zColorScale)
                .label(state.zScaleLabel);
        }

        function renderAxises() {

            function reduceLabel(label, maxChars) {
                return label.length<=maxChars?label:(
                label.substring(0, maxChars*2/3)
                + '...'
                + label.substring(label.length - maxChars/3, label.length
                ));
            }

            // X
            state.svg.select('g.x-axis')
                .style('stroke-opacity', 0)
                .style('fill-opacity', 0)
                .attr('transform', 'translate(0,' + state.graphH + ')')
                .transition().duration(state.transDuration)
                .call(state.xAxis)
                .style('stroke-opacity', 1)
                .style('fill-opacity', 1);

            /* Angled x axis labels
             state.svg.select('g.x-axis').selectAll('text')
             .style('text-anchor', 'end')
             .attr('transform', 'translate(-10, 3) rotate(-60)');
             */

            state.xGrid.tickSize(state.graphH);
            state.svg.select('g.x-grid')
                .attr('transform', 'translate(0,' + state.graphH + ')')
                .transition().duration(state.transDuration)
                .call(state.xGrid);

            // Y
            var fontVerticalMargin = 0.6;
            var labelDisplayRatio = Math.ceil(state.nLines*state.minLabelFont/Math.sqrt(2)/state.graphH/fontVerticalMargin);
            var tickVals = state.yScale.domain().filter(function(d, i) { return !(i % labelDisplayRatio); });
            var fontSize = Math.min(12, state.graphH/tickVals.length*fontVerticalMargin*Math.sqrt(2));
            var maxChars = Math.ceil(state.rightMargin/(fontSize/Math.sqrt(2)));

            state.yAxis.tickValues(tickVals);
            state.yAxis.tickFormat(function(d) {
                return reduceLabel(d.split('+&+')[1], maxChars);
            });
            state.svg.select('g.y-axis')
                .transition().duration(state.transDuration)
                .style('font-size', fontSize + 'px')
                .call(state.yAxis);

            // Grp
            var minHeight = d3.min(state.grpScale.range(), function (d,i) {
                return i>0?d-state.grpScale.range()[i-1]:d*2;
            });
            fontSize = Math.min(14, minHeight*fontVerticalMargin*Math.sqrt(2));
            maxChars = Math.floor(state.leftMargin/(fontSize/Math.sqrt(2)));

            state.grpAxis.tickFormat(function(d) {
                return reduceLabel(d, maxChars);
            });
            state.svg.select('g.grp-axis')
                .transition().duration(state.transDuration)
                .style('font-size', fontSize + 'px')
                .call(state.grpAxis);

            // Make Axises clickable
            if (state.onLabelClick) {
                state.svg.selectAll('g.y-axis,g.grp-axis').selectAll('text')
                    .style('cursor', 'pointer')
                    .on('click', function(d) {
                        var segms = d.split('+&+');
                        var lbl = segms[segms.length-1];
                        state.onLabelClick(lbl);
                    });
            }
        }

        function renderGroups() {

            var groups = state.graph.selectAll('rect.series-group').data(state.structData, function(d) { return d.group});

            groups.exit()
                .transition().duration(state.transDuration)
                .style('stroke-opacity', 0)
                .style('fill-opacity', 0)
                .remove();

            var newGroups = groups.enter().append('rect')
                .attr('class', 'series-group')
                .attr('width', state.graphW)
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', 0)
                .style('fill', 'url(#' + state.groupGradId + ')')
                .on('mouseover', state.groupTooltip.show)
                .on('mouseout', state.groupTooltip.hide);

            newGroups.append('title')
                .text('click-drag to zoom in');

            groups = groups.merge(newGroups);

            groups.transition().duration(state.transDuration)
                .attr('height', function (d) {
                    return state.graphH*d.lines.length/state.nLines;
                })
                .attr('y', function (d) {
                    return state.grpScale(d.group)-state.graphH*d.lines.length/state.nLines/2;
                });
        }

        function renderTimelines(maxElems) {

            if (maxElems<0) maxElems=null;

            var hoverEnlargeRatio = .4;

            var dataFilter = function(d, i) {
                return (maxElems==null || i<maxElems) &&
                    (state.grpScale.domain().indexOf(d.group)+1 &&
                    d.timeRange[1]>=state.xScale.domain()[0] &&
                    d.timeRange[0]<=state.xScale.domain()[1] &&
                    state.yScale.domain().indexOf(d.group+'+&+'+d.label)+1);
            };

            state.lineHeight = state.graphH/state.nLines*0.8;

            var timelines = state.graph.selectAll('rect.series-segment').data(
                state.flatData.filter(dataFilter),
                function(d) { return d.group + d.label + d.timeRange[0];}
            );

            timelines.exit()
                .transition().duration(state.transDuration)
                .style('fill-opacity', 0)
                .remove();

            var newSegments = timelines.enter()
                .append('rect')
                .attr('class', 'series-segment')
                .attr('rx', 1)
                .attr('ry', 1)
                .attr('x', state.graphW/2)
                .attr('y', state.graphH/2)
                .attr('width', 0)
                .attr('height', 0)
                .style('fill', function(d) {
                    return state.zColorScale(d.val);
                })
                .style('fill-opacity', 0)
                .on('mouseover.groupTooltip', state.groupTooltip.show)
                .on('mouseout.groupTooltip', state.groupTooltip.hide)
                .on('mouseover.lineTooltip', state.lineTooltip.show)
                .on('mouseout.lineTooltip', state.lineTooltip.hide)
                .on('mouseover.segmentTooltip', state.segmentTooltip.show)
                .on('mouseout.segmentTooltip', state.segmentTooltip.hide);

            newSegments
                .on('mouseover', function() {
                    if ('disableHover' in state && state.disableHover)
                        return;

                    MoveToFront()(this);

                    var hoverEnlarge = state.lineHeight*hoverEnlargeRatio;

                    d3.select(this)
                        .transition().duration(70)
                        .attr('x', function (d) {
                            return state.xScale(d.timeRange[0])-hoverEnlarge/2;
                        })
                        .attr('width', function (d) {
                            return d3.max([1, state.xScale(d.timeRange[1])-state.xScale(d.timeRange[0])])+hoverEnlarge;
                        })
                        .attr('y', function (d) {
                            return state.yScale(d.group+'+&+'+d.label)-(state.lineHeight+hoverEnlarge)/2;
                        })
                        .attr('height', state.lineHeight+hoverEnlarge)
                        .style('fill-opacity', 1);
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .transition().duration(250)
                        .attr('x', function (d) {
                            return state.xScale(d.timeRange[0]);
                        })
                        .attr('width', function (d) {
                            return d3.max([1, state.xScale(d.timeRange[1])-state.xScale(d.timeRange[0])]);
                        })
                        .attr('y', function (d) {
                            return state.yScale(d.group+'+&+'+d.label)-state.lineHeight/2;
                        })
                        .attr('height', state.lineHeight)
                        .style('fill-opacity', .8);
                });

            timelines = timelines.merge(newSegments);

            timelines.transition().duration(state.transDuration)
                .attr('x', function (d) {
                    return state.xScale(d.timeRange[0]);
                })
                .attr('width', function (d) {
                    return d3.max([1, state.xScale(d.timeRange[1])-state.xScale(d.timeRange[0])]);
                })
                .attr('y', function (d) {
                    return state.yScale(d.group+'+&+'+d.label)-state.lineHeight/2;
                })
                .attr('height', state.lineHeight)
                .style('fill-opacity', .8);
        }
    }
});
