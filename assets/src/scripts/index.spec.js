/**
 * This is an entrypoint for the Karma test runner. All tests should be
 * explicitly added here, or they won't be run as part of the test suite.
 *
 * This exists to speed up the execution time of the test suite. The
 * tests and the application dependencies only need to be compiled a single
 * time, and `karma --watch` tasks are very fast.
 */

import 'ui/mock-service-data';
import 'ui/polyfills';

import 'ui/ajax.spec';
import 'ui/schema.spec';
import 'ui/tooltips.spec';
import 'ui/utils.spec';

import 'd3rendering/accessibility.spec';
import 'd3rendering/alerts.spec';
import 'd3rendering/axes.spec';
import 'd3rendering/cursor-slider.spec';
import 'd3rendering/data-masks.spec';
import 'd3rendering/graph-tooltip.spec';
import 'd3rendering/legend.spec';
import 'd3rendering/loading-indicator.spec';
import 'd3rendering/markers.spec';
import 'd3rendering/tick-marks.spec';

import 'leaflet/map.spec';
import 'leaflet/legend-control.spec';

import 'lib/d3-redux.spec';

import 'dvhydrograph/selectors/labels.spec';
import 'dvhydrograph/selectors/legend-data.spec';
import 'dvhydrograph/selectors/scales.spec';
import 'dvhydrograph/selectors/time-series-data.spec';
import 'dvhydrograph/graph-brush.spec';
import 'dvhydrograph/graph-controls.spec';
import 'dvhydrograph/index.spec';
import 'dvhydrograph/time-series-graph.spec';
import 'dvhydrograph/tooltip.spec';

import 'ml/components/embed.spec';

import 'ivhydrograph/cursor.spec';
import 'ivhydrograph/domain.spec';
import 'ivhydrograph/drawing-data.spec';
import 'ivhydrograph/layout.spec';
import 'ivhydrograph/parameter-data.spec';
import 'ivhydrograph/scales.spec';
import 'ivhydrograph/time-series-data.spec';

import 'ivhydrograph/audible.spec';
import 'ivhydrograph/date-controls.spec';
import 'ivhydrograph/data-table.spec';
import 'ivhydrograph/graph-brush.spec';
import 'ivhydrograph/graph-controls.spec';
import 'ivhydrograph/hydrograph-utils.spec';
import 'ivhydrograph/index.spec';
import 'ivhydrograph/legend.spec';
import 'ivhydrograph/method-picker.spec';
import 'ivhydrograph/parameters.spec';
import 'ivhydrograph/time-series-graph.spec';
import 'ivhydrograph/tooltip.spec';

import 'ml/components/map/flood-slider.spec';
import 'ml/components/map/index.spec';
import 'ml/components/map/legend.spec';

import 'ml/selectors/daily-value-time-series-selector.spec';
import 'ml/selectors/flood-data-selector.spec';
import 'ml/selectors/network-selector.spec';
import 'ml/selectors/nldi-data-selector.spec';
import 'ml/selectors/median-statistics-selector.spec';
import 'ml/selectors/time-series-selector.spec';
import 'ml/selectors/time-zone-selector.spec';

import 'ml/store/daily-value-time-series.spec';
import 'ml/store/flood-inundation.spec';
import 'ml/store/instantaneous-value-time-series-data.spec';
import 'ml/store/instantaneous-value-time-series-state.spec';
import 'ml/store/network.spec';
import 'ml/store/nldi-data.spec';
import 'ml/store/statistics-data.spec';
import 'ml/store/time-zone.spec';
import 'ml/store/ui-state.spec';

import 'ml/url-params.spec';
import 'network/components/network-sites/data-table.spec';
import 'network/components/network-sites/index.spec';
import 'network/components/network-sites/legend.spec';
import 'network/selectors/network-data-selector.spec';
import 'network/store/index.spec';
import 'network/store/network-data-reducer.spec';

import 'webservices/flood-data.spec';
import 'webservices/models.spec';
import 'webservices/network-data.spec';
import 'webservices/nldi-data.spec';
import 'webservices/observations.spec';
import 'webservices/statistics-data.spec';
