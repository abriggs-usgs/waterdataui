"""
Main application views.
"""
import json

from flask import render_template, request, Markup

from . import app, __version__
from .location_utils import get_capabilities, build_linked_data, get_disambiguated_values
from .utils import execute_get_request, parse_rdb

# Station Fields Mapping to Descriptions
from .constants import STATION_FIELDS_D

SERVICE_ROOT = app.config['SERVICE_ROOT']


@app.route('/')
def home():
    """Render the home page."""
    return render_template('index.html', version=__version__)


@app.route('/monitoring-location/<site_no>', methods=['GET'])
def monitoring_location(site_no):
    """
    Monitoring Location view

    :param site_no: USGS site number

    """
    agency_cd = request.args.get('agency_cd')

    resp = execute_get_request(SERVICE_ROOT,
                               path='/nwis/site/',
                               params={'site': site_no,
                                       'agencyCd': agency_cd,
                                       'siteOutput': 'expanded',
                                       'format': 'rdb'
                                      }
                              )
    status = resp.status_code
    if status == 200:
        iter_data = parse_rdb(resp.iter_lines(decode_unicode=True))

        data_list = list(iter_data)

        template = 'monitoring_location.html'

        station_nm = ''
        site_no = ''

        context = {'status_code': status,
                   'station': data_list,
                   'station_nm': station_nm,
                   'site_no': site_no,
                   'STATION_FIELDS_D': STATION_FIELDS_D}

        if len(data_list) == 1:
            station_nm = data_list[0]['station_nm']
            site_no = data_list[0]['site_no']

            station_record = data_list[0]
            parameter_data_resp = execute_get_request(SERVICE_ROOT,
                                                      path='/nwis/site/',
                                                      params={'format': 'rdb',
                                                              'sites': site_no,
                                                              'seriesCatalogOutput': True,
                                                              'siteStatus': 'all',
                                                              'agencyCd': agency_cd
                                                             }
                                                     )

            if parameter_data_resp.status_code == 200:
                param_data = parse_rdb(parameter_data_resp.iter_lines(decode_unicode=True))

                location_capabilities = get_capabilities(param_data)
                json_ld = build_linked_data(site_no,
                                            station_record.get('station_nm'),
                                            station_record.get('agency_cd'),
                                            station_record.get('dec_lat_va', ''),
                                            station_record.get('dec_long_va', ''),
                                            location_capabilities
                                           )
                safe_json_ld = Markup(json.dumps(json_ld, indent=4))

            else:
                safe_json_ld = None

            context = {
                'status_code': status,
                'station': data_list,
                'station_nm': station_nm,
                'site_no': site_no,
                'location_with_values': get_disambiguated_values(
                    station_record,
                    app.config['NWIS_CODE_LOOKUP'],
                    app.config['COUNTRY_STATE_COUNTY_LOOKUP']
                ),
                'STATION_FIELDS_D': STATION_FIELDS_D,
                'json_ld': safe_json_ld
            }

        http_code = 200

    elif 400 <= status < 500:
        template = 'monitoring_location.html'
        context = {'status_code': status, 'reason': resp.reason}
        http_code = 200
    elif 500 <= status <= 511:
        template = 'errors/500.html'
        context = {}
        http_code = 503
    else:
        template = 'errors/500.html'
        context = {}
        http_code = 500
    return render_template(template, **context), http_code
