
import {DateTime} from 'luxon';

import {get} from 'ui/ajax';
import config from 'ui/config';

/*
 * Return the past service root if the start dt is more than 120 days from now
 */
function ivDataEndpoint(dateTime) {
    return DateTime.local().diff(dateTime).as('days') > 120 ? config.HISTORICAL_IV_DATA_ENDPOINT : config.IV_DATA_ENDPOINT;
}

function getNumberOfDays(period) {
    const days = period.match(/\d+/);
    if (days.length === 1) {
        return parseInt(days[0]);
    } else {
        return null;
    }
}

/*
* Formats a URL for monitoring location details (meta data)
* @param {String} siteno - the unique identifier for the monitoring location
* @param {Boolean} isExpanded - if the meta data has additional information
*/
export const getSiteMetaDataServiceURL = function({siteno,  isExpanded}) {
    return `${config.SITE_DATA_ENDPOINT}/?format=rdb&sites=${siteno}${isExpanded ? '&siteOutput=expanded' : ''}&siteStatus=all`;
};

/*
* Get a URL formatted to download data from waterservices.usgs.gov
* @param  {Array}  sites  Array of site IDs to retrieve.
* @param  {String} parameterCode - USGS five digit parameter code
* @param {String} period - ISO 8601 Duration
* @param {String} startTime - ISO 8601 time
* @param {String} endTime - ISO 8601 time
* @param {String} format - the data format returned from waterservices.usgs.gov
* @return {String} The URL used to contact waterservices.usgs.gov
 */
export const getIVServiceURL = function({
                                             siteno,
                                             parameterCode = null,
                                             period = null,
                                             startTime = null,
                                             endTime = null,
                                             format = null
                                         }) {
    let timeParams;
    let dataEndpoint;

    if (period) {
        const timePeriod = period;
        const dayCount = getNumberOfDays(timePeriod);
        timeParams = `period=${timePeriod}`;
        dataEndpoint = dayCount && dayCount < 120 ? config.IV_DATA_ENDPOINT: config.HISTORICAL_IV_DATA_ENDPOINT;
    } else if (startTime && endTime) {
        const startDateTime =  DateTime.fromISO(startTime);
        timeParams = `startDT=${startTime}&endDT=${endTime}`;
        dataEndpoint = ivDataEndpoint(startDateTime);
    } else {
        timeParams = '';
        dataEndpoint = config.IV_DATA_ENDPOINT;
    }

    let parameterCodeQuery = parameterCode ? `&parameterCd=${parameterCode}` : '';

    return  `${dataEndpoint}/?sites=${siteno}${parameterCodeQuery}&${timeParams}&siteStatus=all&format=${format}`;
};

/**
 * Get a given time series dataset from Water Services.
 * @param  {String}  sites  Array of site IDs to retrieve.
 * @param  {String} parameterCode
 * @param {String} period - ISO 8601 Duration
 * @param {String} startTime - ISO 8601 time
 * @param {String} endTime - ISO 8601 time
 * @return {Promise} resolves to an array of time series model object, rejects to an error
 */
export const fetchTimeSeries = function({siteno, parameterCode=null, period=null, startTime=null, endTime=null}) {
    return get(getIVServiceURL({
            siteno: siteno,
            parameterCode: parameterCode,
            period:  period,
            startTime: startTime,
            endTime: endTime,
            format: 'json'
        })).then(response => JSON.parse(response))
        .catch(reason => {
            console.error(reason);
            throw reason;
        });
};
