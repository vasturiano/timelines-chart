function checkFirstTimelineHasEvents(rawData) {
  return Boolean(Array.isArray(rawData) && // Validate has populated group(s)
    rawData.length &&
    // Validate 0th group has populated data
    'data' in rawData[0] &&
    Array.isArray(rawData[0].data) &&
    rawData[0].data.length &&
    // Validate 0th group's 0th timeline has populated events
    'data' in rawData[0].data[0] &&
    Array.isArray(rawData[0].data[0].data) &&
    rawData[0].data[0].data.length &&
    // Validate 0th group's 0th timeline 0th event has a populated timeRange
    'timeRange' in rawData[0].data[0].data[0] &&
    Array.isArray(rawData[0].data[0].data[0].timeRange) &&
    rawData[0].data[0].data[0].timeRange.length)
}

export { checkFirstTimelineHasEvents };
