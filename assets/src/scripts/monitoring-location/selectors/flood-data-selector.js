import {createSelector} from 'reselect';

import config from 'ui/config';

import {getPrimaryParameter} from './hydrograph-data-selector';

export const getFloodStages = state => state.floodData.stages || [];

export const getFloodExtent = state => state.floodData.extent || {};

export const getFloodLevels = state => state.floodData.floodLevels || null;

export const getFloodGageHeight = state => state.floodState.gageHeight;

/*
 * Provides a function which returns True if flood data is not empty.
 */
export const hasFloodData = createSelector(
    getFloodStages,
    (stages) => stages.length > 0
);

/*
 * Provides a function which returns True if waterwatch flood levels is not empty.
 */
export const hasWaterwatchData = createSelector(
    getFloodLevels,
    (floodLevels) =>
        floodLevels != null
);

/*
 * Provides a function which returns True if waterwatch flood levels should be visible.
 */
export const isWaterwatchVisible = createSelector(
    hasWaterwatchData,
    getPrimaryParameter,
    (hasFloodLevels, parameter) => hasFloodLevels && parameter && parameter.parameterCode === config.GAGE_HEIGHT_PARAMETER_CODE
);

/*
 * Provides a function which returns the stage closest to the gageHeight
 */
export const getFloodStageHeight = createSelector(
    getFloodStages,
    getFloodGageHeight,
    (stages, gageHeight) => {
        let result = null;
        if (stages.length && gageHeight) {
            result = stages[0];
            let diff = Math.abs(gageHeight - result);
            stages.forEach((stage) => {
                let newDiff = Math.abs(gageHeight - stage);
                if (newDiff <= diff) {
                    diff = newDiff;
                    result = stage;
                }
            });
        }
        return result;
    }
);

/*
 * Provides a function which returns the stage index closest to the gageHeight
 */
export const getFloodGageHeightStageIndex= createSelector(
    getFloodStages,
    getFloodStageHeight,
    (stages, stageHeight) => {
        let result = null;
        if (stageHeight) {
            result = stages.indexOf(stageHeight);
        }
        return result;
    }
);

/*
 * Provides a function which returns the Waterwatch Flood Levels
 */
export const getWaterwatchFloodLevels = createSelector(
    getFloodLevels,
    (floodLevels) => {
        return floodLevels ? {
            actionStage: parseFloat(floodLevels.action_stage),
            floodStage: parseFloat(floodLevels.flood_stage),
            moderateFloodStage: parseFloat(floodLevels.moderate_flood_stage),
            majorFloodStage: parseFloat(floodLevels.major_flood_stage)
        } : null;
    }
);

