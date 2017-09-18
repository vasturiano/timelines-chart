# Timelines Chart

<p align="center">
     <a href="http://bl.ocks.org/vasturiano/ded69192b8269a78d2d97e24211e64e0"><img width="80%" src="http://gist.github.com/vasturiano/ded69192b8269a78d2d97e24211e64e0/raw/preview.png"></a>
</p>

A parallel timelines layout (swimlanes) for representing state of time-series over time. 
Each timeline segment can be assigned a value on a color scale, either continuous (heatmap mode) or ordinal (for categorical representation).
Time-series can be grouped into logical groups, represented as distinct sections. Allows for exploration using drag-to-zoom or a timeline brush.
Current example (index.html in example folder) populated with randomly generated data.

Live example: http://bl.ocks.org/vasturiano/ded69192b8269a78d2d97e24211e64e0

[![NPM](https://nodei.co/npm/timelines-chart.png?compact=true)](https://nodei.co/npm/timelines-chart/)

## Quick start

```
import TimelinesChart from 'timelines-chart';
```
or
```
TimelinesChart = require('timelines-chart');
```
or even
```
<script src="//unpkg.com/timelines-chart"></script>
```
then
```
const myChart = TimelinesChart();
myChart
    .data(<myData>)
    (<myDOMElement>);
```

## API reference

| Method | Description | Default |
| --- | --- | --- |
| <b>data</b>([<i>array</i>]) | Getter/setter for chart data (see below for syntax details). | `[]` |
| <b>width</b>([<i>number</i>]) | Getter/setter for the chart width in px. | *&lt;window width&gt;* |
| <b>maxHeight</b>([<i>number</i>]) | Getter/setter for the chart's maximum height in px. | 640 |
| <b>leftMargin</b>([<i>number</i>]) | Getter/setter for the chart's left margin, which contains the left-side group axis labels. | 90 |
| <b>rightMargin</b>([<i>number</i>]) | Getter/setter for the chart's right margin, which contains the right-side series axis labels. | 100 |
| <b>topMargin</b>([<i>number</i>]) | Getter/setter for the chart's top margin, which contains the color legend. | 26 |
| <b>bottomMargin</b>([<i>number</i>]) | Getter/setter for the chart's bottom margin, which contains the time axis labels. | 30 |
| <b>zoomX</b>([<i>[startDate, endDate]</i>]) | Getter/setter for the chart's time (horizontal) zoom. A null value indicates a zoom reset to full extent.  | `null` |
| <b>zoomY</b>([<i>[number, number]</i>]) | Getter/setter for the chart's vertical zoom in px. The parameter should follow the syntax `[<start row index>, <end row index>]`. A null value indicates a zoom reset to full extent.  | `null` |
| <b>minSegmentDuration</b>([<i>number</i>]) | Getter/setter for the minimum time duration (in msecs) of a segment in order for it to be rendered. | 0 |
| <b>zQualitative</b>([<i>boolean</i>]) | Getter/setter for whether the segment data color values are categorical (false) or quantitative (true). This will affect how the color legend is presented, and changing it will automatically toggle the `zColorScale` between defaults. | false |
| <b>zColorScale</b>([<i>d3 scale object</i>]) | Getter/setter for the color scale to be used for coloring the segments according to their data values. This object should be a D3 color scale object. | qualitative: `d3.scaleOrdinal([...d3.schemeCategory10, ...d3.schemeCategory20b])`, quantitative: `d3.scaleSequential(d3chroma.interpolateRdYlBu)` |
| <b>zDataLabel</b>([<i>string</i>]) | Getter/setter for the units of z data. Used in the tooltip descriptions. | |
| <b>zScaleLabel</b>([<i>string</i>]) | Getter/setter for the color scale label. Only applicable to quantitative z scales. | |
| <b>enableOverview</b>([<i>boolean</i>]) | Getter/setter for whether to show an interactive timeline overview below the chart. | true |
| <b>enableAnimations</b>([<i>boolean</i>]) | Getter/setter for whether to animate transitions. | true |


```
TimelinesChart()
     .data(<data>)
     .width(<px>)
     .leftMargin(<px>)
     .rightMargin(<px>)
     .topMargin(<px>)
     .bottomMargin(<px>)
     .maxHeight(<px>)
     .getNLines()
     .getTotalNLines()
     .zoomX([<start date>, <end date>], <force redraw (boolean). default: true>)
     .zoomY([<start row index>, <end row index>], <force redraw (boolean). default: true>)
     .zoomYLabels([<(start) {group,label}>, <(end) {group,label}>], <force redraw (boolean). default: true>)
     .getVisibleStructure()
     .minSegmentDuration(<msecs>)
     .zDataLabel(<unit text on tooltips>)
     .zScaleLabel(<legend unit text>)
     .sort(<label compare function>, <group compare function>)
     .sortAlpha(<ascending (boolean)>)
     .sortChrono(<ascending (boolean)>)
     .enableOverview(<boolean>)
     .overviewDomain(<new time range for overview: [<start date>, <end date>]>)
     .animationsEnabled(<(boolean)>)
     .axisClickURL(<URL to follow when clicking on Y axises>)
     .getSvg()
     .onZoom(<callback function for user initiated zoom>)
```
## Data syntax

```
[
  {
    group: "group1name",
    data: [
      {
        label: "label1name",
        data: [
          {
            timeRange: [<date>, <date>],
            val: <val: number (continuous dataScale) or string (ordinal dataScale)> 
          },
          {
            timeRange: [<date>, <date>],
            val: <val>
          },
          (...)
        ]
      },
      {
        label: "label2name",
        data: [...]
      },
      (...)
    ],
  },
  {
    group: "group2name",
    data: [...]
  },
  (...)
]
```
