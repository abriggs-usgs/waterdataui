import {select} from 'd3-selection';

import * as utils from 'ui/utils';

import {configureStore} from 'ml/store';

import * as dataIndicator from './data-indicator';
import {drawMethodPicker} from './method-picker';
import {TEST_PRIMARY_IV_DATA} from './mock-hydrograph-state';

describe('monitoring-location/components/hydrograph/method-picker', () => {
    utils.mediaQuery = jest.fn().mockReturnValue(true);

    describe('drawMethodPicker', () => {
        const TEST_STATE = {
            hydrographData: {
                primaryIVData: TEST_PRIMARY_IV_DATA
            },
            hydrographState: {
                selectedIVMethodID: '252055'
            }
        };
        let div;
        let showDataIndicatorSpy;
        beforeEach(() => {
            div = select('body').append('div');
            showDataIndicatorSpy = jest.spyOn(dataIndicator, 'showDataIndicators');
        });

        afterEach(() => {
            div.remove();
        });

        it('Creates a picker and sets the currentMethodID to the hydrographState\'s selectedIVMethodID', () => {
            const parameterCode = '72019';
            let store = configureStore(TEST_STATE);
            div.call(drawMethodPicker, parameterCode, store);

            expect(div.select('#ts-method-select-container').attr('hidden')).toBeNull();
            expect(div.select('select').property('value')).toEqual('252055');
        });

        it('Creates a picker and if selectedIVMethodID not set set to the preferred method id', () => {
            const parameterCode = '72019';
            let store = configureStore({
                ...TEST_STATE,
                hydrographState: {
                    ...TEST_STATE.hydrographState,
                    selectedIVMethodID: null
                }
            });
            div.call(drawMethodPicker, parameterCode, store);

            expect(div.select('#ts-method-select-container').attr('hidden')).toBeNull();
            expect(div.select('select').property('value')).toEqual('90649');
        });

        it('selecting a different method updates the store and updates the no data available indicator', () => {
            let store = configureStore(TEST_STATE);
            const parameterCode = '72019';
            div.call(drawMethodPicker, parameterCode, store);

            const newOption = div.select('option[value="90649"]');
            newOption.attr('selected', true);

            div.select('select').dispatch('change');

            expect(store.getState().hydrographState.selectedIVMethodID).toBe('90649');
            expect(showDataIndicatorSpy.mock.calls).toHaveLength(1);
            expect(showDataIndicatorSpy.mock.calls[0][0]).toBe(false);
        });

        it('Expects if the data has only one method then the picker will be hidden', () => {
            const parameterCode = '72019';
            let store = configureStore({
                ...TEST_STATE,
                hydrographData: {
                    primaryIVData: {
                        ...TEST_STATE,
                        values: {
                            '90649': {
                                ...TEST_PRIMARY_IV_DATA.values['90649']
                            }
                        }
                    }
                }
            });
            div.call(drawMethodPicker, parameterCode, store);

            expect(div.select('#ts-method-select-container').attr('hidden')).toBe('true');
        });

        it('Expects the methods will be in order from most to least points', () => {
            const parameterCode = '72019';
            let store = configureStore({
                ...TEST_STATE
            });
            div.call(drawMethodPicker, parameterCode, store);
            const allOptionElements = div.selectAll('option');
            expect(allOptionElements['_groups'][0][0].getAttribute('value')).toBe('90649');
            expect(allOptionElements['_groups'][0][1].getAttribute('value')).toBe('252055');
        });

        it('Expects that there will be a message if some of the methods have no points', () => {
            const parameterCode = '72019';
            let store = configureStore({
                ...TEST_STATE
            });
            div.call(drawMethodPicker, parameterCode, store);

            expect(div.select('#no-data-points-note')['_groups'][0][0].innerHTML).toContain('some methods are disabled');
        });

        it('Expects that there will NOT be a message all of the methods have points', () => {
            const parameterCode = '72019';
            let store = configureStore({
                ...TEST_STATE,
                hydrographData: {
                    primaryIVData: {
                        ...TEST_STATE,
                        values: {
                            '90649': {
                                ...TEST_PRIMARY_IV_DATA.values['90649']
                            },
                            '252055': {
                                points: [
                                    {value: 25.6, qualifiers: ['E'], dateTime: 1600618500000},
                                    {value: 26.5, qualifiers: ['P'], dateTime: 1600619400000},
                                    {value: 25.9, qualifiers: ['P'], dateTime: 1600620300000}
                                ],
                                method: {
                                    methodDescription: 'From multiparameter sonde',
                                    methodID: '252055'
                                }
                            }
                        }
                    }
                }
            });
            div.call(drawMethodPicker, parameterCode, store);

            expect(div.select('#no-data-points-note').size()).toBe(0);
        });

        it('Expects that if there is not a method description, the method id will be used', () => {
            const parameterCode = '72019';
            let store = configureStore({
                ...TEST_STATE,
                hydrographData: {
                    primaryIVData: {
                        ...TEST_STATE,
                        values: {
                            '90649': {
                                ...TEST_PRIMARY_IV_DATA.values['90649']
                            },
                            '252055': {
                                points: [
                                    {value: 25.6, qualifiers: ['E'], dateTime: 1600618500000},
                                ],
                                method: {
                                    methodDescription: '',
                                    methodID: '252055'
                                }
                            }
                        }
                    }
                }
            });
            div.call(drawMethodPicker, parameterCode, store);

            expect(div.selectAll('[value="252055"]')['_groups'][0][0].innerHTML).toContain('252055');
        });
    });
});
