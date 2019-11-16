Timelines Chart
==============

[![NPM package][npm-img]][npm-url]
[![Build Size][build-size-img]][build-size-url]
[![Dependencies][dependencies-img]][dependencies-url]

<p align="center">
     <a href="http://bl.ocks.org/vasturiano/ded69192b8269a78d2d97e24211e64e0"><img width="80%" src="http://gist.github.com/vasturiano/ded69192b8269a78d2d97e24211e64e0/raw/preview.png"></a>
</p>

A parallel timelines layout (swimlanes) for representing state of time-series over time. 
Each timeline segment can be assigned a value on a color scale, either continuous (heatmap mode) or ordinal (for categorical representation).
Time-series can be grouped into logical groups, represented as distinct sections. Allows for exploration using drag-to-zoom or a timeline brush.

Check out the examples:
* [Categorical](http://vasturiano.github.io/timelines-chart/example/categorical/)
* [Continuous (Heatmap)](http://vasturiano.github.io/timelines-chart/example/heatmap/)
* [Custom Time Format](http://vasturiano.github.io/timelines-chart/example/custom-time-format/)

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
| <b>maxLineHeight</b>([<i>number</i>]) | Getter/setter for the maximum height of each line, in px. | 12 |
| <b>leftMargin</b>([<i>number</i>]) | Getter/setter for the chart's left margin, which contains the left-side group axis labels. | 90 |
| <b>rightMargin</b>([<i>number</i>]) | Getter/setter for the chart's right margin, which contains the right-side series axis labels. | 100 |
| <b>topMargin</b>([<i>number</i>]) | Getter/setter for the chart's top margin, which contains the color legend. | 26 |
| <b>bottomMargin</b>([<i>number</i>]) | Getter/setter for the chart's bottom margin, which contains the time axis labels. | 30 |
| <b>useUtc</b>([<i>boolean</i>]) | Getter/setter for whether to display time in the local time zone (`false`) or in UTC (`true`). | false |
| <b>timeFormat</b>([<i>string</i>]) | Getter/setter for the time format to use in tooltips. See [d3-time-format](https://github.com/d3/d3-time-format#locale_format) for available options. | `%Y-%m-%d %-I:%M:%S %p` |
| <b>xTickFormat</b>([<i>function</i>]) | X axis tick label formatter function, as pass-through to [d3-axis](https://github.com/d3/d3-axis#axis_tickFormat). By default, it uses a [multi-scale time format](https://bl.ocks.org/mbostock/4149176). | |
| <b>dateMarker</b>([<i>date object</i>]) | Getter/setter for the date marker to show as a vertical line. If a falsy value is used, no marker is shown. | `null` |
| <b>minSegmentDuration</b>([<i>number</i>]) | Getter/setter for the minimum time duration (in msecs) of a segment in order for it to be shown. | 0 |
| <b>getNLines</b>() | Returns number of timelines currently visible in the chart. | - |
| <b>getTotalNLines</b>() | Returns total number of timelines in the chart. | - |
| <b>zQualitative</b>([<i>boolean</i>]) | Getter/setter for whether the segment data color values are categorical (true) or quantitative (false). This will affect how the color legend is presented, and changing it will automatically toggle the `zColorScale` between defaults. | false |
| <b>zColorScale</b>([<i>d3 scale object</i>]) | Getter/setter for the color scale to be used for coloring the segments according to their data values. This object should be a D3 color scale object. | qualitative: `d3.scaleOrdinal(<color-list>)` <br> quantitative: `d3.scaleSequential(<color-interpolator>)` |
| <b>zDataLabel</b>([<i>string</i>]) | Getter/setter for the units of z data. Used in the tooltip descriptions. | |
| <b>zScaleLabel</b>([<i>string</i>]) | Getter/setter for the color scale label. Only applicable to quantitative z scales. | |
| <b>sort</b>([<i>[function, function]</i>]) | Sorts the timelines and groups according to two name comparison functions: `function(labelCmpFn, groupCompFn)`. Each comparison function should follow the signature `function(nameA, nameB)` and return a numeric value. | `(<alpha-numeric-cmp>, <alpha-numeric-cmp>)` |
| <b>sortAlpha</b>([<i>[boolean]</i>]) | Sorts the timelines and groups in alpha-numeric order. The boolean parameter indicates whether the order should be ascending (`true`) or descending (`false`). | true |
| <b>sortChrono</b>([<i>[boolean]</i>]) | Sorts the timelines and groups in chronological order of their most recent data point. The boolean parameter indicates whether the order should be ascending (`true`) or descending (`false`). | true |
| <b>zoomX</b>([<i>[startDate, endDate]</i>]) | Getter/setter for the chart's time (horizontal) zoom. A null value indicates a zoom reset to full extent.  | `null` |
| <b>zoomY</b>([<i>[number, number]</i>]) | Getter/setter for the chart's vertical zoom. The parameter should follow the syntax `[<start row index>, <end row index>]`. A null value indicates a zoom reset to full extent.  | `null` |
| <b>zoomYLabels</b>([<i>[number, number]</i>]) | Getter/setter for the chart's vertical zoom in terms of timeline labels. The parameter should follow the syntax `[<start label>, <end label>]`. A null value indicates a zoom reset to full extent.  | `null` |
| <b>onZoom</b>([<i>function</i>]) | Getter/setter for the callback function for user initiated zoom (incl. zoom resets). Callback will have two parameters: `onZoom([startDate, endDate], [startY, endY])`. | `null` |
| <b>enableOverview</b>([<i>boolean</i>]) | Getter/setter for whether to show an interactive timeline overview below the chart. | true |
| <b>overviewDomain</b>([<i>[startDate, endDate]</i>]) | Getter/setter for the time extent shown in the overview section below the chart. | *&lt;auto-derived from data: `[minTs, maxTs]`&gt;* |
| <b>getVisibleStructure</b>() | Returns data representation of timelines currently visible in the chart. | - |
| <b>getSvg</b>() | Returns graphic (SVG) representation of currently visible chart. | - |
| <b>enableAnimations</b>([<i>boolean</i>]) | Getter/setter for whether to animate transitions. | true |
| <b>onLabelClick</b>([<i>function</i>]) | Getter/setter for the callback function for clicking on the Y axis labels. Callback will include the clicked label (if applicable) and group parameter: `onLabelClick(<string>, <string>)`. | `null` |
| <b>onSegmentClick</b>([<i>function</i>]) | Getter/setter for the callback function for clicking on a segment. Callback will return a segment object: `onSegmentClick(segment)`. | `null` |
| <b>refresh</b>() | Rerenders chart. | - |

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

## Giving Back

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url) If this project has helped you and you'd like to contribute back, you can always [buy me a ☕](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url)!

[npm-img]: https://img.shields.io/npm/v/timelines-chart.svg
[npm-url]: https://npmjs.org/package/timelines-chart
[build-size-img]: https://img.shields.io/bundlephobia/minzip/timelines-chart.svg
[build-size-url]: https://bundlephobia.com/result?p=timelines-chart
[dependencies-img]: https://img.shields.io/david/vasturiano/timelines-chart.svg
[dependencies-url]: https://david-dm.org/vasturiano/timelines-chart
