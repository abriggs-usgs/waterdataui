import {line as d3Line} from 'd3-shape';

/*
 * Draws the flood lines
 */
export const drawFloodLevelLines = function(elem, {visible, xscale, yscale, floodLevels}) {
    elem.select('#flood-level-points').remove();
    const container = elem.append('g')
        .lower()
        .attr('id', 'flood-level-points');

    if (!visible) {
        return;
    }

    const xRange = xscale.range();
    const [yStart, yEnd] = yscale.domain();
    floodLevels.forEach((level) => {
        if (level.value >= yStart && level.value <= yEnd) {
            const group = container.append('g');
            const yRange = yscale(level.value);
            const floodLine = d3Line()([[xRange[0], yRange], [xRange[1], yRange]]);
            group.append('path')
                .classed('waterwatch-data-series', true)
                .classed(level.class, true)
                .attr('d', floodLine);
        }
    });
};