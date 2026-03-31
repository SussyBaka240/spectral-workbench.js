/**
 * SamplingLine class for SpectralWorkbench.js
 * Handles a draggable sampling line with two endpoints on an SVG overlay.
 */
function SamplingLine(containerSelector, imgWidth, imgHeight, onUpdate) {
  this.container = d3.select(containerSelector);
  this.imgWidth = imgWidth;
  this.imgHeight = imgHeight;
  this.onUpdate = onUpdate;
  this.points = []; // {x, y} in display coordinates
  this.isComplete = false;

  // Remove any existing sampling line SVG
  this.container.selectAll('.sampling-line-overlay').remove();

  this.svg = this.container.append('svg:svg')
    .attr('class', 'sampling-line-overlay')
    .style('position', 'absolute')
    .style('top', 0)
    .style('left', 0)
    .style('width', '100%')
    .style('height', '100%')
    .style('pointer-events', 'none');

  this.line = this.svg.append('svg:line')
    .attr('stroke', '#ffcc00')
    .attr('stroke-width', 2)
    .style('display', 'none')
    .style('pointer-events', 'auto')
    .style('cursor', 'move');

  this.p1 = this.svg.append('svg:circle')
    .attr('r', 6)
    .attr('fill', '#ffcc00')
    .attr('stroke', '#000')
    .attr('stroke-width', 1)
    .style('display', 'none')
    .style('pointer-events', 'auto')
    .style('cursor', 'move');

  this.p2 = this.svg.append('svg:circle')
    .attr('r', 6)
    .attr('fill', '#ffcc00')
    .attr('stroke', '#000')
    .attr('stroke-width', 1)
    .style('display', 'none')
    .style('pointer-events', 'auto')
    .style('cursor', 'move');

  var self = this;

  // Drag behavior for endpoints
  var dragPoint = d3.behavior.drag()
    .on('drag', function() {
      var circle = d3.select(this);
      var x = d3.event.x;
      var y = d3.event.y;

      // Get container dimensions for constraints
      var node = self.container.node();
      var width = node.clientWidth;
      var height = node.clientHeight;

      x = Math.max(0, Math.min(x, width));
      y = Math.max(0, Math.min(y, height));

      circle.attr('cx', x).attr('cy', y);
      self.updateLineFromPoints();
      if (self.onUpdate) self.onUpdate(self.getOriginalCoords());
    });

  this.p1.call(dragPoint);
  this.p2.call(dragPoint);

  // Stop propagation on drag start for points too
  dragPoint.on('dragstart', function() {
    d3.event.sourceEvent.stopPropagation();
  });

  // Drag behavior for the line
  var dragLine = d3.behavior.drag()
    .on('dragstart', function() {
      d3.event.sourceEvent.stopPropagation();
    })
    .on('drag', function() {
      var dx = d3.event.dx;
      var dy = d3.event.dy;

      var x1 = parseFloat(self.p1.attr('cx')) + dx;
      var y1 = parseFloat(self.p1.attr('cy')) + dy;
      var x2 = parseFloat(self.p2.attr('cx')) + dx;
      var y2 = parseFloat(self.p2.attr('cy')) + dy;

      var node = self.container.node();
      var width = node.clientWidth;
      var height = node.clientHeight;

      // Simple constraint: don't move if any point goes out of bounds
      if (x1 >= 0 && x1 <= width && y1 >= 0 && y1 <= height &&
          x2 >= 0 && x2 <= width && y2 >= 0 && y2 <= height) {
        self.p1.attr('cx', x1).attr('cy', y1);
        self.p2.attr('cx', x2).attr('cy', y2);
        self.updateLineFromPoints();
        if (self.onUpdate) self.onUpdate(self.getOriginalCoords());
      }
    });

  this.line.call(dragLine);
}

SamplingLine.prototype.addPoint = function(x, y) {
  if (this.points.length >= 2) return;

  this.points.push({x: x, y: y});

  if (this.points.length === 1) {
    this.p1.attr('cx', x).attr('cy', y).style('display', 'block');
  } else if (this.points.length === 2) {
    this.p2.attr('cx', x).attr('cy', y).style('display', 'block');
    this.line.style('display', 'block');
    this.updateLineFromPoints();
    this.isComplete = true;
    if (this.onUpdate) this.onUpdate(this.getOriginalCoords());
  }
};

SamplingLine.prototype.updateLineFromPoints = function() {
  this.line
    .attr('x1', this.p1.attr('cx'))
    .attr('y1', this.p1.attr('cy'))
    .attr('x2', this.p2.attr('cx'))
    .attr('y2', this.p2.attr('cy'));
};

SamplingLine.prototype.getOriginalCoords = function() {
  if (!this.isComplete) return null;

  var node = this.container.node();
  var displayWidth = node.clientWidth;
  var displayHeight = node.clientHeight;

  var scaleX = this.imgWidth / displayWidth;
  var scaleY = this.imgHeight / displayHeight;

  return {
    x1: parseFloat(this.p1.attr('cx')) * scaleX,
    y1: parseFloat(this.p1.attr('cy')) * scaleY,
    x2: parseFloat(this.p2.attr('cx')) * scaleX,
    y2: parseFloat(this.p2.attr('cy')) * scaleY
  };
};

SamplingLine.prototype.reset = function() {
  this.points = [];
  this.isComplete = false;
  this.p1.style('display', 'none');
  this.p2.style('display', 'none');
  this.line.style('display', 'none');
};
