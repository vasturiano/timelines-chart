export interface Group {
  group: string;
  data: Line[];
}

export interface Line {
  label: string;
  data: Segment[];
}

export interface Segment {
  timeRange: [TS, TS];
  val: Val;
}

export type TS = Date | number;

export type Val = number | string; // qualitative vs quantitative

type GroupLabel = {
  group: string;
  label:string;
}

type Range<DomainType> = [DomainType, DomainType];

type Formatter<ItemType> = (item: ItemType) => string;
type CompareFn<ItemType> = (a: ItemType, b: ItemType) => number;

type Scale<DomainType, RangeType> = (input: DomainType) => RangeType;

declare class TimelinesChart {
  constructor(element: HTMLElement);

  width(): number;
  width(width: number): TimelinesChart;
  maxHeight(): number;
  maxHeight(height: number): TimelinesChart;
  maxLineHeight(): number;
  maxLineHeight(height: number): TimelinesChart;
  leftMargin(): number;
  leftMargin(margin: number): TimelinesChart;
  rightMargin(): number;
  rightMargin(margin: number): TimelinesChart;
  topMargin(): number;
  topMargin(margin: number): TimelinesChart;
  bottomMargin(): number;
  bottomMargin(margin: number): TimelinesChart;

  data(): Group[];
  data(data: Group[]): TimelinesChart;

  useUtc(): boolean;
  useUtc(utc: boolean): TimelinesChart;
  timeFormat(): string;
  timeFormat(format: string): TimelinesChart;
  xTickFormat(): Formatter<Date> | null;
  xTickFormat(formatter: Formatter<Date> | null): TimelinesChart;
  dateMarker(): TS | null | boolean;
  dateMarker(date: TS | null | boolean): TimelinesChart;
  minSegmentDuration(): number;
  minSegmentDuration(duration: number): TimelinesChart;
  minSegmentWidth(): number;
  minSegmentWidth(width: number): TimelinesChart;

  getNLines(): number;
  getTotalNLines(): number;

  zQualitative(): boolean;
  zQualitative(isQualitative: boolean): TimelinesChart;
  zColorScale(): Scale<Val, string>;
  zColorScale(scale: Scale<Val, string>): TimelinesChart;
  zDataLabel(): string;
  zDataLabel(text: string): TimelinesChart;
  zScaleLabel(): string;
  zScaleLabel(text: string): TimelinesChart;

  sort(labelcmpFn: CompareFn<string>, grpcmpFn: CompareFn<string>): TimelinesChart;
  sortAlpha(ascending: boolean): TimelinesChart;
  sortChrono(ascending: boolean): TimelinesChart;
  zoomX(): Range<TS | null> | null;
  zoomX(xRange: Range<TS | null> | null): TimelinesChart;
  zoomY(): Range<number | null> | null;
  zoomY(yRange: Range<number | null> | null): TimelinesChart;
  zoomYLabels(): Range<GroupLabel | null> | null;
  zoomYLabels(yLabelRange: Range<GroupLabel | null> | null): TimelinesChart;
  onZoom(cb: (zoomX: Range<TS | null> | null, zoomY: Range<number | null> | null) => void): TimelinesChart;

  enableOverview(): boolean;
  enableOverview(enable: boolean): TimelinesChart;
  overviewDomain(): Range<TS | null>;
  overviewDomain(xRange: Range<TS | null>): TimelinesChart;

  getVisibleStructure(): Group[];
  getSvg(): string;

  enableAnimations(): boolean;
  enableAnimations(animations: boolean): TimelinesChart;

  onLabelClick(cb: (label: string, group: string) => void): TimelinesChart;
  onSegmentClick(cb: (segment: {
    group: string,
    label: string,
    val: Val,
    timeRange: Range<TS>
  }) => void): TimelinesChart;

  segmentTooltipContent(cb: (segment: {
    group: string,
    label: string,
    val: Val,
    timeRange: Range<TS>
  }) => string): TimelinesChart;

  refresh(): TimelinesChart;
}

export default TimelinesChart;
