import './timelines.css';

import Kapsule from 'kapsule';
import * as d3 from 'd3';
import d3Tip from 'd3-tip';

import './d3-utils.js';
import TimeOverview from './time-overview.js';
import XYOverviewArea from './xy-overview-area.js';

function alphaNumCmp(a,b){
    var alist = a.split(/(\d+)/),
        blist = b.split(/(\d+)/);

    (alist.length && alist[alist.length-1] == '') ? alist.pop() : null; // remove the last element if empty
    (blist.length && blist[blist.length-1] == '') ? blist.pop() : null; // remove the last element if empty

    for (var i = 0, len = Math.max(alist.length, blist.length); i < len;i++){
        if (alist.length==i || blist.length==i) { // Out of bounds for one of the sides
            return alist.length - blist.length;
        }
        if (alist[i] != blist[i]){ // find the first non-equal part
            if (alist[i].match(/\d/)) // if numeric
            {
                return (+alist[i])-(+blist[i]); // compare as number
            } else {
                return (alist[i].toLowerCase() > blist[i].toLowerCase())?1:-1; // compare as string
            }
        }
    }
    return 0;
}

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
                    state.overviewArea.update(state.zoomX, state.zoomX);
                    //var yDomain = [0, state.totalNLines];
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
        width: { default: 720, triggerUpdate: false },
        leftMargin: { default: 90, triggerUpdate: false },
        rightMargin: { default: 100, triggerUpdate: false },
        topMargin: {default: 26, triggerUpdate: false },
        bottomMargin: {default: 30, triggerUpdate: false },
        maxHeight: { default: 640 },
        throbberImg: { triggerUpdate: false },
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
        zDataLabel: { default: '', triggerUpdate: false }, // Units of z data. Used in the tooltip descriptions
        zScaleLabel: { default: '', triggerUpdate: false }, // Units of valScale. Used in the legend label
        enableOverview: { default: true }, // True/False
        animationsEnabled: {
            default: true,
            onChange(val, state) {
                state.transDuration = val?700:0;
            }
        },
        forceThrobber: { // True/false (true = shows throbber and leaves it on permanently. false = automatic internal management)
            default: false,
            onChange(val, state) {
                if (val && state.throbber) {
                    state.throbber.show();
                }
            }
        },
        axisClickURL: { triggerUpdate: false },

        // Callbacks
        onZoom: {} // When user zooms in / resets zoom. Returns ([startX, endX], [startY, endY])
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

            // ToDo: How to call update from here?
            updateFn(state);

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

            if (!_) { return state.overviewArea.domainRange; }
            state.overviewArea.update(_, state.overviewArea.currentSelection);
            return this;
        },
        refresh(state) {
            // ToDo: How to call update from here?
            updateFn(state);
            return this;
        }
    },

    init(el, state) {
        Object.assign(state, Object.assign({
            height : null,
            overviewHeight : 20, // Height of overview section in bottom
            lineMaxHeight : 12,
            minLabelFont : 2,
            groupBkgGradient : ['#FAFAFA', '#E0E0E0'],

            xScale : d3.scaleTime(),
            yScale : d3.scalePoint(),
            grpScale : d3.scaleOrdinal(),
            valScale : d3.scaleLinear()
                .domain([0, 0.5, 1])
                .range(['red', 'yellow', 'green'])
                .clamp(false),

            xAxis : d3.axisBottom(),
            xGrid : d3.axisTop(),
            yAxis : d3.axisRight(),
            grpAxis : d3.axisLeft(),

            svg : null,
            graph : null,
            overviewAreaElem: null,
            overviewArea: null,

            graphW : null,
            graphH : null,

            completeStructData : null,
            structData : null,
            completeFlatData : null,
            flatData : null,
            totalNLines : null,
            nLines : null,

            minSegmentDuration : 0, // ms

            transDuration : 700,     // ms for transition duration

            throbber: null,
            throbberR: 23,

            labelCmpFunction: alphaNumCmp,
            grpCmpFunction: alphaNumCmp
        }, state));

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

            state.groupGradId = state.svg.addGradient(
                d3.scaleLinear()
                    .domain([0, 1])
                    .range(state.groupBkgGradient),
                -90
            );

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

            state.svg.appendColorLegend(
                (state.leftMargin + state.graphW*0.05),
                2,
                state.graphW/3,
                state.topMargin*.6,
                state.valScale,
                state.zScaleLabel
            );


            if (state.enableOverview) {
                addOverviewArea();
            }

            if (state.throbberImg) {
                state.throbber = state.svg.appendImage(
                    state.throbberImg,
                    state.leftMargin + (state.graphW-state.throbberR)/2,
                    state.topMargin + 5,
                    state.throbberR,
                    state.throbberR,
                    'xMidYMin'
                ).hide();

                state.throbber.img
                    .style('opacity', 0.85)
                    .append('title').text('Loading data...');
            }


            // Applies to ordinal scales (invert not supported in d3)
            function invertOrdinal(val, cmpFunc) {
                cmpFunc = cmpFunc || function (a, b) {
                        return (a >= b);
                    };

                var domain = this.domain(),
                    range = this.range();

                if (range.length === 2 && domain.length !== 2) {
                    // Special case, interpolate range vals
                    range = d3.range(range[0], range[1], (range[1] - range[0]) / domain.length);
                }

                var bias = range[0];
                for (var i = 0, len = range.length; i < len; i++) {
                    if (cmpFunc(range[i] + bias, val)) {
                        return domain[Math.round(i * domain.length / range.length)];
                    }
                }

                return this.domain()[this.domain().length-1];
            }

            function addOverviewArea() {
                var overviewMargins = { top: 1, right: 20, bottom: 20, left: 20 };
                state.overviewArea = new TimeOverview(
                    {
                        margins: overviewMargins,
                        width: state.width*0.8,
                        height: state.overviewHeight + overviewMargins.top + overviewMargins.bottom,
                        verticalLabels: false
                    },
                    function(startTime, endTime) {
                        state.svg.dispatch('zoom', { detail: {
                            zoomX: [startTime, endTime],
                            zoomY: null
                        }});
                    },
                    this
                );

                state.overviewArea.init(state.overviewAreaElem.node());

                state.svg.on('zoomScent', function() {
                    var zoomX = d3.event.detail.zoomX;

                    if (!state.overviewArea || !zoomX) return;

                    // Out of overview bounds
                    if (zoomX[0]<state.overviewArea.domainRange[0] || zoomX[1]>state.overviewArea.domainRange[1]) {
                        state.overviewArea.update(
                            [
                                new Date(Math.min(zoomX[0], state.overviewArea.domainRange[0])),
                                new Date(Math.max(zoomX[1], state.overviewArea.domainRange[1]))
                            ],
                            state.zoomX
                        );
                    } else { // Normal case
                        state.overviewArea.updateSelection(zoomX);
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
                    var normVal = state.valScale.domain()[state.valScale.domain().length-1] - state.valScale.domain()[0];
                    var dateFormat = d3.timeFormat('%Y-%m-%d %H:%M:%S');
                    return '<strong>' + d.labelVal + ' </strong>' + state.zDataLabel
                        + (normVal?' (<strong>' + Math.round((d.val-state.valScale.domain()[0])/normVal*100*100)/100 + '%</strong>)':'') + '<br>'
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

            state.svg.append('text')
                .attr('class', 'reset-zoom-btn')
                .text('Reset Zoom')
                .attr('x', state.leftMargin + state.graphW*.99)
                .attr('y', state.topMargin *.8)
                .style('text-anchor', 'end')
                .textFitToBox(state.graphW *.4, Math.min(13,state.topMargin *.8))
                .on('mouseup' , function() {
                    state.svg.dispatch('resetZoom');
                })
                .on('mouseover', function(){
                    d3.select(this).style('opacity', 1);
                })
                .on('mouseout', function() {
                    d3.select(this).style('opacity', .6);
                });
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

                // ToDo figure this out!!
                draw();
                if (state.onZoom) state.onZoom(state.zoomX, state.zoomY);
            });

            state.svg.on('resetZoom', function() {
                var prevZoomX = state.zoomX;
                var prevZoomY = state.zoomY || [null, null];

                var newZoomX = state.enableOverview
                        ?state.overviewArea.domainRange
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

                    draw();
                }

                if (state.onZoom) state.onZoom(null, null);
            });
        }
    },

    update: function updateFn(state) {

        applyFilters();
        setupHeights();

        adjustXScale();
        adjustYScale();
        adjustGrpScale();

        renderAxises();
        renderGroups();

        if (state.throbber) { state.throbber.show(); }

        renderTimelines();

        if (state.throbber && !state.forceThrobber) {
            state.throbber.hide();
        }

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
            state.graphH = d3.min([state.nLines*state.lineMaxHeight, state.maxHeight-state.topMargin-state.bottomMargin]);
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
                .style('font', fontSize + 'px sans-serif')
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
                .style('font', fontSize + 'px sans-serif')
                .call(state.grpAxis);

            // Make Axises clickable
            if (state.axisClickURL) {
                state.svg.selectAll('g.y-axis,g.grp-axis').selectAll('text')
                    .style('cursor', 'pointer')
                    .on('click', function(d){
                        var segms = d.split('+&+');
                        var lbl = segms[segms.length-1];
                        window.open(state.axisClickURL + lbl, '_blank');
                    })
                    .append('title')
                    .text(function(d) {
                        var segms = d.split('+&+');
                        var lbl = segms[segms.length-1];
                        return 'Open ' + lbl + ' on ' + state.axisClickURL;
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
                    return state.valScale(d.val);
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

                    var hoverEnlarge = state.lineHeight*hoverEnlargeRatio;

                    d3.select(this)
                        .moveToFront()
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

function old() {
    var env = {
        width : 720,  // default width
        height : null,
        maxHeight : 640, // default maxHeight
        overviewHeight : 20, // Height of overview section in bottom
        lineMaxHeight : 12,
        minLabelFont : 2,
        margin : {top: 26, right: 100, bottom: 30, left: 90 },
        groupBkgGradient : ['#FAFAFA', '#E0E0E0'],

        xScale : d3.scaleTime(),
        yScale : d3.scalePoint(),
        grpScale : d3.scaleOrdinal(),
        valScale : d3.scaleLinear()
            .domain([0, 0.5, 1])
            .range(["red", "yellow", "green"])
            .clamp(false),

        zDataLabel: "", // Units of z data. Used in the tooltip descriptions
        zScaleLabel: "", // Units of valScale. Used in the legend label.

        xAxis : d3.axisBottom(),
        xGrid : d3.axisTop(),
        yAxis : d3.axisRight(),
        grpAxis : d3.axisLeft(),

        svg : null,
        graph : null,
        overviewAreaElem: null,
        overviewArea: null,

        graphW : null,
        graphH : null,

        completeStructData : null,
        structData : null,
        completeFlatData : null,
        flatData : null,
        totalNLines : null,
        nLines : null,

        zoomX : [null, null], // Which time-range to show (null = min/max)
        zoomY : [null, null], // Which lines to show (null = min/max) [0 indexed]

        minSegmentDuration : 0, // ms

        transDuration : 700,     // ms for transition duration

        throbber: null,
        throbberImg: null,
        throbberR: 23,
        forceThrobber: false,   // Force the throbber to stay on

        enableOverview: true,

        axisClickURL: null,

        labelCmpFunction: alphaNumCmp,
        grpCmpFunction: alphaNumCmp,

        // Events callbacks
        onZoom: null    // When user zooms in / resets zoom. Returns ([startX, endX], [startY, endY])
    };


    function chart(nodeElem, data) {

        var elem = d3.select(nodeElem)
            .attr('class', 'timelines-chart');

        env.svg = elem.append("svg");
        env.overviewAreaElem = elem.append('div');

        initStatic();
        drawNewData(data);

        return chart;
    }


    function parseData(rawData) {

        env.completeStructData = [];
        env.completeFlatData = [];
        env.totalNLines = 0;

        var dateObjs = rawData.length?rawData[0].data[0].data[0].timeRange[0] instanceof Date:false;

        for (var i= 0, ilen=rawData.length; i<ilen; i++) {
            var group = rawData[i].group;
            env.completeStructData.push({
                group: group,
                lines: rawData[i].data.map(function(d) { return d.label; })
            });

            for (var j= 0, jlen=rawData[i].data.length; j<jlen; j++) {
                for (var k= 0, klen=rawData[i].data[j].data.length; k<klen; k++) {
                    env.completeFlatData.push({
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
                env.totalNLines++;
            }
        }
    }

    function initStatic() {

        buildDomStructure();
        addTooltips();
        addZoomSelection();
        setEvents();

        function buildDomStructure () {

            env.yScale.invert = invertOrdinal;
            env.grpScale.invert = invertOrdinal;

            env.groupGradId = env.svg.addGradient(
                d3.scaleLinear()
                    .domain([0, 1])
                    .range(env.groupBkgGradient),
                -90
            );

            env.graphW = env.width-env.margin.left-env.margin.right;
            env.xScale.range([0, env.graphW])
                .clamp(true);

            env.svg.attr("width", env.width);

            var axises = env.svg.append('g');

            env.graph = env.svg.append('g')
                .attr("transform", "translate(" + env.margin.left + "," + env.margin.top + ")");

            axises.attr("class", "axises")
                .attr("transform", "translate(" + env.margin.left + "," + env.margin.top + ")");

            axises.append("g")
                .attr("class", "x-axis");

            axises.append("g")
                .attr("class", "x-grid");

            axises.append("g")
                .attr("class", "y-axis")
                .attr("transform", "translate(" + env.graphW + ", 0)");

            axises.append("g")
                .attr("class", "grp-axis");

            env.xAxis.scale(env.xScale)
                .ticks(Math.round(env.graphW*0.011));

            env.xGrid.scale(env.xScale)
                .tickFormat("")
                .ticks(env.xAxis.ticks()[0]);

            env.yAxis.scale(env.yScale)
                .tickSize(0);

            env.grpAxis.scale(env.grpScale)
                .tickSize(0);

            env.svg.appendColorLegend(
                (env.margin.left + env.graphW*0.05),
                2,
                env.graphW/3,
                env.margin.top*.6,
                env.valScale,
                env.zScaleLabel
            );


            if (env.enableOverview) {
                addOverviewArea();
            }

            if (env.throbberImg) {
                env.throbber = env.svg.appendImage(
                    env.throbberImg,
                    env.margin.left + (env.graphW-env.throbberR)/2,
                    env.margin.top + 5,
                    env.throbberR,
                    env.throbberR,
                    'xMidYMin'
                ).hide();

                env.throbber.img
                    .style('opacity', 0.85)
                    .append('title').text('Loading data...');
            }


            // Applies to ordinal scales (invert not supported in d3)
            function invertOrdinal(val, cmpFunc) {
                cmpFunc = cmpFunc || function (a, b) {
                        return (a >= b);
                    };

                var domain = this.domain(),
                    range = this.range();

                if (range.length === 2 && domain.length !== 2) {
                    // Special case, interpolate range vals
                    range = d3.range(range[0], range[1], (range[1] - range[0]) / domain.length);
                }

                var bias = range[0];
                for (var i = 0, len = range.length; i < len; i++) {
                    if (cmpFunc(range[i] + bias, val)) {
                        return domain[Math.round(i * domain.length / range.length)];
                    }
                }

                return this.domain()[this.domain().length-1];
            }

            function addOverviewArea() {
                var overviewMargins = { top: 1, right: 20, bottom: 20, left: 20 };
                env.overviewArea = new TimeOverview(
                    {
                        margins: overviewMargins,
                        width: env.width*0.8,
                        height: env.overviewHeight + overviewMargins.top + overviewMargins.bottom,
                        verticalLabels: false
                    },
                    function(startTime, endTime) {
                        env.svg.dispatch('zoom', { detail: {
                            zoomX: [startTime, endTime],
                            zoomY: null
                        }});
                    },
                    this
                );

                env.overviewArea.init(env.overviewAreaElem.node());

                env.svg.on('zoomScent', function() {
                    var zoomX = d3.event.detail.zoomX;

                    if (!env.overviewArea || !zoomX) return;

                    // Out of overview bounds
                    if (zoomX[0]<env.overviewArea.domainRange[0] || zoomX[1]>env.overviewArea.domainRange[1]) {
                        env.overviewArea.update(
                            [
                                new Date(Math.min(zoomX[0], env.overviewArea.domainRange[0])),
                                new Date(Math.max(zoomX[1], env.overviewArea.domainRange[1]))
                            ],
                            env.zoomX
                        );
                    } else { // Normal case
                        env.overviewArea.updateSelection(zoomX);
                    }
                });
            }
        }

        function addTooltips() {
            env.groupTooltip = d3Tip()
                .attr('class', 'chart-tooltip group-tooltip')
                .direction('w')
                .offset([0, 0])
                .html(function(d) {
                    var leftPush = (d.hasOwnProperty("timeRange")
                        ?env.xScale(d.timeRange[0])
                        :0
                    );
                    var topPush = (d.hasOwnProperty("label")
                        ?env.grpScale(d.group)-env.yScale(d.group+"+&+"+d.label)
                        :0
                    );
                    env.groupTooltip.offset([topPush, -leftPush]);
                    return d.group;
                });

            env.svg.call(env.groupTooltip);

            env.lineTooltip = d3Tip()
                .attr('class', 'chart-tooltip line-tooltip')
                .direction('e')
                .offset([0, 0])
                .html(function(d) {
                    var rightPush = (d.hasOwnProperty("timeRange")?env.xScale.range()[1]-env.xScale(d.timeRange[1]):0);
                    env.lineTooltip.offset([0, rightPush]);
                    return d.label;
                });

            env.svg.call(env.lineTooltip);

            env.segmentTooltip = d3Tip()
                .attr('class', 'chart-tooltip segment-tooltip')
                .direction('s')
                .offset([5, 0])
                .html(function(d) {
                    var normVal = env.valScale.domain()[env.valScale.domain().length-1] - env.valScale.domain()[0];
                    var dateFormat = d3.timeFormat("%Y-%m-%d %H:%M:%S");
                    return "<strong>" + d.labelVal + " </strong>" + env.zDataLabel
                        + (normVal?" (<strong>" + Math.round((d.val-env.valScale.domain()[0])/normVal*100*100)/100 + "%</strong>)":"") + "<br>"
                        + "<strong>From: </strong>" + dateFormat(d.timeRange[0]) + "<br>"
                        + "<strong>To: </strong>" + dateFormat(d.timeRange[1]);
                });

            env.svg.call(env.segmentTooltip);
        }

        function addZoomSelection() {
            env.graph.on("mousedown", function() {
                if (d3.select(window).on("mousemove.zoomRect")!=null) // Selection already active
                    return;

                var e = this;

                if (d3.mouse(e)[0]<0 || d3.mouse(e)[0]>env.graphW || d3.mouse(e)[1]<0 || d3.mouse(e)[1]>env.graphH)
                    return;

                env.disableHover=true;

                var rect = env.graph.append("rect")
                    .attr('class', 'chart-zoom-selection');

                var startCoords = d3.mouse(e);

                d3.select(window)
                    .on("mousemove.zoomRect", function() {
                        d3.event.stopPropagation();
                        var newCoords = [
                            Math.max(0, Math.min(env.graphW, d3.mouse(e)[0])),
                            Math.max(0, Math.min(env.graphH, d3.mouse(e)[1]))
                        ];
                        rect.attr("x", Math.min(startCoords[0], newCoords[0]))
                            .attr("y", Math.min(startCoords[1], newCoords[1]))
                            .attr("width", Math.abs(newCoords[0] - startCoords[0]))
                            .attr("height", Math.abs(newCoords[1] - startCoords[1]));

                        env.svg.dispatch('zoomScent', { detail: {
                            zoomX: [startCoords[0], newCoords[0]].sort(d3.ascending).map(env.xScale.invert),
                            zoomY: [startCoords[1], newCoords[1]].sort(d3.ascending).map(function(d) {
                                return env.yScale.domain().indexOf(env.yScale.invert(d))
                                    + ((env.zoomY && env.zoomY[0])?env.zoomY[0]:0);
                            })
                        }});
                    })
                    .on("mouseup.zoomRect", function() {
                        d3.select(window).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);
                        d3.select("body").classed("stat-noselect", false);
                        rect.remove();
                        env.disableHover=false;

                        var endCoords = [
                            Math.max(0, Math.min(env.graphW, d3.mouse(e)[0])),
                            Math.max(0, Math.min(env.graphH, d3.mouse(e)[1]))
                        ];

                        if (startCoords[0]==endCoords[0] && startCoords[1]==endCoords[1])
                            return;

                        var newDomainX = [startCoords[0], endCoords[0]].sort(d3.ascending).map(env.xScale.invert);

                        var newDomainY = [startCoords[1], endCoords[1]].sort(d3.ascending).map(function(d) {
                            return env.yScale.domain().indexOf(env.yScale.invert(d))
                                + ((env.zoomY && env.zoomY[0])?env.zoomY[0]:0);
                        });

                        var changeX=((newDomainX[1] - newDomainX[0])>(60*1000)); // Zoom damper
                        var changeY=(newDomainY[0]!=env.zoomY[0] || newDomainY[1]!=env.zoomY[1]);

                        if (changeX || changeY) {
                            env.svg.dispatch('zoom', { detail: {
                                zoomX: changeX?newDomainX:null,
                                zoomY: changeY?newDomainY:null
                            }});
                        }
                    }, true);

                d3.event.stopPropagation();
            });

            env.svg.append('text')
                .attr('class', 'reset-zoom-btn')
                .text("Reset Zoom")
                .attr("x", env.margin.left + env.graphW*.99)
                .attr("y", env.margin.top *.8)
                .style("text-anchor", "end")
                .textFitToBox(env.graphW *.4, Math.min(13,env.margin.top *.8))
                .on("mouseup" , function() {
                    env.svg.dispatch('resetZoom');
                })
                .on("mouseover", function(){
                    d3.select(this).style('opacity', 1);
                })
                .on("mouseout", function() {
                    d3.select(this).style('opacity', .6);
                });
        }

        function setEvents() {

            env.svg.on('zoom', function() {
                var evData = d3.event.detail,
                    zoomX = evData.zoomX,
                    zoomY = evData.zoomY,
                    redraw = (evData.redraw==null)?true:evData.redraw;

                if (!zoomX && !zoomY) return;

                if (zoomX) env.zoomX=zoomX;
                if (zoomY) env.zoomY=zoomY;

                env.svg.dispatch('zoomScent', { detail: {
                    zoomX: zoomX,
                    zoomY: zoomY
                }});

                if (!redraw) return;

                draw();
                if (env.onZoom) env.onZoom(env.zoomX, env.zoomY);
            });

            env.svg.on('resetZoom', function() {
                var prevZoomX = env.zoomX;
                var prevZoomY = env.zoomY || [null, null];

                var newZoomX = env.enableOverview
                    ?env.overviewArea.domainRange
                    :[
                        d3.min(env.flatData, function(d) { return d.timeRange[0]; }),
                        d3.max(env.flatData, function(d) { return d.timeRange[1]; })
                    ],
                    newZoomY = [null, null];

                if (prevZoomX[0]<newZoomX[0] || prevZoomX[1]>newZoomX[1]
                    || prevZoomY[0]!=newZoomY[0] || prevZoomY[1]!=newZoomX[1]) {

                    env.zoomX = [
                        new Date(Math.min(prevZoomX[0],newZoomX[0])),
                        new Date(Math.max(prevZoomX[1],newZoomX[1]))
                    ];
                    env.zoomY = newZoomY;
                    env.svg.dispatch('zoomScent', { detail: {
                        zoomX: env.zoomX,
                        zoomY: env.zoomY
                    }});

                    draw();
                }

                if (env.onZoom) env.onZoom(null, null);
            });
        }
    }

    function drawNewData(data, keepGraphStructure) {
        keepGraphStructure = (keepGraphStructure==null?false:keepGraphStructure);

        var oldStructData = env.completeStructData;
        parseData(data);

        if (keepGraphStructure) {
            env.completeStructData = oldStructData;
        } else {
            env.zoomX = [
                d3.min(env.completeFlatData, function(d) { return d.timeRange[0]; }),
                d3.max(env.completeFlatData, function(d) { return d.timeRange[1]; })
            ];

            env.zoomY = [null, null];

            if (env.overviewArea) {
                env.overviewArea.update(env.zoomX, env.zoomX);
                //var yDomain = [0, env.totalNLines];
            }
        }

        draw();
    }

    function draw() {

        applyFilters();
        setupHeights();

        adjustXScale();
        adjustYScale();
        adjustGrpScale();

        renderAxises();
        renderGroups();

        if (env.throbber) { env.throbber.show(); }

        renderTimelines();

        if (env.throbber && !env.forceThrobber) {
            env.throbber.hide();
        }

        function applyFilters() {
            // Flat data based on segment length
            env.flatData = (env.minSegmentDuration>0
                ?env.completeFlatData.filter(function(d) {
                        return (d.timeRange[1]-d.timeRange[0])>=env.minSegmentDuration;
                    })
                :env.completeFlatData
            );

            // zoomY
            if (env.zoomY==null || env.zoomY==[null, null]) {
                env.structData = env.completeStructData;
                env.nLines=0;
                for (var i=0, len=env.structData.length; i<len; i++) {
                    env.nLines += env.structData[i].lines.length;
                }
                return;
            }

            env.structData = [];
            var cntDwn = [env.zoomY[0]==null?0:env.zoomY[0]]; // Initial threshold
            cntDwn.push(Math.max(0, (env.zoomY[1]==null?env.totalNLines:env.zoomY[1]+1)-cntDwn[0])); // Number of lines
            env.nLines = cntDwn[1];
            for (var i=0, len=env.completeStructData.length; i<len; i++) {

                var validLines = env.completeStructData[i].lines;

                if(env.minSegmentDuration>0) {  // Use only non-filtered (due to segment length) groups/labels
                    if (!env.flatData.some(function(d){
                        return d.group == env.completeStructData[i].group;
                    })) {
                        continue; // No data for this group
                    }

                    validLines = env.completeStructData[i].lines.filter( function(d) {
                        return env.flatData.some( function (dd) {
                            return (dd.group == env.completeStructData[i].group && dd.label == d);
                        })
                    });
                }

                if (cntDwn[0]>=validLines.length) { // Ignore whole group (before start)
                    cntDwn[0]-=validLines.length;
                    continue;
                }

                var groupData = {
                    group: env.completeStructData[i].group,
                    lines: null
                };

                if (validLines.length-cntDwn[0]>=cntDwn[1]) {  // Last (or first && last) group (partial)
                    groupData.lines = validLines.slice(cntDwn[0],cntDwn[1]+cntDwn[0]);
                    env.structData.push(groupData);
                    cntDwn[1]=0;
                    break;
                }

                if (cntDwn[0]>0) {  // First group (partial)
                    groupData.lines = validLines.slice(cntDwn[0]);
                    cntDwn[0]=0;
                } else {    // Middle group (full fit)
                    groupData.lines = validLines;
                }

                env.structData.push(groupData);
                cntDwn[1]-=groupData.lines.length;
            }

            env.nLines-=cntDwn[1];
        }

        function setupHeights() {
            env.graphH = d3.min([env.nLines*env.lineMaxHeight, env.maxHeight-env.margin.top-env.margin.bottom]);
            env.height = env.graphH + env.margin.top + env.margin.bottom;
            env.svg.transition().duration(env.transDuration)
                .attr("height", env.height);
        }

        function adjustXScale() {

            env.zoomX[0] = env.zoomX[0] || d3.min(env.flatData, function(d) { return d.timeRange[0]; });
            env.zoomX[1] = env.zoomX[1] || d3.max(env.flatData, function(d) { return d.timeRange[1]; });

            env.xScale.domain(env.zoomX);
        }

        function adjustYScale() {
            var labels = [];
            for (var i= 0, len=env.structData.length; i<len; i++) {
                labels = labels.concat(env.structData[i].lines.map(function (d) {
                    return env.structData[i].group + "+&+" + d
                }));
            }

            env.yScale.domain(labels);
            env.yScale.range([env.graphH/labels.length*0.5, env.graphH*(1-0.5/labels.length)]);
        }

        function adjustGrpScale() {
            env.grpScale.domain(env.structData.map(function(d) { return d.group; }));

            var cntLines=0;
            env.grpScale.range(env.structData.map(function(d) {
                var pos = (cntLines+d.lines.length/2)/env.nLines*env.graphH;
                cntLines+=d.lines.length;
                return pos;
            }));
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
            env.svg.select('g.x-axis')
                .style('stroke-opacity', 0)
                .style('fill-opacity', 0)
                .attr("transform", "translate(0," + env.graphH + ")")
                .transition().duration(env.transDuration)
                    .call(env.xAxis)
                    .style('stroke-opacity', 1)
                    .style('fill-opacity', 1);

            /* Angled x axis labels
            env.svg.select('g.x-axis').selectAll("text")
                .style("text-anchor", "end")
                .attr('transform', 'translate(-10, 3) rotate(-60)');
            */

            env.xGrid.tickSize(env.graphH);
            env.svg.select('g.x-grid')
                .attr("transform", "translate(0," + env.graphH + ")")
                .transition().duration(env.transDuration)
                    .call(env.xGrid);

            // Y
            var fontVerticalMargin = 0.6;
            var labelDisplayRatio = Math.ceil(env.nLines*env.minLabelFont/Math.sqrt(2)/env.graphH/fontVerticalMargin);
            var tickVals = env.yScale.domain().filter(function(d, i) { return !(i % labelDisplayRatio); });
            var fontSize = Math.min(12, env.graphH/tickVals.length*fontVerticalMargin*Math.sqrt(2));
            var maxChars = Math.ceil(env.margin.right/(fontSize/Math.sqrt(2)));

            env.yAxis.tickValues(tickVals);
            env.yAxis.tickFormat(function(d) {
                return reduceLabel(d.split('+&+')[1], maxChars);
            });
            env.svg.select('g.y-axis')
                .transition().duration(env.transDuration)
                    .style('font', fontSize + 'px sans-serif')
                    .call(env.yAxis);

            // Grp
            var minHeight = d3.min(env.grpScale.range(), function (d,i) {
                return i>0?d-env.grpScale.range()[i-1]:d*2;
            });
            fontSize = Math.min(14, minHeight*fontVerticalMargin*Math.sqrt(2));
            maxChars = Math.floor(env.margin.left/(fontSize/Math.sqrt(2)));

            env.grpAxis.tickFormat(function(d) {
                return reduceLabel(d, maxChars);
            });
            env.svg.select('g.grp-axis')
                .transition().duration(env.transDuration)
                    .style('font', fontSize + 'px sans-serif')
                    .call(env.grpAxis);

            // Make Axises clickable
            if (env.axisClickURL) {
                env.svg.selectAll('g.y-axis,g.grp-axis').selectAll("text")
                    .style("cursor", "pointer")
                    .on("click", function(d){
                        var segms = d.split('+&+');
                        var lbl = segms[segms.length-1];
                        window.open(env.axisClickURL + lbl, '_blank');
                    })
                    .append('title')
                        .text(function(d) {
                            var segms = d.split('+&+');
                            var lbl = segms[segms.length-1];
                            return 'Open ' + lbl + ' on ' + env.axisClickURL;
                        });
            }
        }

        function renderGroups() {

            var groups = env.graph.selectAll('rect.series-group').data(env.structData, function(d) { return d.group});

            groups.exit()
                .transition().duration(env.transDuration)
                    .style("stroke-opacity", 0)
                    .style("fill-opacity", 0)
                    .remove();

            var newGroups = groups.enter().append('rect')
                .attr("class", "series-group")
                .attr('width', env.graphW)
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', 0)
                .style('fill', 'url(#' + env.groupGradId + ')')
                .on('mouseover', env.groupTooltip.show)
                .on('mouseout', env.groupTooltip.hide);

            newGroups.append('title')
                .text('click-drag to zoom in');

            groups = groups.merge(newGroups);

            groups.transition().duration(env.transDuration)
                .attr('height', function (d) {
                    return env.graphH*d.lines.length/env.nLines;
                })
                .attr('y', function (d) {
                    return env.grpScale(d.group)-env.graphH*d.lines.length/env.nLines/2;
                });
        }

        function renderTimelines(maxElems) {

            if (maxElems<0) maxElems=null;

            var hoverEnlargeRatio = .4;

            var dataFilter = function(d, i) {
                return (maxElems==null || i<maxElems) &&
                    (env.grpScale.domain().indexOf(d.group)+1 &&
                    d.timeRange[1]>=env.xScale.domain()[0] &&
                    d.timeRange[0]<=env.xScale.domain()[1] &&
                    env.yScale.domain().indexOf(d.group+"+&+"+d.label)+1);
            };

            env.lineHeight = env.graphH/env.nLines*0.8;

            var timelines = env.graph.selectAll('rect.series-segment').data(
                env.flatData.filter(dataFilter),
                function(d) { return d.group + d.label + d.timeRange[0];}
            );

            timelines.exit()
                .transition().duration(env.transDuration)
                    .style("fill-opacity", 0)
                    .remove();

            var newSegments = timelines.enter()
                .append('rect')
                    .attr("class", "series-segment")
                    .attr('rx', 1)
                    .attr('ry', 1)
                    .attr('x', env.graphW/2)
                    .attr('y', env.graphH/2)
                    .attr('width', 0)
                    .attr('height', 0)
                    .style('fill', function(d) {
                        return env.valScale(d.val);
                    })
                    .style('fill-opacity', 0)
                    .on('mouseover.groupTooltip', env.groupTooltip.show)
                    .on('mouseout.groupTooltip', env.groupTooltip.hide)
                    .on('mouseover.lineTooltip', env.lineTooltip.show)
                    .on('mouseout.lineTooltip', env.lineTooltip.hide)
                    .on('mouseover.segmentTooltip', env.segmentTooltip.show)
                    .on('mouseout.segmentTooltip', env.segmentTooltip.hide);

            newSegments
                .on("mouseover", function() {
                    if ('disableHover' in env && env.disableHover)
                        return;

                    var hoverEnlarge = env.lineHeight*hoverEnlargeRatio;

                    d3.select(this)
                        .moveToFront()
                        .transition().duration(70)
                            .attr('x', function (d) {
                                return env.xScale(d.timeRange[0])-hoverEnlarge/2;
                            })
                            .attr('width', function (d) {
                                return d3.max([1, env.xScale(d.timeRange[1])-env.xScale(d.timeRange[0])])+hoverEnlarge;
                            })
                            .attr('y', function (d) {
                                return env.yScale(d.group+"+&+"+d.label)-(env.lineHeight+hoverEnlarge)/2;
                            })
                            .attr('height', env.lineHeight+hoverEnlarge)
                            .style("fill-opacity", 1);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .transition().duration(250)
                            .attr('x', function (d) {
                                return env.xScale(d.timeRange[0]);
                            })
                            .attr('width', function (d) {
                                return d3.max([1, env.xScale(d.timeRange[1])-env.xScale(d.timeRange[0])]);
                            })
                            .attr('y', function (d) {
                                return env.yScale(d.group+"+&+"+d.label)-env.lineHeight/2;
                            })
                            .attr('height', env.lineHeight)
                            .style("fill-opacity", .8);
                });

            timelines = timelines.merge(newSegments);

            timelines.transition().duration(env.transDuration)
                .attr('x', function (d) {
                    return env.xScale(d.timeRange[0]);
                })
                .attr('width', function (d) {
                    return d3.max([1, env.xScale(d.timeRange[1])-env.xScale(d.timeRange[0])]);
                })
                .attr('y', function (d) {
                    return env.yScale(d.group+"+&+"+d.label)-env.lineHeight/2;
                })
                .attr('height', env.lineHeight)
                .style('fill-opacity', .8);
        }
    }

    function y2Label(y) {

        function getIdxLine(grpData, idx) {
            return {
                'group': grpData.group,
                'label': grpData.lines[idx]
            };
        }

        if (y==null) return y;

        var cntDwn = y;
        for (var i=0, len=env.completeStructData.length; i<len; i++) {
            if (env.completeStructData[i].lines.length>cntDwn)
                return getIdxLine(env.completeStructData[i], cntDwn);
            cntDwn-=env.completeStructData[i].lines.length;
        }

        // y larger than all lines, return last
        return getIdxLine(env.completeStructData[env.completeStructData.length-1], env.completeStructData[env.completeStructData.length-1].lines.length-1);
    }

    function label2Y(label, useIdxAfterIfNotFound) {

        useIdxAfterIfNotFound = useIdxAfterIfNotFound || false;
        var subIdxNotFound = useIdxAfterIfNotFound?0:1;

        if (label==null) return label;

        var idx=0;
        for (var i=0, lenI=env.completeStructData.length; i<lenI; i++) {
            var grpCmp = env.grpCmpFunction(label.group, env.completeStructData[i].group);
            if (grpCmp<0) break;
            if (grpCmp==0 && label.group==env.completeStructData[i].group) {
                for (var j=0, lenJ=env.completeStructData[i].lines.length; j<lenJ; j++) {
                    var cmpRes = env.labelCmpFunction(label.label, env.completeStructData[i].lines[j]);
                    if (cmpRes<0) {
                        return idx+j-subIdxNotFound;
                    }
                    if (cmpRes==0 && label.label==env.completeStructData[i].lines[j]) {
                        return idx+j;
                    }
                }
                return idx+env.completeStructData[i].lines.length-subIdxNotFound;
            }
            idx+=env.completeStructData[i].lines.length;
        }
        return idx-subIdxNotFound;
    }

    function alphaNumCmp(a,b){
        var alist = a.split(/(\d+)/),
            blist = b.split(/(\d+)/);

        (alist.length && alist[alist.length-1] == '') ? alist.pop() : null; // remove the last element if empty
        (blist.length && blist[blist.length-1] == '') ? blist.pop() : null; // remove the last element if empty

        for (var i = 0, len = Math.max(alist.length, blist.length); i < len;i++){
            if (alist.length==i || blist.length==i) { // Out of bounds for one of the sides
                return alist.length - blist.length;
            }
            if (alist[i] != blist[i]){ // find the first non-equal part
               if (alist[i].match(/\d/)) // if numeric
               {
                  return (+alist[i])-(+blist[i]); // compare as number
               } else {
                  return (alist[i].toLowerCase() > blist[i].toLowerCase())?1:-1; // compare as string
               }
            }
        }
        return 0;
    }

    // Exposed functions

    chart.width = function(_) {
        if (!arguments.length) { return env.width }
        env.width = _;
        return chart;
    };

    chart.leftMargin = function(_) {
        if (!arguments.length) { return env.margin.left }
            env.margin.left = _;
        return chart;
    };

    chart.rightMargin = function(_) {
        if (!arguments.length) { return env.margin.right }
            env.margin.right = _;
        return chart;
    };

    chart.topMargin = function(_) {
        if (!arguments.length) { return env.margin.top }
            env.margin.top = _;
        return chart;
    };

    chart.bottomMargin = function(_) {
        if (!arguments.length) { return env.margin.bottom }
            env.margin.bottom = _;
        return chart;
    };

    chart.maxHeight = function(_) {
        if (!arguments.length) { return env.maxHeight; }
        env.maxHeight = _;
        return chart;
    };

    chart.throbberImg = function(_) {
        if (!arguments.length) { return env.throbberImg; }
        env.throbberImg = _;
        return chart;
    };

    chart.dataDomain = function(_) {
        if (!arguments.length) {
            return [env.valScale.domain()[0], env.valScale.domain()[env.valScale.domain.length-1]]
        }

        var midVal = _[0] + (_[1]-_[0])/2;
        env.valScale.domain([_[0], midVal, _[1]]);

        return chart;
    };

    chart.dataScale = function(_) {
        if (!arguments.length) { return env.valScale; }
        env.valScale = _;
        return chart;
    };

    chart.getNLines = function() {
        return env.nLines;
    };

    chart.getTotalNLines = function() {
        return env.totalNLines;
    };

    chart.zoomX = function(_, redraw) {
        if (!arguments.length) { return env.zoomX; }
        env.zoomX = _;
        if (env.svg)
            env.svg.dispatch('zoom', { detail: {
                zoomX: _,
                zoomY: null,
                redraw: redraw
            }});
        return chart;
    };

    chart.zoomY = function(_, redraw) {
        if (!arguments.length) { return env.zoomY; }
        env.zoomY = _;
        if (env.svg)
            env.svg.dispatch('zoom', { detail: {
                zoomX: null,
                zoomY: _,
                redraw: redraw
            }});
        return chart;
    };

    chart.zoomYLabels = function(_, redraw) {
        if (!arguments.length) { return [y2Label(env.zoomY[0]), y2Label(env.zoomY[1])]; }
        return chart.zoomY([label2Y(_[0], true), label2Y(_[1], false)], redraw);
    };

    chart.getVisibleStructure = function() {
        return env.structData;
    };

    chart.minSegmentDuration = function (_) {
        if (!arguments.length) { return env.minSegmentDuration; }
        env.minSegmentDuration = _;
        return chart;
    };

    chart.zDataLabel = function (_) {
        if (!arguments.length) { return env.zDataLabel; }
            env.zDataLabel = _;
        return chart;
    };

    chart.zScaleLabel = function (_) {
        if (!arguments.length) { return env.zScaleLabel; }
            env.zScaleLabel = _;
        return chart;
    };

    chart.sort = function(labelCmpFunction, grpCmpFunction) {

        if (labelCmpFunction==null) { labelCmpFunction = env.labelCmpFunction }
        if (grpCmpFunction==null) { grpCmpFunction = env.grpCmpFunction }

        env.labelCmpFunction = labelCmpFunction;
        env.grpCmpFunction = grpCmpFunction;

        env.completeStructData.sort(function(a, b) {
            return grpCmpFunction(a.group, b.group);
        });

        for (var i=0, len=env.completeStructData.length;i<len;i++) {
            env.completeStructData[i].lines.sort(labelCmpFunction);
        }

        draw();

        return chart;
    };

    chart.sortAlpha = function(asc) {
        if (asc==null) { asc=true }
        var alphaCmp = function (a, b) { return alphaNumCmp(asc?a:b, asc?b:a); };
        chart.sort(alphaCmp, alphaCmp);

        return chart;
    };

    chart.sortChrono = function(asc) {
        if (asc==null) { asc=true }

        function buildIdx(accessFunction) {
            var idx = {};
            for (var i= 0, len=env.completeFlatData.length; i<len; i++ ) {
                var key = accessFunction(env.completeFlatData[i]);
                if (idx.hasOwnProperty(key)) { continue; }

                var itmList = env.completeFlatData.filter(function(d) { return key == accessFunction(d); });
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

        chart.sort(lblCmp, grpCmp);

        return chart;
    };

    chart.replaceData =function(newData, keepGraphStructure) {
        keepGraphStructure = keepGraphStructure || false;
        drawNewData(newData, keepGraphStructure);
        return chart;
    };

    // True/False
    chart.enableOverview = function(_) {
        if (!arguments.length) { return env.enableOverview; }
        env.enableOverview = _;
        return chart;
    };

    chart.overviewDomain = function(_) {
        if (!env.enableOverview) { return null; }

        if (!arguments.length) { return env.overviewArea.domainRange; }
        env.overviewArea.update(_, env.overviewArea.currentSelection);
        return chart;
    };

    // True/False
    chart.animationsEnabled = function(_) {
        if (!arguments.length) { return (env.transDuration !=0); }
        env.transDuration = (_?700:0);
        return chart;
    };

    // True/false (true = shows throbber and leaves it on permanently. false = automatic internal management)
    chart.forceThrobber = function(_) {
        if (!arguments.length) { return env.forceThrobber; }
        env.forceThrobber=_;

        if (env.forceThrobber && env.throbber) {
            env.throbber.show();
        }
        return chart;
    };

    chart.axisClickURL = function(_) {
        if (!arguments.length) { return env.axisClickURL; }
        env.axisClickURL = _;
        return chart;
    };

    chart.getSvg = function() {
        return d3.select(env.svg.node().parentNode).html();
    };

    chart.onZoom = function(_) {
        if (!arguments.length) { return env.onZoom; }
        env.onZoom = _;
        return chart;
    };

    chart.refresh = function() {
        draw();
        return chart;
    };

    return chart;
}