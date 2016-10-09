/**
 * Based on http://bl.ocks.org/mbostock/6232620
 */

import * as d3 from 'd3';

export default function(options, callback, context){
    var margins, width, hideIfLessThanSeconds,
        height, brush, xAxis, svg, groupOverview, $this, dom, labels, verticalLabels, format;

    $this = this;
    margins = options.margins;
    hideIfLessThanSeconds = options.hideIfLessThanSeconds;
    verticalLabels = (options.verticalLabels != null) ? options.verticalLabels : true;
    format = options.format;

     this.init = function(domElement, domainRange, currentSelection){
        dom = domElement;

        if (domainRange && currentSelection){
            this.render(domainRange, currentSelection);
        }
    };


    this._afterInteraction = function(){

        if (!d3.event.sourceEvent
            || !d3.event.sourceEvent.srcElement
            || !d3.select(d3.event.sourceEvent.srcElement).classed('overlay')
        ) {
            // Don't callback for events not initiated by the brusher
            return;
        }

        var selection = d3.event.selection.map(xAxis.invert);
        callback.call(context, selection[0], selection[1]);
    };

    this.render = function(domainRange, currentSelection){
        var timeWindow;

        this.domainRange = domainRange;
        this.currentSelection = currentSelection;

        timeWindow = domainRange[1] - domainRange[0];

        if (timeWindow < hideIfLessThanSeconds * 1000){
            return false;
        }

        width = options.width;
        height = options.height - margins.top - margins.bottom;

        xAxis = d3
            .scaleUtc()
            .domain(domainRange)
            .range([0, width]);

        brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on("end", $this._afterInteraction);

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
            .call(d3.axisBottom()
                .scale(xAxis)
                .tickSize(-height)
                .tickFormat("")
            )
            .selectAll(".tick")
            .classed("minor", function(d) { return d.getHours(); });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom()
                .scale(xAxis)
                .tickFormat(format)
                .tickPadding(0)
            )
            .selectAll("text")
            .attr("x", 6)
            .style("text-anchor", null);

        groupOverview = svg.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, currentSelection.map(xAxis));

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
        if (this.currentSelection !== currentSelection){
            groupOverview
                .call(brush.move, currentSelection.map(xAxis));
            return true;
        }
        return false;
    };
};