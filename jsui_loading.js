/*

360 dial

arguments: fgred fggreen fgblue bgred bggreen bgblue dialred dialgreen dialblue

*/

sketch.default2d();
var val = 0;
var vbrgb = [1, 1, 1, 1];
var vfrgb = [0.5, 0.5, 0.5, 1];
var vrgb2 = [0.7, 0.7, 0.7, 1];
var last_x = 0;
var last_y = 0;
var loading = false;
var frame_interval = 100;

var rotateTask = new Task(rotate);

// process arguments
if (jsarguments.length > 1) vfrgb[0] = jsarguments[1] / 255;
if (jsarguments.length > 2) vfrgb[1] = jsarguments[2] / 255;
if (jsarguments.length > 3) vfrgb[2] = jsarguments[3] / 255;
if (jsarguments.length > 4) vbrgb[0] = jsarguments[4] / 255;
if (jsarguments.length > 5) vbrgb[1] = jsarguments[5] / 255;
if (jsarguments.length > 6) vbrgb[2] = jsarguments[6] / 255;
if (jsarguments.length > 7) vrgb2[0] = jsarguments[7] / 255;
if (jsarguments.length > 8) vrgb2[1] = jsarguments[8] / 255;
if (jsarguments.length > 9) vrgb2[2] = jsarguments[9] / 255;

rotateTask.interval = frame_interval;
rotateTask.repeat();
draw();

function draw() {
  var theta;

  with (sketch) {
    // erase background
    glclearcolor(vbrgb);
    glclear();
    moveto(0, 0);
    // fill bgcircle
    if (loading) {
      shapeslice(180, 1);
      glcolor(vrgb2);
      circle(0.8);
      // fill marker circle
      shapeslice(90, 1);
      glcolor(vfrgb);
      theta = (0.75 - val) * 2 * Math.PI;
      moveto(0.5 * Math.cos(theta), 0.5 * Math.sin(theta));
      circle(0.2);
    } else {
      glcolor(0, 180, 0);
      font("Sans Serif");
      fontsize(40);
      textalign("center", "center");
      text("✓");
    }
  }
}

function bang() {
  draw();
  refresh();
  outlet(0, val);
}

function msg_float(v) {
  val = v % 1;
  if (val < 0) val = 1 + val;
  notifyclients();
  bang();
}

function set(v) {
  val = v % 1;
  if (val < 0) val = 1 + val;
  notifyclients();
  draw();
  refresh();
}

function fsaa(v) {
  sketch.fsaa = v;
  bang();
}

function frgb(r, g, b) {
  vfrgb[0] = r / 255;
  vfrgb[1] = g / 255;
  vfrgb[2] = b / 255;
  draw();
  refresh();
}

function rgb2(r, g, b) {
  vrgb2[0] = r / 255;
  vrgb2[1] = g / 255;
  vrgb2[2] = b / 255;
  draw();
  refresh();
}

function brgb(r, g, b) {
  vbrgb[0] = r / 255;
  vbrgb[1] = g / 255;
  vbrgb[2] = b / 255;
  draw();
  refresh();
}

function setloading(status) {
  if (status) {
    loading = true;
  } else {
    loading = false;
  }
}

function getvalueof() {
  return val;
}

function forcesize(w, h) {
  if (w != h) {
    h = w;
    box.size(w, h);
  }
}
forcesize.local = 1; //private

function onresize(w, h) {
  forcesize(w, h);
  draw();
  refresh();
}
onresize.local = 1; //private

function rotate() {
  msg_float(val + 0.1);
  draw();
  refresh();
}
rotate.local = 1; //private
