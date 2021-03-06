import {line as d3Line, curveStepAfter} from 'd3-shape';
import {createStructuredSelector} from 'reselect';

import config from 'ui/config';
import {link} from 'ui/lib/d3-redux';
import {mediaQuery}  from 'ui/utils';

import {addSVGAccessibility} from 'd3render/accessibility';
import {appendAxes} from 'd3render/axes';
import {renderMaskDefs} from 'd3render/data-masks';
import {appendInfoTooltip} from 'd3render/info-tooltip';

import {isWaterwatchVisible} from 'ml/selectors/flood-data-selector';
import {getPrimaryParameter, getPrimaryMedianStatisticsData} from 'ml/selectors/hydrograph-data-selector';

import {getAxes}  from './selectors/axes';
import {getGroundwaterLevelPoints} from './selectors/discrete-data';
import {getFloodLevelData} from './selectors/flood-level-data';
import {getIVDataSegments, HASH_ID} from './selectors/iv-data';
import {getMainLayout} from './selectors/layout';
import {getMainXScale, getMainYScale} from './selectors/scales';
import {getTitle, getDescription, isVisible} from './selectors/time-series-data';

import {drawGroundwaterLevels} from './discrete-data';
import {drawFloodLevelLines} from './flood-level-lines';
import {drawDataSegments} from './time-series-lines';
import {drawTooltipFocus, drawTooltipText}  from './tooltip';

const addDefsPatterns = function(elem) {
    const patterns = [{
        patternId: HASH_ID.primary,
        patternTransform: 'rotate(45)'
    }, {
        patternId: HASH_ID.compare,
        patternTransform: 'rotate(135)'
    }];
    const defs = elem.append('defs');
    renderMaskDefs(defs, 'iv-graph-pattern-mask', patterns);
};

/**
 * Plots the median points for a single median time series.
 * @param  {Object} elem
 * @param  {Function} xscale
 * @param  {Function} yscale
 * @param  {Number} modulo
 * @param  {Array} points
 */
const drawMedianPoints = function(elem, {xscale, yscale, modulo, points}) {
    const stepFunction = d3Line()
        .curve(curveStepAfter)
        .x(function(d) {
            return xscale(d.dateTime);
        })
        .y(function(d) {
            return yscale(d.point);
        });
    const medianGrp = elem.append('g')
        .attr('class', 'median-stats-group');
    medianGrp.append('path')
        .datum(points)
        .classed('median-data-series', true)
        .classed('median-step', true)
        .classed(`median-step-${modulo}`, true)
        .attr('d', stepFunction);
};

/**
 * Plots the median points for all median time series for the current variable.
 * @param  {Object} elem
 * @param  {Boolean} visible
 * @param  {Function} xscale
 * @param  {Function} yscale
 * @param  {Array} seriesPoints
 * @param {Boolean} enableClip
 */
const drawAllMedianPoints = function(elem, {visible, xscale, yscale, seriesPoints, enableClip}) {
    elem.select('#median-points').remove();
    const container = elem
        .append('g')
            .attr('id', 'median-points');
    if (!visible || !seriesPoints) {
        return;
    }

    if (enableClip) {
        container.attr('clip-path', 'url(#graph-clip');
    }

    Object.values(seriesPoints).forEach((series, index) => {
        drawMedianPoints(container, {xscale, yscale, modulo: index % 6, points: series.values});
    });
};

const drawTitle = function(elem, store, siteNo, agencyCode, sitename, showMLName, showTooltip) {
    let titleDiv = elem.append('div')
        .classed('time-series-graph-title', true);

    if (showMLName) {
        titleDiv.append('div')
            .attr('class', 'monitoring-location-name-div')
            .html(`${sitename}, ${agencyCode} ${siteNo}`);
    }
    titleDiv.append('div')
        .call(link(store,(elem, {title, parameter}) => {
            elem.html(title);
            if (showTooltip) {
                elem.call(appendInfoTooltip, parameter ? parameter.description : 'No description available');
            }
        }, createStructuredSelector({
            title: getTitle,
            parameter: getPrimaryParameter
        })));
};

const drawWatermark = function(elem, store) {
    // These constants will need to change if the watermark svg is updated
    const watermarkHalfHeight = 87 / 2;
    const watermarkHalfWidth = 235 / 2;
    elem.append('img')
        .classed('watermark', true)
        .attr('alt', 'USGS - science for a changing world')
        .attr('src', config.STATIC_URL + '/img/USGS_green_logo.svg')
        .call(link(store, function(elem, layout) {
            const centerX = layout.margin.left + (layout.width - layout.margin.right - layout.margin.left) / 2;
            const centerY = layout.margin.top + (layout.height - layout.margin.bottom - layout.margin.top) / 2;
            const scale = !mediaQuery(config.USWDS_MEDIUM_SCREEN) ? 0.5 : 1;
            const translateX = centerX - watermarkHalfWidth;
            const translateY = centerY - watermarkHalfHeight;
            const transform = `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`;

            elem.style('transform', transform);
            // for Safari browser
            elem.style('-webkit-transform', transform);

        }, getMainLayout));
};

/*
 * Renders the IV time series graph with the D3 elem using the state information in store.
 * @param {D3 selection} elem
 * @param {Redux store} store
 * @param {String} siteNo
 * @param {Boolean} showMLName - If true add the monitoring location name to the top of the graph
 * @param {Boolean} showTooltip - If true render the tooltip text and add the tooltip focus element
 */
export const drawTimeSeriesGraph = function(elem, store, siteNo, agencyCode, sitename, showMLName, showTooltip) {
    let graphDiv;
    graphDiv = elem.append('div')
        .attr('class', 'hydrograph-container')
        .attr('ga-on', 'click')
        .attr('ga-event-category', 'hydrograph-interaction')
        .attr('ga-event-action', 'clickOnTimeSeriesGraph')
        .call(drawWatermark, store)
        .call(drawTitle, store, siteNo, agencyCode, sitename, showMLName, showTooltip);
    if (showTooltip) {
        graphDiv.call(drawTooltipText, store);
    }
    const graphSvg = graphDiv.append('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .classed('hydrograph-svg', true)
        .call(link(store,(elem, layout) => {
            elem.select('#graph-clip').remove();
            elem.attr('viewBox', `0 0 ${layout.width + layout.margin.left + layout.margin.right} ${layout.height + layout.margin.top + layout.margin.bottom}`)
                .append('clipPath')
                    .attr('id', 'graph-clip')
                    .append('rect')
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('width', layout.width - layout.margin.right)
                        .attr('height', layout.height - layout.margin.bottom);
        }, getMainLayout))
        .call(link(store, addSVGAccessibility, createStructuredSelector({
            title: getTitle,
            description: getDescription,
            isInteractive: () => true,
            idPrefix: () => 'hydrograph'
        })))
        .call(addDefsPatterns);

    const dataGroup = graphSvg.append('g')
        .attr('class', 'plot-data-lines-group')
        .call(link(store, (group, layout) => {
            group.attr('transform', `translate(${layout.margin.left},${layout.margin.top})`);
        }, getMainLayout))
        .call(link(store, appendAxes, getAxes('MAIN')))
        .call(link(store, drawDataSegments, createStructuredSelector({
            visible: () => true,
            segments: getIVDataSegments('primary'),
            dataKind: () => 'primary',
            xScale: getMainXScale('current'),
            yScale: getMainYScale,
            enableClip: () => true
        })))
        .call(link(store, drawDataSegments, createStructuredSelector({
            visible: isVisible('compare'),
            segments: getIVDataSegments('compare'),
            dataKind: () => 'compare',
            xScale: getMainXScale('prioryear'),
            yScale: getMainYScale,
            enableClip: () => true
        })))
        .call(link(store, drawGroundwaterLevels, createStructuredSelector({
            levels: getGroundwaterLevelPoints,
            xScale: getMainXScale('current'),
            yScale: getMainYScale,
            enableClip: () => true
        })))
        .call(link(store, drawAllMedianPoints, createStructuredSelector({
            visible: isVisible('median'),
            xscale: getMainXScale('current'),
            yscale: getMainYScale,
            seriesPoints: getPrimaryMedianStatisticsData,
            enableClip: () => true
        })))
        .call(link(store, drawFloodLevelLines, createStructuredSelector({
            visible: isWaterwatchVisible,
            xscale: getMainXScale('current'),
            yscale: getMainYScale,
            floodLevels: getFloodLevelData
        })));

    if (showTooltip) {
        dataGroup.call(drawTooltipFocus, store);
    }
};
