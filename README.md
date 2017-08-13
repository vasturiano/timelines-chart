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
npm install
npm run build
```
open ```local/index.html``` in the browser.

### How to instantiate

```
import { default as TimelinesChart } from 'timelines-chart';
```
or
```
var TimelinesChart = require('timelines-chart');
```
or even
```
<script src="/path/to/dist/timelines-chart.js"></script>
```
then
```
var myChart = TimelinesChart();
myChart
    .data(<myData>)
    (<myDOMElement>);
```

## API reference

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
