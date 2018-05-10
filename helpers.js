var exports = module.exports;


function randInt(min, max) {
  return (Math.floor(Math.random() * (max - min + 1)) + min);
}
exports.randInt = randInt;

function distance(ax, ay, bx, by) {
  return (Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2)));
}
exports.distance = distance;