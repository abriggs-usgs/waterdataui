import {ticks} from 'd3-array';
import {format} from 'd3-format';
import {createSelector} from 'reselect';

import config from 'ui/config';
import {mediaQuery} from 'ui/utils';

import {
    getPrimaryMedianStatisticsValueRange,
    getPrimaryParameter
} from 'ml/selectors/hydrograph-data-selector';

import {getGroundwaterLevelDataRange} from './discrete-data';
import {getIVDataRange} from './iv-data';
import {isVisible} from './time-series-data';

const Y_TICK_COUNT = 5;

const PADDING_RATIO = 0.2;
// array of parameters that should use
// a symlog scale instead of a linear scale
export const SYMLOG_PARMS = [
    '00060',
    '72137'
];

const useSymlog = function(parameter) {
    return parameter ? SYMLOG_PARMS.indexOf(parameter.parameterCode) > -1 : false;
};

/*
 * The helper functions are exported as an aid to testing. Only the selectors are actually imported into other modules
 */
/**
 *  Helper function which returns domain padded on both ends by paddingRatio.
 *  For positive domains, a zero-lower bound on the y-axis is enforced.
 *  @param {Array} domain - array of two numbers
 *  @param {Boolean} useLogScale - using log scale
 *  @return {Array} - array of two numbers
 */
export const extendDomain = function(domain, useLogScale) {
    const isPositive = domain[0] > 0 && domain[1] > 0;
    let extendedDomain;

    // Pad domains on both ends by PADDING_RATIO.
    const padding = PADDING_RATIO * (domain[1] - domain[0]);
    extendedDomain = [
        domain[0] - padding,
        domain[1] + padding
    ];

    // Log scales lower-bounded based on the order of magnitude of the domain minimum.
    if (useLogScale) {
        const absLog10 = Math.abs(Math.log(domain[0]));
        extendedDomain = [
            isPositive ? domain[0] * absLog10/(absLog10 + 1) : domain[0],
            extendedDomain[1]
        ];
    }

    // For positive domains, a zero-lower bound on the y-axis is enforced.
    return [
        isPositive ? Math.max(0, extendedDomain[0]) : extendedDomain[0],
        extendedDomain[1]
    ];
};

/**
 * Helper function that finds highest negative value (or lowest positive value) in array of tick values, then returns
 * that number's absolute value
 * @param {array} tickValues, the list of y-axis tick values
 * @returns {number} lowestAbsoluteValueOfTicks, the lowest absolute value of the tick values
 */
export const getLowestAbsoluteValueOfTickValues = function(tickValues) {
    let lowestAbsoluteValueOfTicks;

    // if tickValues have negative numbers, pull them out and test them to find the (largest negative) smallest absolute value
    if (tickValues.some(value => value < 0)) {
        let negativeTickValues = tickValues.filter(value => value < 0);
        let highestNegativeValueOfTicks = Math.max(...negativeTickValues);
        lowestAbsoluteValueOfTicks = Math.abs(highestNegativeValueOfTicks);
    } else {
        lowestAbsoluteValueOfTicks = Math.min(...tickValues);
    }

    return lowestAbsoluteValueOfTicks;
};

/**
 * Helper function that generates roughly equally spaced tick values by taking the previous value and dividing it by 2
 * to produce the next lower value
 * @param {number}lowestTickValueOfLogScale, lowest numerical value of positive y-axis values, or lowest absolute
 * value of negative y-axis values
 * @returns {array} additionalTickValues, set of new y-axis tick values that will fill tick mark gaps on log scale graphs
 */
const generateAdditionalTickValues = function(lowestTickValueOfLogScale) {
    let additionalTickValues = [];
    while (lowestTickValueOfLogScale > 2) {
        lowestTickValueOfLogScale = Math.ceil(lowestTickValueOfLogScale / 2);
        additionalTickValues.push(lowestTickValueOfLogScale);
    }
    return additionalTickValues;
};

/**
 * Helper function that rounds numerical values in an array based on the numerical value of the individual array item
 * and a somewhat arbitrary numeric (rounding) value. The value in the array is then rounded to a multiple of the
 * arbitrary numeric rounding value.
 * @param {array} additionalTickValues, numerical values for y-axis ticks
 * @param {array} yDomain, an array of two values, the lower and upper extent of the y-axis
 * @returns {array} roundedTickValues, numerical values for y-axis ticks rounded to a multiple of a given number
 */
export const getRoundedTickValues = function(additionalTickValues, yDomain) {
    let roundedTickValues = [];
    // round the values based on an arbitrary breakpoints and rounding targets (may result in duplicate array values)
    additionalTickValues.forEach(function(value) {
        let roundingFactor = 1;
        // first check that the value is greater than the position where the x-axis intersects the y-axis, then round
        if (value > yDomain[0]) {
            if (value > 10000) {
               roundingFactor = 10000;
            } else if (value > 1000) {
                roundingFactor = 1000;
            } else if (value > 100) {
                roundingFactor = 100;
            } else if (value > 20) {
                roundingFactor = 10;
            } else if (value > 5) {
                roundingFactor = 5;
            }
        value = Math.ceil(value / roundingFactor) * roundingFactor;

        roundedTickValues.push(value);
        }
    });

    return roundedTickValues;
};


/**
 *  Helper function that, when negative values are present on the y-axis, adds additional negative values to the set of
 *  tick values used to fill tick mark value gaps on the y-axis on some log scale graphs
 * @param {Array} tickValues, a set of tick mark values
 * @param {Array} additionalTickValues, a set of tick mark values with (when needed) additional negative values
 * @retirm {Array}
 */
export const generateNegativeTicks = function(tickValues, additionalTickValues) {
    if (tickValues.some(value => value < 0)) {
        let tickValueArrayWithNegatives = additionalTickValues.map(x => x * -1);
        additionalTickValues = tickValueArrayWithNegatives.concat(additionalTickValues);
    }

    return additionalTickValues;
};


/**
 * Help function creates a new set of tick values that will fill in gaps in log scale ticks, then combines this new set with the
 * original set of tick marks.
 * @param {array} tickValues, the list of y-axis tick values
 * @param {array} yDomain, an array of two values, the lower and upper extent of the y-axis
 * @returns {array} fullArrayOfTickMarks, the new full set of tick marks for log scales
 */
export const getFullArrayOfAdditionalTickMarks = function(tickValues, yDomain) {
     // get the lowest value of generated tick mark set to use as a starting point for the additional ticks
    let lowestTickValueOfLogScale = getLowestAbsoluteValueOfTickValues(tickValues);

    // Make a set of tick values that when graphed will have equal spacing on the y axis
    let additionalTickValues = generateAdditionalTickValues(lowestTickValueOfLogScale);

    // round the values to a chosen multiple of a number
    additionalTickValues = getRoundedTickValues(additionalTickValues, yDomain);

    // if the log scale has negative values, add additional negative ticks with negative labels
    additionalTickValues = generateNegativeTicks(tickValues, additionalTickValues);

    // add the new set of tick values to the original and remove any values that are duplicates
    return Array.from(new Set(additionalTickValues.concat(tickValues)));
};

export const getPrimaryValueRange = createSelector(
    isVisible('compare'),
    isVisible('median'),
    getIVDataRange('primary'),
    getIVDataRange('compare'),
    getPrimaryMedianStatisticsValueRange,
    getGroundwaterLevelDataRange,
    getPrimaryParameter,
    (showCompare, showMedian, primaryRange, compareRange, medianRange, gwLevelsRange, parameter) => {
        const valueExtent = [];
        let result = [0, 1];
        if (primaryRange) {
            valueExtent.push(...primaryRange);
        }
        if (gwLevelsRange) {
            valueExtent.push(...gwLevelsRange);
        }
        if (showCompare && compareRange) {
            valueExtent.push(...compareRange);
        }
        if (showMedian && medianRange) {
            valueExtent.push(...medianRange);
        }
        if (valueExtent.length) {
            result = [Math.min(...valueExtent), Math.max(...valueExtent)];

            // Add padding to the extent and handle empty data sets.
            result = extendDomain(result, useSymlog(parameter));
        }
        return result;
    }
);

/*
 * Returns a Redux selector function that returns an Object with two properties:
 *      @prop tickValues {Array of Number}
 *      @prop tickFormat {Array of String} - formatted tickValues
 */
export const getYTickDetails = createSelector(
    getPrimaryValueRange,
    getPrimaryParameter,
    (yDomain, parameter) => {
        let tickValues = ticks(yDomain[0], yDomain[1], Y_TICK_COUNT);

        // When there are too many log scale ticks they will overlap--reduce the number in proportion to the number of ticks
        // For example, if there are 37 tick marks, every 4 ticks will be used... if there are 31 tick marks, every 3 ticks
        // will be used. Screens smaller than the USWDS defined medium screen will use fewer tick marks than larger screens.
        if (useSymlog(parameter)) {
            // add additional ticks and labels to log scales as needed
            tickValues = getFullArrayOfAdditionalTickMarks(tickValues, yDomain);
            // remove ticks if there are too many of them
            let lengthLimit = 20;
            let divisor = 10;
            if (!mediaQuery(config.USWDS_MEDIUM_SCREEN)) {
                lengthLimit = 10;
                divisor = 5;
            }
            if (tickValues.length > lengthLimit) {
                tickValues = tickValues
                    .sort((a, b) => a - b)
                    .filter((_, index) => {
                        return !(index % Math.round(tickValues.length / divisor));
                    });
            }
        }

        // If all ticks are integers, don't display right of the decimal place.
        // Otherwise, format with two decimal points.
        const tickFormat = tickValues.filter(t => !Number.isInteger(t)).length ? '.2f' : 'd';
        return {
            tickValues: tickValues,
            tickFormat: format(tickFormat)
        };
    }
);
