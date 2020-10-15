/**
 * Rollup configuration.
 * NOTE: This is a CommonJS module so it can be imported by Karma.
 */
const path = require('path');

const alias = require('@rollup/plugin-alias');
const buble = require('@rollup/plugin-buble');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const resolve = require('@rollup/plugin-node-resolve');
const replace = require('@rollup/plugin-replace');
const {uglify} = require('rollup-plugin-uglify');


const env = process.env.NODE_ENV || 'development';

const getBundleConfig = function(src, dest) {

    const configMap = {
        input: src,
        plugins: [
        alias({
            entries: [{
                find: 'ui', replacement: path.resolve(__dirname, 'src/scripts')
            },{
                find: 'ml', replacement: path.resolve(__dirname, 'src/scripts/monitoring-location')
            },{
                find: 'network', replacement: path.resolve(__dirname, 'src/scripts/network')
            },{
                find: 'leaflet', replacement: path.resolve(__dirname, 'src/scripts/leaflet')
            },{
                find: 'webservices', replacement: path.resolve(__dirname, 'src/scripts/web-services')
            },{
                find: 'lib', replacement: path.resolve(__dirname, 'src/scripts/lib')
            },{
                find:'d3rendering', replacement: path.resolve(__dirname, 'src/scripts/d3-rendering')
            },{
                find: 'dvhydrograph', replacement: path.resolve(__dirname, 'src/scripts/monitoring-location/components/daily-value-hydrograph')
            },{
                find: 'ivhydrograph', replacement: path.resolve(__dirname, 'src/scripts/monitoring-location/components/hydrograph')
            }],
            customResolver: resolve.nodeResolve({
                extensions: ['.js', '.json']
            })
        }),
            resolve.nodeResolve({
                mainFields: ['module', 'jsnext', 'main']
            }),
            json(),
            commonjs({
                exclude: [
                    'node_modules/symbol-observable/es/index.js'
                ]
            }),
            buble({
                objectAssign: 'Object.assign',
                transforms: {
                    dangerousForOf: true
                }
            }),
            replace({
                'process.env.NODE_ENV': JSON.stringify(env)
            }),
            env === 'production' && uglify({
                compress: {
                    dead_code: true,
                    drop_console: true
                }
            })
        ],
        watch: {
            chokidar: false
        },
        output: {
            name: 'wdfn',
            file:  dest,
            format: 'iife',
            sourcemap: env !== 'production'
        },
        treeshake: env === 'production'
    };

    if (src == 'src/scripts/network/index.js'){
        configMap['external'] = {
           window: 'window'
        };
    }

    return configMap;
};

module.exports = [
    getBundleConfig('src/scripts/monitoring-location/index.js', 'dist/bundle.js'),
    getBundleConfig('src/scripts/network/index.js', 'dist/network-bundle.js')
];


