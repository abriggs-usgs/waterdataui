"""
Application configuration settings.
"""

# pylint: disable=line-too-long

import logging
import os

PROJECT_HOME = os.path.dirname(__file__)

# FEATURE FLAGS
HYDROLOGIC_PAGES_ENABLED = True
STATE_COUNTY_PAGES_ENABLED = True
EMBED_IMAGE_FEATURE_ENABLED = True
MONITORING_LOCATION_CAMERA_ENABLED = True
DAILY_VALUE_HYDROGRAPH_ENABLED = True
SET_COOKIE_TO_HIDE_BANNER_NOTICES = True  # set cookie set to hide banner messages for the life of the cookie
GROUNDWATER_LEVELS_ENABLED = True
DEBUG = False

SITE_DATA_ENDPOINT = 'https://waterservices.usgs.gov/nwis/site' #Only used server side so does not need to be a public URL
PUBLIC_SITE_DATA_ENDPOINT = 'https://waterservices.usgs.gov/nwis/site'
IV_DATA_ENDPOINT = 'https://waterservices.usgs.gov/nwis/iv'
HISTORICAL_IV_DATA_ENDPOINT = 'https://nwis.waterservices.usgs.gov/nwis/iv'
STATISTICS_ENDPOINT = 'https://waterservices.usgs.gov/nwis/stat'
GROUNDWATER_LEVELS_ENDPOINT = 'https://waterservices.usgs.gov/nwis/gwlevels/'
MONITORING_LOCATIONS_OBSERVATIONS_ENDPOINT = 'https://labs.waterdata.usgs.gov/api/observations/collections/'

NWISWEB_ENDPOINTS = {
    'INVENTORY': 'https://waterdata.usgs.gov/nwis/inventory',
    'UV': 'https://waterdata.usgs.gov/nwis/uv'
}

WEATHER_SERVICE_ENDPOINT = 'https://api.weather.gov'
# For SIFTA cooperator site service - gives us the information needed to show the cooperator logos
COOPERATOR_SERVICE_ENDPOINT = 'https://water.usgs.gov/customer/stories/'


FIM_GIS_ENDPOINT = 'https://gis.wim.usgs.gov/arcgis/rest/services/FIMMapper/'
FIM_ENDPOINT = 'https://fim.wim.usgs.gov/fim/'
HYDRO_ENDPOINT = 'https://tiles.arcgis.com/tiles/P3ePLMYs2RVChkJx/arcgis/rest/services/Esri_Hydro_Reference_Overlay/MapServer'

CITIES_ENDPOINT = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Major_Cities/FeatureServer/0'

NLDI_SERVICES_ENDPOINT = 'https://labs.waterdata.usgs.gov/api/nldi/linked-data'
NLDI_SERVICES_DISTANCE = '322'

# Waterwatch
WATERWATCH_ENDPOINT = 'https://waterwatch.usgs.gov/webservices'

# WaterAlert
WATERALERT_SUBSCRIPTION = 'https://water.usgs.gov/wateralert/subscribe2'

# Graph Server
GRAPH_SERVER_ENDPOINT = 'https://labs.waterdata.usgs.gov/api/graph-images'

# The National Map Basemaps
TNM_USGS_TOPO_ENDPOINT = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer'
TNM_USGS_IMAGERY_ONLY_ENDPOINT = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer'
TNM_USGS_IMAGERY_TOPO_ENDPOINT = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer'
TNM_HYDRO_ENDPOINT = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer'

MONITORING_LOCATION_CAMERA_ENDPOINT = 'https://apps.usgs.gov/sstl/'

LOGGING_ENABLED = True
LOGGING_DIRECTORY = None
LOGGING_LEVEL = logging.WARNING

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
NWIS_CODE_LOOKUP_FILENAME = 'nwis_lookup.json'
COUNTRY_STATE_COUNTY_LOOKUP_FILENAME = 'nwis_country_state_lookup.json'
HUC_LOOKUP_FILENAME = 'huc_lookup.json'

GA_TRACKING_CODE = ''
ENABLE_USGS_GA = False

# To use hashed assets, set this to the gulp-rev-all rev-manifest.json path
ASSET_MANIFEST_PATH = None

# These messages below will be added to a dismissible panel below the main header. It is an array of strings. Markup
# can be used to add things like links, bold text, etc.
BANNER_NOTICES = []

# set this if running in a container
if os.getenv('CONTAINER_RUN', False):
    STATIC_ROOT = os.environ.get('STATIC_ROOT', '/static/')

# Mail settings for feedback form
MAIL_SERVER = 'smtp.usgs.gov'
EMAIL_TARGET = {
    'contact' : 'gs-w-{state_district_code}_NWISWeb_Data_Inquiries@usgs.gov',
    'report': 'gs-w_support_nwisweb@usgs.gov',
    'comment': 'WDFN@usgs.gov'
}
