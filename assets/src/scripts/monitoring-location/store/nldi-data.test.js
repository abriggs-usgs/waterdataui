import mockConsole from 'jest-mock-console';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {default as thunk} from 'redux-thunk';
import sinon from 'sinon';

import {
    MOCK_NLDI_UPSTREAM_FLOW_FEATURE,
    MOCK_NLDI_DOWNSTREAM_FLOW_FEATURE,
    MOCK_NLDI_UPSTREAM_BASIN_FEATURE
} from 'ui/mock-service-data';

import {Actions, nldiDataReducer} from './nldi-data';

describe('monitoring-location/store/nldi-data module', () => {
    /* eslint no-use-before-define: 0 */
    let store;
    let fakeServer;
    let restoreConsole;

    beforeEach(() => {
        store = createStore(
            combineReducers({
                nldiData: nldiDataReducer
            }),
            {
                nldiData: {}
            },
            applyMiddleware(thunk)
        );
        fakeServer = sinon.createFakeServer();
        restoreConsole = mockConsole();
    });

    afterEach(() => {
        fakeServer.restore();
        restoreConsole();
    });

    describe('nldiDataReducer and Actions', () => {
        describe('setNldiFeatures', () => {
            const UPSTREAM_FLOWS = [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [-87.4336489066482, 39.4954827949405],
                            [-87.4337763041258, 39.4952046945691]
                        ]
                    },
                    properties: {
                        'nhdplus_comid': '10286212'
                    }
                }];
            const DOWNSTREAM_FLOWS = [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [-87.4336489066483, 39.4954827949406],
                            [-87.4337763041259, 39.4952046945692]
                        ]
                    },
                    properties: {
                        'nhdplus_comid': '10286213'
                    }
                }];

            const UPSTREAM_BASIN = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [[-105.996400477, 36.1905362630001], [-105.994985767, 36.20007602], [-105.997781253, 36.2060425510001], [-105.995979878, 36.2080856000001]]
                        },
                        properties: {}
                    }]
            };

            it('expect nldi data to be updated', () => {
                store.dispatch(
                    Actions.setNldiFeatures(UPSTREAM_FLOWS, DOWNSTREAM_FLOWS, UPSTREAM_BASIN));
                const nldiData = store.getState().nldiData;

                expect(nldiData.upstreamFlows).toEqual(UPSTREAM_FLOWS);
                expect(nldiData.downstreamFlows).toEqual(DOWNSTREAM_FLOWS);
                expect(nldiData.upstreamBasin).toEqual(UPSTREAM_BASIN);
            });
        });

        describe('retrieveNldiData', () => {
            it('Expects that fetching urls have the siteno', () => {
                store.dispatch(Actions.retrieveNldiData('12345678'));

                expect(fakeServer.requests).toHaveLength(3);
                expect(fakeServer.requests[0].url).toContain('USGS-12345678');
                expect(fakeServer.requests[1].url).toContain('USGS-12345678');
                expect(fakeServer.requests[2].url).toContain('USGS-12345678');
            });

            it('Expects the store to be updated on successful fetches', () => {
                const promise = store.dispatch(Actions.retrieveNldiData('12345678'));
                fakeServer.requests[0].respond(200, {}, MOCK_NLDI_UPSTREAM_FLOW_FEATURE);
                fakeServer.requests[1].respond(200, {}, MOCK_NLDI_DOWNSTREAM_FLOW_FEATURE);
                fakeServer.requests[2].respond(200, {}, MOCK_NLDI_UPSTREAM_BASIN_FEATURE);

                return promise.then(() => {
                    const nldiData = store.getState().nldiData;

                    expect(nldiData.upstreamFlows).toEqual(JSON.parse(MOCK_NLDI_UPSTREAM_FLOW_FEATURE).features);
                    expect(nldiData.downstreamFlows).toEqual(JSON.parse(MOCK_NLDI_DOWNSTREAM_FLOW_FEATURE).features);
                    expect(nldiData.upstreamBasin).toEqual(JSON.parse(MOCK_NLDI_UPSTREAM_BASIN_FEATURE).features);
                });
            });

            it('Expects the store to not contain empty features if calls are unsuccessful', () => {
                const promise = store.dispatch(Actions.retrieveNldiData('12345678'));
                fakeServer.requests[0].respond(500, {}, 'Internal server error');
                fakeServer.requests[1].respond(500, {}, 'Internal server error');
                fakeServer.requests[2].respond(500, {}, 'Internal server error');

                return promise.then(() => {
                    const nldiData = store.getState().nldiData;

                    expect(nldiData.upstreamFlows).toEqual([]);
                    expect(nldiData.downstreamFlows).toEqual([]);
                    expect(nldiData.upstreamBasin).toEqual([]);
                });
            });
        });
    });
});