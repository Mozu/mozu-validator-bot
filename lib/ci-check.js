'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.allCiSucceeded = allCiSucceeded;
function allCiSucceeded(_ref) {
  let repository = _ref.repository;
  let sha = _ref.sha;
  let statuses = _ref.statuses;
  let contents = _ref.contents;

  let successes = statuses.filter(_ref2 => {
    let state = _ref2.state;
    return state === 'success';
  });
  return conf.ciProviders.every(_ref3 => {
    let name = _ref3.name;
    let configFile = _ref3.configFile;
    let statusContext = _ref3.statusContext;

    let isConfigured = contents.some(_ref4 => {
      let path = _ref4.path;
      return path === configFile;
    });
    let successFound = !isConfigured || successes.find(_ref5 => {
      let context = _ref5.context;
      return context === statusContext;
    });
    if (isConfigured && successFound) {
      logger.notice(`${ name } build success for ${ repository.name }#${ sha }, triggered by`, successFound);
    }
    return !!successFound;
  });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jaS1jaGVjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztRQUNnQixjQUFjLEdBQWQsY0FBYztBQUF2QixTQUFTLGNBQWMsT0FBMEM7TUFBdkMsVUFBVSxRQUFWLFVBQVU7TUFBRSxHQUFHLFFBQUgsR0FBRztNQUFFLFFBQVEsUUFBUixRQUFRO01BQUUsUUFBUSxRQUFSLFFBQVE7O0FBQ2xFLE1BQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFBRyxLQUFLLFNBQUwsS0FBSztXQUFPLEtBQUssS0FBSyxTQUFTO0dBQUEsQ0FBQyxDQUFDO0FBQ3BFLFNBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQzNCLFNBQXlDO1FBQXRDLElBQUksU0FBSixJQUFJO1FBQUUsVUFBVSxTQUFWLFVBQVU7UUFBRSxhQUFhLFNBQWIsYUFBYTs7QUFDaEMsUUFBSSxZQUFZLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztVQUFHLElBQUksU0FBSixJQUFJO2FBQU8sSUFBSSxLQUFLLFVBQVU7S0FBQSxDQUFDLENBQUM7QUFDcEUsUUFBSSxZQUFZLEdBQUcsQ0FBQyxZQUFZLElBQzlCLFNBQVMsQ0FBQyxJQUFJLENBQUM7VUFBRyxPQUFPLFNBQVAsT0FBTzthQUFPLE9BQU8sS0FBSyxhQUFhO0tBQUEsQ0FBQyxDQUFDO0FBQzdELFFBQUksWUFBWSxJQUFJLFlBQVksRUFBRTtBQUNoQyxZQUFNLENBQUMsTUFBTSxDQUNYLENBQUMsR0FBRSxJQUFJLEVBQUMsbUJBQW1CLEdBQUUsVUFBVSxDQUFDLElBQUksRUFBQyxDQUFDLEdBQUUsR0FBRyxFQUFDLGNBQWMsQ0FBQyxFQUNuRSxZQUFZLENBQ2IsQ0FBQztLQUNIO0FBQ0QsV0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDO0dBQ3ZCLENBQ0YsQ0FBQTtDQUNGIiwiZmlsZSI6ImNpLWNoZWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgZnVuY3Rpb24gYWxsQ2lTdWNjZWVkZWQoeyByZXBvc2l0b3J5LCBzaGEsIHN0YXR1c2VzLCBjb250ZW50cyB9KSB7XG4gIGxldCBzdWNjZXNzZXMgPSBzdGF0dXNlcy5maWx0ZXIoKHsgc3RhdGUgfSkgPT4gc3RhdGUgPT09ICdzdWNjZXNzJyk7XG4gIHJldHVybiBjb25mLmNpUHJvdmlkZXJzLmV2ZXJ5KFxuICAgICh7IG5hbWUsIGNvbmZpZ0ZpbGUsIHN0YXR1c0NvbnRleHQgfSkgPT4ge1xuICAgICAgbGV0IGlzQ29uZmlndXJlZCA9IGNvbnRlbnRzLnNvbWUoKHsgcGF0aCB9KSA9PiBwYXRoID09PSBjb25maWdGaWxlKTtcbiAgICAgIGxldCBzdWNjZXNzRm91bmQgPSAhaXNDb25maWd1cmVkIHx8XG4gICAgICAgIHN1Y2Nlc3Nlcy5maW5kKCh7IGNvbnRleHQgfSkgPT4gY29udGV4dCA9PT0gc3RhdHVzQ29udGV4dCk7XG4gICAgICBpZiAoaXNDb25maWd1cmVkICYmIHN1Y2Nlc3NGb3VuZCkge1xuICAgICAgICBsb2dnZXIubm90aWNlKFxuICAgICAgICAgIGAke25hbWV9IGJ1aWxkIHN1Y2Nlc3MgZm9yICR7cmVwb3NpdG9yeS5uYW1lfSMke3NoYX0sIHRyaWdnZXJlZCBieWAsXG4gICAgICAgICAgc3VjY2Vzc0ZvdW5kXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gISFzdWNjZXNzRm91bmQ7XG4gICAgfVxuICApXG59XG4iXX0=