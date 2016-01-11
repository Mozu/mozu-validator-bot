'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = NpmClient;

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _rx = require('rx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function NpmClient(_ref) {
  let npm = _ref.npm;

  return {
    getStatus(packageName) {
      return _rx.Observable.fromPromise((0, _nodeFetch2.default)(npm.registry + packageName).then(res => res.json()).catch(() => false));
    }
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ucG0tY2xpZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O2tCQUV3QixTQUFTOzs7Ozs7Ozs7O0FBQWxCLFNBQVMsU0FBUyxPQUFVO01BQVAsR0FBRyxRQUFILEdBQUc7O0FBQ3JDLFNBQU87QUFDTCxhQUFTLENBQUMsV0FBVyxFQUFFO0FBQ3JCLGFBQU8sSUFKSixVQUFVLENBSUssV0FBVyxDQUMzQix5QkFBTSxHQUFHLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxDQUNoQyxJQUFJLENBQUMsQUFBQyxHQUFHLElBQUssR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQ3pCLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNwQixDQUFDO0tBQ0g7R0FDRixDQUFDO0NBQ0giLCJmaWxlIjoibnBtLWNsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmZXRjaCBmcm9tICdub2RlLWZldGNoJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeCc7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBOcG1DbGllbnQoeyBucG0gfSkge1xuICByZXR1cm4ge1xuICAgIGdldFN0YXR1cyhwYWNrYWdlTmFtZSkge1xuICAgICAgcmV0dXJuIE9ic2VydmFibGUuZnJvbVByb21pc2UoXG4gICAgICAgIGZldGNoKG5wbS5yZWdpc3RyeSArIHBhY2thZ2VOYW1lKVxuICAgICAgICAudGhlbigocmVzKSA9PiByZXMuanNvbigpKVxuICAgICAgICAuY2F0Y2goKCkgPT4gZmFsc2UpXG4gICAgICApO1xuICAgIH1cbiAgfTtcbn1cbiJdfQ==