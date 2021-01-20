/**
 * Pick list for methods module
 */

import {select} from 'd3-selection';
import {createStructuredSelector} from 'reselect';

import{link}  from 'ui/lib/d3-redux';

import {getCurrentMethodID, getAllMethodsForCurrentVariable} from 'ml/selectors/time-series-selector';
import {Actions} from 'ml/store/instantaneous-value-time-series-state';

import {getAllMethods} from './selectors/time-series-data';

export const drawMethodPicker = function(elem, store) {
    const pickerContainer = elem.insert('div', ':nth-child(2)')
        .attr('id', 'ts-method-select-container');

    pickerContainer.append('label')
        .attr('class', 'usa-label')
        .attr('for', 'method-picker')
        .text('Description');
    pickerContainer.append('select')
        .attr('class', 'usa-select')
        .attr('id', 'method-picker')
        .on('change', function() {
            store.dispatch(Actions.setCurrentIVMethodID(parseInt(select(this).property('value'))));
        })
        .call(link(store,function(elem, {methods, currentMethodId}) {
            const currentMethodIdString = parseInt(currentMethodId);
            elem.selectAll('option').remove();
            methods.forEach((method) => {
                elem.append('option')
                    .text(method.methodDescription ? `${method.methodDescription}` : 'None')
                    .attr('selected', currentMethodIdString === method.methodID ? true : null)
                    .node().value = method.methodID;
            });
            pickerContainer.property('hidden', methods.length <= 1);
            if (methods.length) {
                elem.dispatch('change');
            }
        }, createStructuredSelector({
            methods: getAllMethodsForCurrentVariable,
            currentMethodId: getCurrentMethodID
        })));
};

export const drawMethodPickerNEW = function(elem, store, whichParameterPicker, parameterDetails) {

    const pickerContainer = elem.append('div')
        .attr('id', `${whichParameterPicker}-ts-method-select-container-${parameterDetails.parameterCode}`);
    pickerContainer.append('select')
        .attr('class', 'usa-select')
        .attr('id', `${whichParameterPicker} - method-picker -${parameterDetails.parameterCode}`)
        .on('change', function() {
            // store.dispatch(Actions.setCurrentIVMethodID(parseInt(select(this).property('value'))));
        })
        .call(link(store,function(elem, {methodList, currentMethodId}) {
            console.log('method list ', methodList)

            const currentMethodIdString = parseInt(currentMethodId);
            elem.selectAll('option').remove();
            parameterDetails.availableMethods.forEach((method) => {

                elem.append('option')
                    .text(methodList[method].methodDescription ? `${methodList[method].methodDescription}` : `No details available for sampling method ${method}`)
                    .attr('selected', currentMethodIdString === method.methodID ? true : null)
                    .node().value = method.methodID;
            });
            // pickerContainer.property('hidden', methods.length <= 1);
            // if (methods.length) {
            //     elem.dispatch('change');
            // }
        }, createStructuredSelector({
            methodList: getAllMethods,
            currentMethodId: getCurrentMethodID
        })));
};


