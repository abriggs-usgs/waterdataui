// functions to facilitate legend creation for a d3 plot
const { createSelector } = require('reselect');
const { defineLineMarker, defineCircleMarker, defineRectangleMarker, rectangleMarker } = require('./markers');
const { CIRCLE_RADIUS } = require('./layout');


/**
 * Create a simple horizontal legend
 *
 * @param svg
 * @param legendMarkers
 * @param width
 * @param startingXPosition
 * @param markerYPosition
 * @param textYPosition
 * @param markerGroupOffset
 * @param markerTextOffset
 */
function drawSimpleLegend(svg,
                          legendMarkers,
                          width=null,
                          startingXPosition=0,
                          markerYPosition=-4,
                          textYPosition=0,
                          markerGroupOffset=40,
                          markerTextOffset=10) {
    const verticalRowOffset = 20;
    const svgWidth = width ? width : svgBBox.width;
    let rowCounter = 0;

    let legend = svg
        .append('g')
        .attr('class', 'legend');

    let svgBBox = svg.node().getBBox();
    let previousMarkerGroup;

    for (let legendMarker of legendMarkers) {
        let xPosition;
        let previousMarkerGroupBox;
        let detachedMarker;
        if (previousMarkerGroup == null) {
            xPosition = startingXPosition;
        }
        else {
            previousMarkerGroupBox = previousMarkerGroup.node().getBBox();
            xPosition = previousMarkerGroupBox.x + previousMarkerGroupBox.width + markerGroupOffset;
        }
        let legendGroup = legend.append('g')
            .attr('class', 'legend-marker');
        if (legendMarker.groupId) {
            legendGroup.attr('id', legendMarker.groupId);
        }
        let markerType = legendMarker.type;
        let yPosition;
        if (markerType === rectangleMarker) {
            yPosition = markerYPosition * 2.5 + verticalRowOffset * rowCounter;
        }
        else {
            yPosition = markerYPosition + verticalRowOffset * rowCounter
        }
        let markerArgs = {
            r: legendMarker.r ? legendMarker.r : null,
            x: xPosition,
            y: yPosition,
            width: 20,
            height: 10,
            length: 20,
            domId: legendMarker.domId,
            domClass: legendMarker.domClass,
            fill: legendMarker.fill
        };
        // add the marker to the svg
        detachedMarker = markerType(markerArgs);
        legendGroup.node().appendChild(detachedMarker.node());
        // add text for the legend marker
        let detachedMarkerBBox = detachedMarker.node().getBBox();
        legendGroup.append('text')
            .attr('x', detachedMarkerBBox.x + detachedMarkerBBox.width + markerTextOffset)
            .attr('y', textYPosition + verticalRowOffset * rowCounter)
            .text(legendMarker.text);
        let legendGroupBBox = legendGroup.node().getBBox();
        let legendGroupRightXCoordinate = legendGroupBBox.x + legendGroupBBox.width;
        if (legendGroupRightXCoordinate/svgWidth >= 0.60) {
            rowCounter += 1;
            previousMarkerGroup = null;
        }
        else {
            previousMarkerGroup = legendGroup;
        }
    }
    // center the legend group in the svg
    let legendBBox = legend.node().getBBox();
    const legendXPosition = (svgWidth - legendBBox.width) / 2;

    legend.attr('transform', `translate(${legendXPosition}, ${svgBBox.height-60})`);
}

/**
 * create elements for the legend in the svg
 *
 * @param dataPlotElements
 * @param lineSegments
 */
const createLegendMarkers = function(dataPlotElements, lineSegments) {
    let text;
    let marker;
    let legendMarkers = [];
    for (let dataItem of dataPlotElements.dataItems) {
        if (dataItem === 'compare' || dataItem === 'current') {
            text = 'Current Year';
            let domId = `ts-${dataItem}`;
            let svgGroup = `${dataItem}-line-marker`;
            if (dataItem === 'compare') {
                text = 'Last Year';
            }
            marker = defineLineMarker(domId, 'line', text, svgGroup);
        }
        else if (dataItem === 'medianStatistics') {
            text = 'Median Discharge';
            let beginYear = dataPlotElements.metadata.statistics.beginYear;
            let endYear = dataPlotElements.metadata.statistics.endYear;
            if (beginYear && endYear) {
                text = `${text} ${beginYear} - ${endYear}`;
            }
            marker = defineCircleMarker(CIRCLE_RADIUS, null, 'median-data-series', text, 'median-circle-marker');
        }
        else {
            marker = null;
        }
        if (marker) {
            legendMarkers.push(marker);
        }
    }
    // create markers for hashes
    let currentHashMarker = defineRectangleMarker(null, 'mask', 'Current TS Masks', null, 'url(#hash-45');
    let compareHashMarker = defineRectangleMarker(null, 'mask', 'Compare TS Masks', null, 'url(#hash-135');
    legendMarkers.push(currentHashMarker);
    legendMarkers.push(compareHashMarker);
    // create markers for data masks
    let masks = [];
    lineSegments.map(segment => masks.push(segment.classes.dataMask));
    let uniqueMasks = new Set(masks.filter(x => x !== null));
    for (let uniqueMask of uniqueMasks) {
        let maskLower = uniqueMask.toLowerCase();
        let maskClass = `${maskLower}-mask`;
        let maskText = maskLower.charAt(0).toUpperCase() + maskLower.slice(1);
        marker = defineRectangleMarker(null, maskClass, maskText, null);
        legendMarkers.push(marker);
    }
    return legendMarkers;
};

/**
 * Select attributes from the state useful for legend creation
 */
const legendDisplaySelector = createSelector(
    (state) => state.showSeries,
    (state) => state.statisticalMetaData,
    (showSeries, statisticalMetaData) => {
        let shownSeries = [];
        let dataPlotElements = {};
        let text;
        let marker;
        for (let key in showSeries) {
            if (showSeries.hasOwnProperty(key)) {
                if (showSeries[key]) {
                    shownSeries.push(key);
                }
            }
        }

        dataPlotElements.dataItems = shownSeries;
        dataPlotElements.metadata = {
            statistics: {
                beginYear: statisticalMetaData.beginYear ? statisticalMetaData.beginYear : undefined,
                endYear: statisticalMetaData.endYear ? statisticalMetaData.endYear : undefined
            }
        };
        return dataPlotElements;
    }
);


module.exports = {drawSimpleLegend, createLegendMarkers, legendDisplaySelector};
