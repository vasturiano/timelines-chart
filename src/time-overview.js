/**
 * Based on http://bl.ocks.org/mbostock/6232620
 */


export default function(options, callback, context){
    var timeMapper, timeTicker, brusherBucketLevelsMinutes, timeGrid, margins, width, hideIfLessThanSeconds,
        height, brush, xAxis, svg, groupOverview, timeUnitGrid, $this, margins, dom, labels, verticalLabels,
        format;

    $this = this;
    margins = options.margins;
    brusherBucketLevelsMinutes = options.granularityLevels;
    hideIfLessThanSeconds = options.hideIfLessThanSeconds;
    verticalLabels = (options.verticalLabels != null) ? options.verticalLabels : true;
    format = options.format || d3.time.format("%Y-%m-%d");

     this.init = function(domElement, domainRange, currentSelection){
        dom = domElement;

        if (domainRange && currentSelection){
            this.render(domainRange, currentSelection);
        }
    };


    this._afterInteraction = function(){
        if (!d3.event.sourceEvent) return;
        var extent0, selectionPoints, boundedLeft, boundedRight, selectionPointsRounded, magneticEffect;

        extent0 = brush.extent();

        boundedLeft = false;
        boundedRight = false;
        magneticEffect = 10 * 60 * 60 * 1000;

        // Magnetic effect
        selectionPoints = extent0;
        selectionPointsRounded = extent0.map(timeUnitGrid.round);

        if (selectionPoints[0].getTime() <= $this.domainRange[0].getTime() + magneticEffect){
            selectionPoints[0] = $this.domainRange[0];
            boundedLeft = true;
        }

        if (selectionPoints[1].getTime()  >= $this.domainRange[1].getTime() - magneticEffect){
            selectionPoints[1] = $this.domainRange[1];
            boundedRight = true;
        }

        if (boundedLeft && !boundedRight){
            selectionPoints[1] = selectionPointsRounded[1];
        }else if (!boundedLeft && boundedRight){
            selectionPoints[0] = selectionPointsRounded[0];
        }else if (!boundedLeft && !boundedRight){
            selectionPoints[0] = selectionPointsRounded[0];
            selectionPoints[1] = selectionPointsRounded[1];
        }


        if (selectionPoints[0] >= selectionPoints[1]) {
            selectionPoints[0] = timeUnitGrid.floor(extent0[0]);
            selectionPoints[1] = timeUnitGrid.ceil(extent0[1]);
        }


        // Apply magnetic feedback
        d3.select(this).transition()
            .call(brush.extent(selectionPoints));

        callback.call(context, selectionPoints[0], selectionPoints[1]);
    };

    this._duringInteraction = function(){
        if (!d3.event.sourceEvent) return;
        var extent0, selectionPoints;

        extent0 = brush.extent();

        // Magnetic effect
        selectionPoints = extent0.map(timeUnitGrid.round);
        if (selectionPoints[0] >= selectionPoints[1]) {
            selectionPoints[0] = timeUnitGrid.floor(extent0[0]);
            selectionPoints[1] = timeUnitGrid.ceil(extent0[1]);
        }

        // Apply magnetic feedback
        d3.select(this).transition()
            .call(brush.extent(selectionPoints));
    };


    this.render = function(domainRange, currentSelection){
        var timeWindow;

        this.domainRange = domainRange;
        this.currentSelection = currentSelection;

        timeWindow = domainRange[1] - domainRange[0];

        if (timeWindow < hideIfLessThanSeconds * 1000){
            return false;
        }

        if (timeWindow < (brusherBucketLevelsMinutes.day * 60 * 1000)){
            timeMapper = d3.time.day;
            timeTicker = d3.time.days;
            timeGrid = d3.time.hours;
            timeUnitGrid = d3.time.hour;
        }else if (timeWindow < (brusherBucketLevelsMinutes.week * 60 * 1000)){
            timeMapper = d3.time.week;
            timeTicker = d3.time.weeks;
            timeGrid = d3.time.days;
            timeUnitGrid = d3.time.day;
        }else if (timeWindow < (brusherBucketLevelsMinutes.month * 60 * 1000)){
            timeMapper = d3.time.month;
            timeTicker = d3.time.months;
            timeGrid = d3.time.weeks;
            timeUnitGrid = d3.time.week;
        }else{
            timeMapper = d3.time.year;
            timeTicker = d3.time.years;
            timeGrid = d3.time.months;
            timeUnitGrid = d3.time.month;
        }


        width = options.width;
        height = options.height - margins.top - margins.bottom;

        xAxis = d3
            .time
            .scale
            .utc()
            .domain(domainRange)
            .range([0, width]);

        brush = d3.svg.brush()
            .x(xAxis)
            .extent(currentSelection)
            //.on("brush", brushing)
            .on("brushend", $this._afterInteraction);

        svg = d3.select(dom)
            .append("svg")
            .attr("class", "brusher")
            .attr("width", width + margins.left + margins.right)
            .attr("height", height + margins.top + margins.bottom)
            .append("g")
            .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

        svg.append("rect")
            .attr("class", "grid-background")
            .attr("width", width)
            .attr("height", height);

        svg.append("g")
            .attr("class", "x grid")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.svg.axis()
                .scale(xAxis)
                .orient("bottom")
                .ticks(timeGrid)
                .tickSize(-height)
                .tickFormat(""))
            .selectAll(".tick")
            .classed("minor", function(d) { return d.getHours(); });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.svg.axis()
                .scale(xAxis)
                .orient("bottom")
                .ticks(timeTicker)
                .tickFormat(format)
                .tickPadding(0))
            .selectAll("text")
            .attr("x", 6)
            .style("text-anchor", null);

        groupOverview = svg.append("g")
            .attr("class", "brush")
            .call(brush);

        groupOverview.selectAll("rect")
            .attr("height", height);

        labels = svg.selectAll("text")
            .style("text-anchor", "end");

        if (verticalLabels){
            labels
                .attr("dx", "-1.2em")
                .attr("dy", ".15em")
                .attr('transform', 'rotate(-65)');
        }

        return true;
    };

    this.update = function(domainRange, currentSelection){

        if (this.domainRange == domainRange){
            return this.updateSelection(currentSelection);
        }else{
            d3.select(dom)
                .select(".brusher")
                .remove();

            return this.render(domainRange, currentSelection);
        }
    };

    this.updateSelection = function(currentSelection){

        if (this.currentSelection != currentSelection){
            groupOverview
                .call(brush.extent(currentSelection));
            return true;
        }
        return false;
    };
};