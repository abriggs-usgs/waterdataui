"""
Main application views.
"""
import datetime
import json
import smtplib

from flask import abort, render_template, redirect, request, Markup, make_response, url_for

from markdown import markdown

from . import app, __version__
from .location_utils import build_linked_data, get_disambiguated_values, rollup_dataseries, \
    get_period_of_record_by_parm_cd, get_default_parameter_code
from .utils import defined_when, set_cookie_for_banner_message, create_message
from .services.camera import get_monitoring_location_camera_details
from .services.nwissite import SiteService
from .services.ogc import MonitoringLocationNetworkService
from .services.sifta import SiftaService
from .services.timezone import TimeZoneService

# Station Fields Mapping to Descriptions
from .constants import STATION_FIELDS_D

site_service = SiteService(app.config['SITE_DATA_ENDPOINT'])
monitoring_location_network_service = \
    MonitoringLocationNetworkService(app.config['MONITORING_LOCATIONS_OBSERVATIONS_ENDPOINT'])
time_zone_service = TimeZoneService(app.config['WEATHER_SERVICE_ENDPOINT'])
sifta_service = SiftaService(app.config['COOPERATOR_SERVICE_ENDPOINT'])

def has_feedback_link():
    """
    Return true if page is eligible for feedback form links
    :return: Boolean
    """
    if request.endpoint == 'monitoring_location' or request.endpoint == 'networks':
        return True
    else:
        return False


@app.context_processor
def inject_has_feedback_link():
    return dict(has_feedback_link=has_feedback_link())


@app.route('/')
def home():
    """Render the home page."""
    return render_template('index.html', version=__version__)


@app.route('/questions-comments/<email_for_data_questions>/', methods=["GET", "POST"])
def questions_comments(email_for_data_questions):
    """Render the user feedback form."""
    referring_url = request.referrer
    user_system_data = request.user_agent.string
    referring_page_type = request.args.get('referring_page_type')

    if request.method == 'POST':
        target_email = email_for_data_questions
        if request.form['feedback-type'] != 'contact':
            target_email = app.config['EMAIL_TARGET'][request.form['feedback-type']]

        assembled_email = \
            create_message(target_email, request.form, user_system_data, timestamp=str(datetime.datetime.utcnow()))
        email_send_result = 'success'
        try:
            server = smtplib.SMTP(app.config['MAIL_SERVER'])
            server.send_message(assembled_email)
            server.quit()

        except Exception as e:
            print('error when sending feedback email ', e)
            email_send_result = 'fail'
        finally:
            return redirect(url_for('feedback_submitted', email_send_result=email_send_result))

    return render_template(
        'questions_comments.html',
        email_for_data_questions=email_for_data_questions,
        monitoring_location_url=referring_url,
        referring_page_type=referring_page_type
    )


@app.route('/feedback-submitted/<email_send_result>/')
def feedback_submitted(email_send_result):
    """Render a page that will show the user if the feedback email sent successfully."""
    return render_template(
        'feedback_submitted.html',
        email_send_result=email_send_result
    )


@app.route('/provisional-data-statement/')
def provisional_data_statement():
    """Render the provisional data statement page."""
    return render_template('provisional_data_statement.html')


@app.route('/iv-data-availability-statement/')
def iv_data_availability():
    """Render the IV data availability statement page."""
    return render_template('iv_data_availability_statement.html')


@app.route('/monitoring-location/<site_no>/', methods=['GET'])
def monitoring_location(site_no):
    """
    Monitoring Location view

    :param site_no: USGS site number

    """
    agency_cd = request.args.get('agency_cd', '')
    site_status, site_status_reason, site_data = site_service.get_site_data(site_no, agency_cd)
    json_ld = None

    if site_status == 200:
        template = 'monitoring_location.html'
        context = {
            'status_code': site_status,
            'stations': site_data,
            'STATION_FIELDS_D': STATION_FIELDS_D
        }

        if len(site_data) == 1:
            unique_site = site_data[0]

            _, _, period_of_record = site_service.get_period_of_record(site_no, agency_cd)
            iv_period_of_record = get_period_of_record_by_parm_cd(period_of_record, 'uv')
            gw_period_of_record = get_period_of_record_by_parm_cd(period_of_record, 'gw') if app.config[
                'GROUNDWATER_LEVELS_ENABLED'] else {}
            site_dataseries = [
                get_disambiguated_values(
                    param_datum,
                    app.config['NWIS_CODE_LOOKUP'],
                    {},
                    app.config['HUC_LOOKUP']
                )
                for param_datum in period_of_record
            ]
            grouped_dataseries = rollup_dataseries(site_dataseries)
            available_parameter_codes = set(param_datum['parm_cd'] for param_datum in period_of_record)
            available_data_types = set(param_datum['data_type_cd'] for param_datum in period_of_record)

            json_ld = build_linked_data(
                site_no,
                unique_site.get('station_nm'),
                unique_site.get('agency_cd'),
                unique_site.get('dec_lat_va', ''),
                unique_site.get('dec_long_va', ''),
                available_parameter_codes
            )
            location_with_values = get_disambiguated_values(
                unique_site,
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

            cooperators = sifta_service.get_cooperators(site_no)

            if site_owner_state is not None:
                email_for_data_questions = \
                    app.config['EMAIL_TARGET']['contact'].format(state_district_code=site_owner_state.lower())
            else:
                email_for_data_questions = app.config['EMAIL_TARGET']['report']

            # Get the time zone for the location
            time_zone = time_zone_service.get_iana_time_zone(unique_site.get('dec_lat_va', ''), unique_site.get('dec_long_va', ''))

            context = {
                'status_code': site_status,
                'stations': site_data,
                'location_with_values': location_with_values,
                'STATION_FIELDS_D': STATION_FIELDS_D,
                'json_ld': Markup(json.dumps(json_ld, indent=4)),
                'available_data_types': available_data_types,
                'time_zone': time_zone if time_zone else 'local',
                'iv_period_of_record': iv_period_of_record,
                'gw_period_of_record': gw_period_of_record,
                'default_parameter_code': get_default_parameter_code(iv_period_of_record, gw_period_of_record),
                'parm_grp_summary': grouped_dataseries,
                'cooperators': cooperators,
                'email_for_data_questions': email_for_data_questions,
                'referring_page_type': 'monitoring',
                'cameras': get_monitoring_location_camera_details(site_no) if app.config[
                    'MONITORING_LOCATION_CAMERA_ENABLED'] else []
            }

        http_code = 200
    elif 400 <= site_status < 500:
        template = 'monitoring_location.html'
        context = {'status_code': site_status, 'reason': site_status_reason}
        http_code = 200
    elif 500 <= site_status <= 511:
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


def return_404():
    """View for 404 pages"""
    return abort(404)


@app.route('/hydrological-unit/', defaults={'huc_cd': None}, methods=['GET'])
@app.route('/hydrological-unit/<huc_cd>/', methods=['GET'])
@defined_when(app.config['HYDROLOGIC_PAGES_ENABLED'], return_404)
def hydrological_unit(huc_cd, show_locations=False):
    """
    Hydrological unit view
    :param str huc_cd: ID for this unit
    :param bool show_locations:
    """

    # Get the data corresponding to this HUC
    monitoring_locations = []
    if huc_cd:
        huc = app.config['HUC_LOOKUP']['hucs'].get(huc_cd, None)
        # If this is a HUC8 site, get the monitoring locations within it.
        if huc and show_locations:
            _, _, monitoring_locations = site_service.get_huc_sites(huc_cd)

    # If we don't have a HUC, display all the root HUC2 units as children.
    else:
        huc = {
            'huc_nm': 'HUC2',
            'children': app.config['HUC_LOOKUP']['classes']['HUC2']
        }

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
    Networks view
    :param network_cd: ID for this network or empty to show all networks
    """
    # Grab the Network info
    network_data = monitoring_location_network_service.get_networks(network_cd)

    if network_data:
        if network_cd:
            collection = network_data
            extent = network_data['extent']['spatial']['bbox'][0]
            narrative = markdown(network_data['properties']['narrative'])\
                if network_data['properties'].get('narrative') else None
        else:
            collection = network_data.get('collections')
            extent = None
            narrative = None
    else:
        collection = None
        extent = None
        narrative = None

    http_code = 200 if collection else 404

    return render_template(
        'networks.html',
        http_code=http_code,
        network_cd=network_cd,
        collection=collection,
        extent=extent,
        narrative=narrative,
        email_for_data_questions=app.config['EMAIL_TARGET']['report'],
        referring_page_type='network'
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
    :param bool show_locations:
    """

    monitoring_locations = []
    political_unit = {}
    # Get the data associated with this county
    if state_cd and county_cd:
        state_county_cd = state_cd + county_cd
        political_unit = app.config['COUNTRY_STATE_COUNTY_LOOKUP']['US']['state_cd'].get(state_cd, None)['county_cd']\
            .get(county_cd, None)
        if show_locations:
            _, _, monitoring_locations = site_service.get_county_sites(state_county_cd)

    # Get the data corresponding to this state
    elif state_cd and not county_cd:
        political_unit = app.config['COUNTRY_STATE_COUNTY_LOOKUP']['US']['state_cd'].get(state_cd, None)

    # If no state and or state and county code is available, display list of states.
    elif not state_cd and not county_cd:
        political_unit = {
            'name': 'United States',
            'children': app.config['COUNTRY_STATE_COUNTY_LOOKUP']['US']['state_cd']
        }

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
