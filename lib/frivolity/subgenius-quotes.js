'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (logger) {
  return (0, _nodeFetch2.default)('http://colonpipe.org/dobbs.json').then(x => {
    logger.notice('quotes retrieved', x);
    return x;
  }).then(x => x.json());
};

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mcml2b2xpdHkvc3ViZ2VuaXVzLXF1b3Rlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7a0JBQ2UsVUFBUyxNQUFNLEVBQUU7QUFDOUIsU0FBTyx5QkFBTSxpQ0FBaUMsQ0FBQyxDQUM5QyxJQUFJLENBQUMsQUFBQyxDQUFDLElBQUs7QUFDWCxVQUFNLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLFdBQU8sQ0FBQyxDQUFDO0dBQ1YsQ0FBQyxDQUNELElBQUksQ0FBQyxBQUFDLENBQUMsSUFBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztDQUN4QiIsImZpbGUiOiJzdWJnZW5pdXMtcXVvdGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZldGNoIGZyb20gJ25vZGUtZmV0Y2gnO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obG9nZ2VyKSB7XG4gIHJldHVybiBmZXRjaCgnaHR0cDovL2NvbG9ucGlwZS5vcmcvZG9iYnMuanNvbicpXG4gIC50aGVuKCh4KSA9PiB7XG4gICAgbG9nZ2VyLm5vdGljZSgncXVvdGVzIHJldHJpZXZlZCcsIHgpO1xuICAgIHJldHVybiB4O1xuICB9KVxuICAudGhlbigoeCkgPT4geC5qc29uKCkpO1xufVxuIl19