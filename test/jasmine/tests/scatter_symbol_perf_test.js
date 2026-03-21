'use strict';

var Plotly = require('../../../lib/index');
var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var d3Select = require('../../strict-d3').select;
var d3SelectAll = require('../../strict-d3').selectAll;

describe('Marker symbol performance', function() {
    var gd;

    beforeEach(function() { gd = createGraphDiv(); });
    afterEach(destroyGraphDiv);

    it('should use <symbol>+<use> with 1 symbol def for 1000 identical markers', function(done) {
        var N = 1000;
        var x = [], y = [];
        for(var i = 0; i < N; i++) { x.push(i); y.push(Math.sin(i / 50)); }

        Plotly.newPlot(gd, [{
            mode: 'markers',
            x: x, y: y,
            marker: { symbol: 'circle', size: 8 }
        }]).then(function() {
            var defs = d3Select(gd).select('defs');
            var symbolDefs = defs.selectAll('symbol[id^="plotly-sym-"]');
            expect(symbolDefs.size()).toBe(1, 'only 1 <symbol> definition');

            var useEls = d3Select(gd).selectAll('use.point');
            expect(useEls.size()).toBe(N, N + ' <use> elements');

            // No <path class="point"> should exist
            var pathPts = d3Select(gd).selectAll('path.point');
            expect(pathPts.size()).toBe(0, 'no <path> point elements');
        }).then(done, done.fail);
    });

    it('should produce small SVG with 10 distinct symbols over 1000 points', function(done) {
        var N = 1000;
        var symbols = ['circle', 'square', 'diamond', 'cross', 'x',
                       'triangle-up', 'triangle-down', 'pentagon', 'hexagon', 'star'];
        var x = [], y = [], sym = [];
        for(var i = 0; i < N; i++) {
            x.push(i); y.push(Math.sin(i / 50));
            sym.push(symbols[i % symbols.length]);
        }

        Plotly.newPlot(gd, [{
            mode: 'markers',
            x: x, y: y,
            marker: { symbol: sym, size: 10 }
        }]).then(function() {
            var svgEl = gd.querySelector('.main-svg');
            var svgStr = new XMLSerializer().serializeToString(svgEl);
            var byteSize = new Blob([svgStr]).size;

            // With <use>, 10 symbol defs + 1000 <use> refs should be much smaller
            // than 1000 full <path d="..."> elements
            expect(byteSize).toBeLessThan(400000, 'SVG byte size under 400KB');

            var symbolDefs = d3Select(gd).select('defs').selectAll('symbol[id^="plotly-sym-"]');
            expect(symbolDefs.size()).toBe(10, '10 <symbol> definitions');
        }).then(done, done.fail);
    });

    it('should re-render on marker size change without new symbol def', function(done) {
        var N = 1000;
        var x = [], y = [];
        for(var i = 0; i < N; i++) { x.push(i); y.push(Math.sin(i / 50)); }

        Plotly.newPlot(gd, [{
            mode: 'markers',
            x: x, y: y,
            marker: { symbol: 'square', size: 8 }
        }]).then(function() {
            // Capture current <use> href — it shouldn't change on resize
            var firstUse = gd.querySelector('use.point');
            var hrefBefore = firstUse.getAttribute('href') || firstUse.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            var scaleBefore = parseFloat(firstUse.getAttribute('data-scale'));

            return Plotly.restyle(gd, { 'marker.size': 16 }).then(function() {
                var firstUseAfter = gd.querySelector('use.point');
                var hrefAfter = firstUseAfter.getAttribute('href') || firstUseAfter.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                var scaleAfter = parseFloat(firstUseAfter.getAttribute('data-scale'));

                expect(hrefAfter).toBe(hrefBefore, 'href unchanged — no new symbol def needed');
                // Scale should have increased (size 16 → scale 0.8 vs size 8 → scale 0.4)
                expect(scaleAfter).toBeGreaterThan(scaleBefore + 0.001, 'scale increased after size restyle');
            });
        }).then(done, done.fail);
    });

    it('should apply vector-effect: non-scaling-stroke to <use> marker elements', function(done) {
        Plotly.newPlot(gd, [{
            mode: 'markers',
            x: [1, 2, 3], y: [1, 2, 3],
            marker: { symbol: 'circle', size: 20, line: { width: 2, color: 'red' } }
        }]).then(function() {
            var useEls = d3SelectAll(gd.querySelectorAll('use.point'));
            useEls.each(function() {
                var ve = this.style.vectorEffect || d3Select(this).style('vector-effect');
                expect(ve).toBe('non-scaling-stroke', 'non-scaling-stroke applied');
            });
        }).then(done, done.fail);
    });
});
