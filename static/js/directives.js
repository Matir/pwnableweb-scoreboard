/**
 * Copyright 2014 David Tomaschik <david@systemoverlord.com>
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var sbDirectives = angular.module('sbDirectives', [
        'globalServices'
        ]);

sbDirectives.directive('highlightActive', [
    '$location',
    function($location) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                scope.$watch(function() { return $location.path(); },
                    function() {
                        if (element[0].pathname == $location.path()) {
                            element.addClass('active');
                        } else {
                            element.removeClass('active');
                        }
                    });
            }
        };
    }]);

sbDirectives.directive('countdownTimer', [
    '$interval',
    'gameTimeService',
    function($interval, gameTimeService) {
        return {
            restrict: 'AE',
            scope: true,
            templateUrl: '/partials/components/countdown.html',
            link: function(scope) {
                var iprom = null;
                var splitTime = function(time) {
                    var t = {};
                    t.seconds = time % 60;
                    time = Math.floor(time/60);
                    t.minutes = time % 60;
                    t.hours = Math.floor(time / 60);
                    return t;
                };
                var refresh = function() {
                    var timeleft = gameTimeService.toStart();
                    if (timeleft > 0) {
                        // Not yet started
                        scope.to = "starts";
                        scope.time = splitTime(timeleft);
                        return;
                    }
                    timeleft = gameTimeService.toEnd();
                    if (timeleft > 0) {
                        // During game
                        scope.to = "ends";
                        scope.time = splitTime(timeleft);
                        return;
                    }
                    // Game over or no end
                    if (iprom) {
                        $interval.cancel(iprom);
                        iprom = null;
                    }
                    if (!gameTimeService.end)
                        scope.message = "Game on!";
                    else
                        scope.message = "Game over.";
                };
                gameTimeService.then(function() {
                    if (!gameTimeService.start && !gameTimeService.end)
                        return;
                    scope.display = true;
                    refresh();
                    iprom = $interval(refresh, 1000);
                });
                scope.display = false;
            }
        };
    }]);

sbDirectives.directive('loadingOverlay', [
    'loadingService',
    function (loadingService) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                scope.$watch(function() { return loadingService.getState(); },
                    function() {
                        if (loadingService.getState())
                            element.show();
                        else
                            element.hide();
                    });
            }
        };
    }]);

/* Draw a scoreboard using the D3 JS library.
 * The data supplied should be an object like:
 * {label: [{time: Date, value: y point}, ...], ...}
 */
sbDirectives.directive('d3LineTimeChart', [
    function () {
      return {
        restrict: 'AE',
        replace: false,
        scope: {
          graphSrc: '=graphSrc'
        },
        link: function(scope, element, attrs) {
          // This still needs a lot of work, including a legend, colors,
          // styling, etc.
          if (!d3 || d3 == undefined)
            return;
          scope.$watch('graphSrc', function() {
            var data = scope.graphSrc;
            if (!data || data == undefined)
              return;

            var width = element.width();
            var height = element.height();
            var sideMargin = width/10;
            var topMargin = height/10;

            var minDate = null;
            var maxDate = null;
            var maxValue = null;

            angular.forEach(data, function(points) {
              points.sort(function(a,b) {
                if (a.time < b.time)
                  return -1;
                if (a.time > b.time)
                  return 1;
                return 0;
              });
              if (minDate == null || points[0].time < minDate)
                minDate = points[0].time;
              if (maxDate == null || points[points.length-1].time > maxDate)
                maxDate = points[points.length-1].time;
              angular.forEach(points, function(point) {
                if (maxValue == null || point.value > maxValue)
                  maxValue = point.value;
              });
            });

            element.empty();

            var xScale = d3.time.scale().domain([minDate, maxDate]).range([0, width - (sideMargin * 2)]);
            var yScale = d3.scale.linear().domain([0, maxValue]).range([height - (topMargin * 2), 0]);

            // TODO: adjust ticks based on range and size
            var xAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(d3.time.minutes, 3)
              .tickFormat(d3.time.format('%H:%M')).tickSize(2).tickPadding(8);
            var yAxis = d3.svg.axis().scale(yScale).orient('left').tickPadding(8).ticks(5);

            var svg = d3.select(element[0]).append('svg').attr('class', 'chart').attr('width', width)
              .attr('height', height).append('g').attr('transform',
                  'translate(' + sideMargin + ', ' + topMargin + ')');

            svg.append('g').attr('class','x_axis')
              .attr('transform', 'translate(0, ' + (height - (topMargin * 2)) + ')')
              .call(xAxis);
            svg.append('g').attr('class','y_axis').call(yAxis);

            var line = d3.svg.line()
              .x(function(d) { return xScale(d.time); })
              .y(function(d) { return yScale(d.value); });
            
            // Draw the lines
            var color = 0, colorMax = 12;
            angular.forEach(data, function(points, label) {
              svg.append('path').attr('d', line(points))
                .attr('class', 'graph-line graph-line-' + (color+1));
              color++;
              color = color % colorMax;
            });
          }, true); // end of scope.$watch
        }
      };
    }]);
