SpectralWorkbench.Image = Class.extend({

  init: function(_graph, options) {

    var image = this;

    image.options = options || {};
    image.options.selector = image.options.selector || 'div.swb-spectrum-img-container';

    // test if we're inside a require()
    // http://www.timetler.com/2012/10/13/environment-detection-in-javascript/
    var nodejs = typeof exports !== 'undefined' && this.exports !== exports;

    if (nodejs) {
      var Canvas = require('canvas');
      image.obj    = new Canvas.Image();
    } else {
      image.obj    = new Image();
    }


    if (!nodejs) {

      image.container = $(image.options.selector);
      image.el = image.container.find('img');

    }

    image.lineEl = false; // the line indicating the cross-section
    image.currentCoords = { x1: 0, y1: 0, x2: 0, y2: 0 };

    image.obj.onload = function() {

      image.graph = _graph;
      image.width = image.obj.width;
      image.height = image.obj.height;

      if (nodejs) {

        var Canvas = require('canvas'),
             Image = Canvas.Image,
             canvas = new Canvas(image.width, image.height);

        image.ctx = canvas.getContext('2d');

      } else {

        // We're in a browser; build a canvas element, but hide it.
        $('body').append('<canvas id="spectral-workbench-canvas" style="display:none;"></canvas>;');
        image.canvasEl = $('canvas#spectral-workbench-canvas:last');
        image.canvasEl.width(image.width);
        image.canvasEl.height(image.height);
        image.ctx = image.canvasEl[0].getContext("2d");

      }

      image.ctx.canvas.width = image.width;
      image.ctx.canvas.height = image.height;
      image.ctx.drawImage(image.obj, 0, 0, image.width, image.height);

      if (image.options.sample_row) image.setLine(image.options.sample_row);

      if (image.options.onLoad) image.options.onLoad(image); // since image loading is asynchronous

    }

    var src = image.options.url || image.el.attr('src');

    if (src) image.obj.src = src;
    else {

      // If there's no image, whether grabbed from the element
      // or supplied, just trigger onLoad callback already
      if (image.options.hasOwnProperty('onLoad')) image.options.onLoad(image);

    }

    /* ======================================
     * Returns a array of pixel brightnesses in [r,g,b,a] format, 
     * values from 0-255
     */
    image.getPoint = function(x,y) {

      return image.ctx.getImageData(x, y, 1, 1).data;

    }


    /* ======================================
     * Returns a nested array of pixels, each in the format of getPoint(), 
     * values from 0-255
     */
    image.getLine = function(y) {

      var output = [],
          input  = image.ctx.getImageData(0, y, image.width, 1).data;

      for (var i = 0; i < input.length; i += 4) {
        output.push([ input[i],
                      input[i+1],
                      input[i+2],
                      input[i+3] ]);
      }

      return output;

    }


    /* ======================================
     * Returns a nested array of pixels along a line between (x1, y1) and (x2, y2),
     * each in the format of getPoint(), values from 0-255.
     * Coordinates are in image pixels.
     */
    image.getLineData = function(x1, y1, x2, y2) {

      var dx = x2 - x1,
          dy = y2 - y1,
          distance = Math.sqrt(dx * dx + dy * dy),
          steps = Math.round(distance),
          output = [],
          fullData = image.ctx.getImageData(0, 0, image.width, image.height).data;

      for (var i = 0; i <= steps; i++) {
        var t = steps === 0 ? 0 : i / steps;
        var x = Math.round(x1 + dx * t);
        var y = Math.round(y1 + dy * t);

        x = Math.max(0, Math.min(image.width - 1, x));
        y = Math.max(0, Math.min(image.height - 1, y));

        var index = (y * image.width + x) * 4;
        output.push([
          fullData[index],
          fullData[index + 1],
          fullData[index + 2],
          fullData[index + 3]
        ]);
      }

      return output;

    }


    /* ======================================
     * Display a line on the image
     * (used for showing the image cross section)
     */
    image.setupLine = function() {

      if (_graph) {

        var height = image.container.height() || 100;
        var svg = '<svg class="section-line-svg" style="position:absolute;top:0;left:0;width:100%;height:' + height + 'px;pointer-events:none;z-index:10;">' +
                  '  <line class="section-line" x1="0" y1="0" x2="100%" y2="0" stroke="rgba(255,255,255,0.8)" stroke-width="2" />' +
                  '  <text class="section-line-text" x="100%" y="0" dy="-5" text-anchor="end" fill="rgba(255,255,255,0.8)" style="font-size:9px;"></text>' +
                  '  <circle class="handle handle-1" cx="0" cy="0" r="7" fill="rgba(255,0,0,0.7)" style="pointer-events:all; cursor:move; display:none;" />' +
                  '  <circle class="handle handle-2" cx="100%" cy="0" r="7" fill="rgba(255,0,0,0.7)" style="pointer-events:all; cursor:move; display:none;" />' +
                  '</svg>';
        image.el.before($(svg));
        image.lineSvgEl = image.container.find('.section-line-svg');
        image.lineEl = image.lineSvgEl.find('.section-line');
        image.lineTextEl = image.lineSvgEl.find('.section-line-text');
        image.handle1 = image.lineSvgEl.find('.handle-1');
        image.handle2 = image.lineSvgEl.find('.handle-2');

        if (typeof d3 !== 'undefined' && d3.behavior && d3.behavior.drag) {
          var drag = d3.behavior.drag()
            .on("drag", function() {
              var isHandle1 = d3.select(this).classed('handle-1');

              var containerWidth = image.lineSvgEl.width();
              var containerHeight = image.lineSvgEl.height();
              var newX = Math.max(0, Math.min(containerWidth, d3.event.x));
              var newY = Math.max(0, Math.min(containerHeight, d3.event.y));

              var imgX = (newX / containerWidth) * image.width;
              var imgY = (newY / containerHeight) * image.height;

              if (isHandle1) {
                image.currentCoords.x1 = imgX;
                image.currentCoords.y1 = imgY;
              } else {
                image.currentCoords.x2 = imgX;
                image.currentCoords.y2 = imgY;
              }

              image.setLine(image.currentCoords.x1, image.currentCoords.y1, image.currentCoords.x2, image.currentCoords.y2);

              if (image.onLineChange) {
                image.onLineChange(image.currentCoords);
              }
            });

          d3.selectAll(image.handle1.toArray()).call(drag);
          d3.selectAll(image.handle2.toArray()).call(drag);
        }

      }

    }


    /* ======================================
     * Display a line on the image between (x1, y1) and (x2, y2)
     * in image pixels. Backward compatibility: if only one arg y is passed,
     * it displays a horizontal line at that y.
     */
    image.setLine = function(x1, y1, x2, y2) {

      if (!image.lineEl) image.setupLine();

      if (arguments.length === 1) {
        var y = x1;
        x1 = 0;
        y1 = y;
        x2 = image.width;
        y2 = y;
      }

      image.currentCoords = { x1: x1, y1: y1, x2: x2, y2: y2 };

      var displayX1 = (x1 / image.width) * 100 + '%',
          displayY1 = (y1 / image.height) * 100,
          displayX2 = (x2 / image.width) * 100 + '%',
          displayY2 = (y2 / image.height) * 100;

      image.lineEl.attr('x1', displayX1)
                  .attr('y1', displayY1)
                  .attr('x2', displayX2)
                  .attr('y2', displayY2);

      image.handle1.attr('cx', displayX1)
                   .attr('cy', displayY1);
      image.handle2.attr('cx', displayX2)
                   .attr('cy', displayY2);

      if (displayY1 > 20) {
        image.lineTextEl.text('GRAPHED CROSS SECTION');
        image.lineTextEl.attr('x', displayX2)
                        .attr('y', displayY2)
                        .attr('dy', -5);
      } else {
        image.lineTextEl.text('');
      }

      return image.lineEl;

    }


    /* ======================================
     * Show draggable handles for the cross section line
     */
    image.showHandles = function() {
      if (!image.lineEl) image.setupLine();
      image.handle1.show();
      image.handle2.show();
    }


    /* ======================================
     * Hide draggable handles for the cross section line
     */
    image.hideHandles = function() {
      if (image.handle1) {
        image.handle1.hide();
        image.handle2.hide();
      }
    }


    /* ======================================
     * Executes callback(x, y, e) when image is clicked
     * adjusted to actual pixels in original raw image
     */
    image.click = function(callback) {

      image.el.click(function(e){

        var x = Math.round((e.offsetX / image.el.width())  * image.width),
            y = Math.round((e.offsetY / image.el.height()) * image.height);

        callback(x, y, e);

      });

    }


    /* ======================================
     * Deletes click listeners
     */
    image.clickOff = function() {

      image.el.off('click');

    }


    /* ======================================
     * Resizes image elements; called in Graph.updateSize()
     */
    image.updateSize = function() {

      // OK, due to issue https://github.com/publiclab/spectral-workbench/issues/240, 
      // we are getting aggressively empirical here and adding "_graph.extraPadding" to fix things
      // but essentially it seems there's a difference between reported d3 chart display width and actual 
      // measurable DOM width, so we adjust the displayed image with extraPadding.
      var height = 100;
      if (image.lineSvgEl && image.lineSvgEl.is(':visible')) height = 180; // keep height if handles are shown

      image.container.width(_graph.width)
                            .height(height);

      if (image.lineSvgEl) image.lineSvgEl.height(height);

      if (!_graph.embed) image.container.css('margin-left',  _graph.margin.left);
      else               image.container.css('margin-left',  _graph.margin.left);
                         // .css('margin-right', _graph.margin.right); // margin not required on image, for some reason


      if (_graph.range && _graph.datum) {

        if (_graph.datum.isCalibrated()) {

          // amount to mask out of image if there's a range tag;
          // this is measured in nanometers:
          _graph.leftCrop =   _graph.extent[0] - _graph.datum.json.data.lines[0].wavelength;
          _graph.rightCrop = -_graph.extent[1] + _graph.datum.json.data.lines[_graph.datum.json.data.lines.length - 1].wavelength;
          // note, we must use extent here instead of range, as range may extend beyond limit of data;
          // although we could alternately set the chart extent to include empty space

          _graph.pxPerNm = (_graph.width) / (_graph.extent[1] - _graph.extent[0]);
         
          _graph.leftCrop  *= _graph.pxPerNm;
          _graph.rightCrop *= _graph.pxPerNm;

        } else {

          // for uncalibrated, we still allow range, in case someone's doing purely comparative work:
          _graph.leftCrop =   _graph.extent[0] - _graph.datum.json.data.lines[0].pixel;
          _graph.rightCrop = -_graph.extent[1] + _graph.datum.json.data.lines[_graph.datum.json.data.lines.length - 1].pixel;
         
          _graph.pxPerNm = 1; // a lie, but as there are no nanometers in an uncalibrated spectrum, i guess it's OK.

        }

        image.el.width(_graph.width + _graph.leftCrop + _graph.rightCrop) // left and rightCrop are masked out range
                       .css('max-width', 'none')
                       .css('margin-left', -_graph.leftCrop);

      } else {

        image.el.width(_graph.width)
                       .height(100)
                       .css('max-width', 'none')
                       .css('margin-left', 0);

      }

    }


  }

});
