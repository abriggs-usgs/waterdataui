"""
Main application views.
"""
import json
import datetime

from flask import abort, render_template, request, Markup, make_response

from markdown import markdown

from . import app, __version__
from .location_utils import build_linked_data, get_disambiguated_values, rollup_dataseries, \
    get_period_of_record_by_parm_cd
from .utils import defined_when, parse_rdb, set_cookie_for_banner_message
from .services import sifta, ogc
from .services.nwis import NwisWebServices
from .services.camera import get_monitoring_location_camera_details

# Station Fields Mapping to Descriptions
from .constants import STATION_FIELDS_D

NWIS = NwisWebServices(app.config['SERVER_SERVICE_ROOT'], app.config['SITE_SERVICE_CATALOG_ROOT'])


@app.route('/')
def home():
    """Render the home page."""
    return render_template('index.html', version=__version__)


@app.route('/questions-comments/<email>/', methods=["GET", "POST"])
def questions_comments(email):
    """Render the user feedback form."""
    referring_url = request.referrer

    return render_template(
        'questions_comments.html',
        email_for_data_questions=email,
        monitoring_location_url=referring_url,
        time_sent=str(datetime.datetime.utcnow())
    )

@app.route('/provisional-data-statement')
def provisional_data_statement():
    """Render the provisional data statement page."""
    return render_template('provisional_data_statement.html')


@app.route('/iv-data-availability-statement')
def iv_data_availability():
    """Render the IV data availability statement page."""
    return render_template('iv_data_availability_statement.html')


@app.route('/monitoring-location/<site_no>/', methods=['GET'])
def monitoring_location(site_no):
    """
    Monitoring Location view

    :param site_no: USGS site number

    """
    agency_cd = request.args.get('agency_cd')
    site_data_resp = NWIS.get_site(site_no, agency_cd)
    status = site_data_resp.status_code
    json_ld = None

    if status == 200:
        site_data = parse_rdb(site_data_resp.iter_lines(decode_unicode=True))
        site_data_list = list(site_data)

        template = 'monitoring_location.html'

        context = {
            'status_code': status,
            'stations': site_data_list,
            'STATION_FIELDS_D': STATION_FIELDS_D
        }
        station_record = site_data_list[0]

        if len(site_data_list) == 1:
            parameter_data = NWIS.get_site_parameters(site_no, agency_cd)
            if parameter_data:
                site_dataseries = [
                    get_disambiguated_values(
                        param_datum,
                        app.config['NWIS_CODE_LOOKUP'],
                        {},
                        app.config['HUC_LOOKUP']
                    )
                    for param_datum in parameter_data
                ]
                grouped_dataseries = rollup_dataseries(site_dataseries)
                available_parameter_codes = set(param_datum['parm_cd'] for param_datum in parameter_data)
                available_data_types = set(param_datum['data_type_cd'] for param_datum in parameter_data)
            else:
                grouped_dataseries = []
                available_parameter_codes = set()
                available_data_types = set()

            json_ld = build_linked_data(
                site_no,
                station_record.get('station_nm'),
                station_record.get('agency_cd'),
                station_record.get('dec_lat_va', ''),
                station_record.get('dec_long_va', ''),
                available_parameter_codes
            )
            location_with_values = get_disambiguated_values(
                station_record,
                app.config['NWIS_CODE_LOOKUP'],
                app.config['COUNTRY_STATE_COUNTY_LOOKUP'],
                app.config['HUC_LOOKUP']
            )
            try:
                site_owner_state = (
                    location_with_values['district_cd']['abbreviation']
                    if location_with_values['district_cd']['abbreviation']
                    else location_with_values['state_cd']['abbreviation']
                )
            except KeyError:
                site_owner_state = None

            # grab the cooperator information from json file so that the logos are added to page, if available
            cooperators = sifta.get_cooperators(site_no, location_with_values.get('district_cd', {}).get('code'))

            if site_owner_state is not None:
                email_for_data_questions = app.config['EMAIL_FOR_DATA_QUESTION'].format(site_owner_state.lower())
            else:
                email_for_data_questions = app.config['EMAIL_TO_REPORT_PROBLEM']

            context = {
                'status_code': status,
                'stations': site_data_list,
                'location_with_values': location_with_values,
                'STATION_FIELDS_D': STATION_FIELDS_D,
                'json_ld': Markup(json.dumps(json_ld, indent=4)),
                'available_data_types': available_data_types,
                'uv_period_of_record': get_period_of_record_by_parm_cd(parameter_data),
                'gw_period_of_record': get_period_of_record_by_parm_cd(parameter_data, 'gw') if app.config[
                    'GROUNDWATER_LEVELS_ENABLED'] else None,
                'parm_grp_summary': grouped_dataseries,
                'cooperators': cooperators,
                'email_for_data_questions': email_for_data_questions,
                'cameras': get_monitoring_location_camera_details((site_no)) if app.config[
                    'MONITORING_LOCATION_CAMERA_ENABLED'] else []
            }

        http_code = 200
    elif 400 <= status < 500:
        template = 'monitoring_location.html'
        context = {'status_code': status, 'reason': site_data_resp.reason}
        http_code = 200
    elif 500 <= status <= 511:
        template = 'errors/500.html'
        context = {}
        http_code = 503
    else:
        template = 'errors/500.html'
        context = {}
        http_code = 500
    if request.headers.get('Accept', '').lower() == 'application/ld+json':
        # did not use flask.json.jsonify because changing it's default
        # mimetype would require changing the app's JSONIFY_MIMETYPE,
        # which defaults to application/json... didn't really want to change that
        return app.response_class(json.dumps(json_ld), status=http_code, mimetype='application/ld+json')
    # At this point 'resp' is not a full response object in the Flask world.
    # In order to set a cookie to the 'resp', we need to have the full response object, so let's create that here
    full_function_response_object = make_response(render_template(template, **context), http_code)
    set_cookie_for_banner_message(full_function_response_object)
    return full_function_response_object


def return_404(*args, **kwargs):
    return abort(404)


@app.route('/hydrological-unit/', defaults={'huc_cd': None}, methods=['GET'])
@app.route('/hydrological-unit/<huc_cd>/', methods=['GET'])
@defined_when(app.config['HYDROLOGIC_PAGES_ENABLED'], return_404)
def hydrological_unit(huc_cd, show_locations=False):
    """
    Hydrological unit view

    :param huc_cd: ID for this unit
    """

    # Get the data corresponding to this HUC
    if huc_cd:
        huc = app.config['HUC_LOOKUP']['hucs'].get(huc_cd, None)

    # If we don't have a HUC, display all the root HUC2 units as children.
    else:
        huc = {
            'huc_nm': 'HUC2',
            'children': app.config['HUC_LOOKUP']['classes']['HUC2']
        }

    # If this is a HUC8 site, get the monitoring locations within it.
    monitoring_locations = []
    if show_locations and huc:
        monitoring_locations = NWIS.get_huc_sites(huc_cd)

    http_code = 200 if huc else 404

    return render_template(
        'hydrological_unit.html',
        http_code=http_code,
        huc=huc,
        monitoring_locations=monitoring_locations,
        show_locations_link=not show_locations and huc and huc.get('kind') == 'HUC8'
    ), http_code


@app.route('/hydrological-unit/<huc_cd>/monitoring-locations/', methods=['GET'])
@defined_when(app.config['HYDROLOGIC_PAGES_ENABLED'], return_404)
def hydrological_unit_locations(huc_cd):
    """
    Returns a HUC page with a list of monitoring locations included.
    """
    return hydrological_unit(huc_cd, show_locations=True)


@app.route('/networks/', defaults={'network_cd': ''}, methods=['GET'])
@app.route('/networks/<network_cd>/', methods=['GET'])
def networks(network_cd):
    """
    Network unit view
    :param network_cd: ID for this network
    """

    # Grab the Network info
    network_data = ogc.get_networks(network_cd)

    if network_cd:
        collection = network_data
        extent = network_data['extent']['spatial']['bbox'][0]
        narrative = markdown(network_data['properties']['narrative'])\
            if network_data['properties'].get('narrative') else None
    else:
        collection = network_data.get('collections')
        extent = None
        narrative = None

    http_code = 200 if (collection) else 404

    return render_template(
        'networks.html',
        http_code=http_code,
        network_cd=network_cd,
        collection=collection,
        extent=extent,
        narrative=narrative
    ), http_code


@app.route('/states/', defaults={'state_cd': None, 'county_cd': None}, methods=['GET'])
@app.route('/states/<state_cd>/', defaults={'county_cd': None}, methods=['GET'])
@app.route('/states/<state_cd>/counties/<county_cd>/', methods=['GET'])
@defined_when(app.config['STATE_COUNTY_PAGES_ENABLED'], return_404)
def states_counties(state_cd, county_cd, show_locations=False):
    """
    State unit view

    :param state_cd: ID for this political unit - 'state'
    :param county_cd: ID for this political unit - 'county'
    """

    # Get the data associated with this county
    if state_cd and county_cd:
        state_county_cd = state_cd + county_cd
        political_unit = app.config['COUNTRY_STATE_COUNTY_LOOKUP']['US']['state_cd'].get(state_cd, None)['county_cd']\
            .get(county_cd, None)

    # Get the data corresponding to this state
    elif state_cd and not county_cd:
        political_unit = app.config['COUNTRY_STATE_COUNTY_LOOKUP']['US']['state_cd'].get(state_cd, None)

    # If no state and or state and county code is available, display list of states.
    elif not state_cd and not county_cd:
        political_unit = {
            'name': 'United States',
            'children': app.config['COUNTRY_STATE_COUNTY_LOOKUP']['US']['state_cd']
        }

    # If the search is at the county level, get the monitoring locations within that county.
    monitoring_locations = []
    if show_locations and state_cd and county_cd:
        monitoring_locations = NWIS.get_county_sites(state_county_cd)

    http_code = 200 if political_unit else 404

    return render_template(
        'states_counties.html',
        http_code=http_code,
        state_cd=state_cd,
        county_cd=county_cd,
        political_unit=political_unit,
        monitoring_locations=monitoring_locations,
        show_locations_link=not show_locations and political_unit and county_cd
    ), http_code


@app.route('/states/<state_cd>/counties/<county_cd>/monitoring-locations/', methods=['GET'])
@defined_when(app.config['STATE_COUNTY_PAGES_ENABLED'], return_404)
def county_station_locations(state_cd, county_cd):
    """
    Returns a page listing monitoring locations within a county.
    """
    return states_counties(state_cd, county_cd, show_locations=True)


@app.route('/components/time-series/<site_no>/', methods=['GET'])
@defined_when(app.config['EMBED_IMAGE_FEATURE_ENABLED'], return_404)
def time_series_component(site_no):
    """
    Returns an unadorned page with the time series component for a site.
    """
    return render_template('monitoring_location_embed.html', site_no=site_no)
