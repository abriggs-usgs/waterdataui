import {applyMiddleware, createStore, combineReducers, compose} from 'redux';
import {default as thunk} from 'redux-thunk';

import {
    floodDataReducer as floodData,
    floodStateReducer as floodState} from './flood-inundation';
import {nldiDataReducer as nldiData} from './nldi-data';
import {dailyValueTimeSeriesDataReducer as dailyValueTimeSeriesData} from './daily-value-time-series';
import {dailyValueTimeSeriesStateReducer as dailyValueTimeSeriesState} from './daily-value-time-series';
import {discreteDataReducer as discreteData} from './discrete-data';
import {ivTimeSeriesDataReducer as ivTimeSeriesData} from './instantaneous-value-time-series-data';
import {ivTimeSeriesStateReducer as ivTimeSeriesState} from './instantaneous-value-time-series-state';
import {networkDataReducer as networkData} from './network';
import {statisticsDataReducer as statisticsData} from './statistics-data';
import {timeZoneReducer as ianaTimeZone} from './time-zone';
import {uiReducer as ui} from './ui-state';

const appReducer = combineReducers({
    ivTimeSeriesData,
    ianaTimeZone,
    dailyValueTimeSeriesData,
    statisticsData,
    floodData,
    nldiData,
    discreteData,
    ivTimeSeriesState,
    dailyValueTimeSeriesState,
    floodState,
    ui,
    networkData
});

const MIDDLEWARES = [thunk];


export const configureStore = function(initialState) {
    initialState = {
        ivTimeSeriesData: {},
        ianaTimeZone: null,
        dailyValueTimeSeriesData: {},
        discreteData: {},
        floodData: {
            stages: [],
            extent: {},
            floodLevels: null
        },
        nldiData: {
            upstreamFlows: [],
            downstreamFlows: [],
            upstreamSites: [],
            downstreamSites: [],
            upstreamBasin: []
        },
        statisticsData: {},
        ivTimeSeriesState: {
            showIVTimeSeries: {
                current: true,
                compare: false,
                median: false,
                secondParameterCurrent: false
            },
            currentIVDateRange: 'P7D',
            customIVTimeRange: null,
            currentIVVariableID: null,
            currentIVSecondVariableID: 'none',
            ivGraphCursorOffset: null,
            audiblePlayId: null,
            loadingIVTSKeys: [],
            ivGraphBrushOffset: null,
            userInputsForTimeRange: {
                mainTimeRangeSelectionButton: 'P7D',
                customTimeRangeSelectionButton: 'days-input',
                numberOfDaysFieldValue: ''
            },
            currentIVMethodIDForSecondParameter: 'none'
        },
        dailyValueTimeSeriesState: {
            cursorOffset: null
        },
        floodState: {
            gageHeight: null
        },
        ui : {
            windowWidth: 1024,
            width: 800
        },
        networkData : {
            networkList: []
        },
        ...initialState
    };

    let enhancers;
    if (window.__REDUX_DEVTOOLS_EXTENSION__) {
        enhancers = compose(
            applyMiddleware(...MIDDLEWARES),
            window.__REDUX_DEVTOOLS_EXTENSION__({serialize: true})
        );
    } else {
        enhancers = applyMiddleware(...MIDDLEWARES);
    }

    return createStore(
        appReducer,
        initialState,
        enhancers
    );
};
