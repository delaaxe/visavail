function visavailChart() {
  var margin = {
    top: 20, // top margin includes title and legend
    right: 40, // right margin should provide space for last horz. axis title
    bottom: 20,
    left: 40, // left margin should provide space for y axis titles
  };

  // height of horizontal data bars
  var dataHeight = 18;

  // spacing between horizontal data bars
  var lineSpacing = 14;

  // vertical space for heading
  var paddingTopHeading = -50;

  // vertical overhang of vertical grid lines on bottom
  var paddingBottom = 10;

  // space for y axis titles
  var paddingLeft = -100;

  var width = 940 - margin.left - margin.right;

  // global div for tooltip
  var div = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

  var customCategories = 1;
  var isDateOnlyFormat = false;

  function chart(selection) {
    console.log('selection', selection);
    selection.each(function(dataset) {
      // check which subset of datasets have to be displayed
      var maxPages = 0;
      var startSet;
      var endSet;

      startSet = 0;
      endSet = dataset.length;

      // append data attribute in HTML for pagination interface
      selection.attr('data-max-pages', maxPages);

      var noOfDatasets = endSet - startSet;
      var height = dataHeight * noOfDatasets + lineSpacing * noOfDatasets - 1;

      // check how data is arranged
      for (var i = 0; i < dataset.length; i++) {
        if (dataset[i].data[0].length !== 3) {
            throw new Error('Detected different data formats in input data. Format can either be ' +
                'continuous data format or time gap data format but not both.');
        }
      }

      // parse data text strings to JavaScript date stamps
      var parseDate = d3.time.format('%Y-%m-%d');
      var parseDateTime = d3.time.format('%Y-%m-%d %H:%M:%S');
      dataset.forEach(function (d) {
        d.data.forEach(function (d1) {
          if (!(d1[0] instanceof Date)) {
            d1[0] = parseDateTime.parse(d1[0]);
            d1[2] = parseDateTime.parse(d1[2]);
          }
        });
      });

      // determine start and end dates among all nested datasets
      var startDate = 0;
      var endDate = 0;
      dataset.forEach(function (series, seriesI) {
        if (series.data.length>0) {
          if (startDate === 0) {
            startDate = series.data[0][0];
            endDate = series.data[series.data.length - 1][2];
          } else {
            if (series.data[0][0] < startDate) {
              startDate = series.data[0][0];
            }
            if (series.data[series.data.length - 1][2] > endDate) {
              endDate = series.data[series.data.length - 1][2];
            }
          }
        }
      });

      // define scales
      var xScale = d3.time.scale()
          .domain([startDate, endDate])
          .range([0, width])
          //.ticks(3)
          .clamp(1);

      // define axes
      var xAxis = d3.svg.axis()
          .scale(xScale)
          .orient('top');

      // create SVG element
      var svg = d3.select(this).append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // create basic element groups
      svg.append('g').attr('id', 'g_axis');
      svg.append('g').attr('id', 'g_data');

      // create y axis labels
      var labels = svg.select('#g_axis').selectAll('text')
          .data(dataset.slice(startSet, endSet))
          .enter();

      // create vertical grid
      svg.select('#g_axis').selectAll('line.vert_grid').data(xScale.ticks())
          .enter()
          .append('line')
          .attr({
            'class': 'vert_grid',
            'x1': function (d) {
              return xScale(d);
            },
            'x2': function (d) {
              return xScale(d);
            },
            'y1': 0,
            'y2': dataHeight * noOfDatasets + lineSpacing * noOfDatasets - 1 + paddingBottom
          });

      // create horizontal grid
      svg.select('#g_axis').selectAll('line.horz_grid').data(dataset)
          .enter()
          .append('line')
          .attr({
            'class': 'horz_grid',
            'x1': 0,
            'x2': width,
            'y1': function (d, i) {
              return ((lineSpacing + dataHeight) * i) + lineSpacing + dataHeight / 2;
            },
            'y2': function (d, i) {
              return ((lineSpacing + dataHeight) * i) + lineSpacing + dataHeight / 2;
            }
          });

      // create x axis
      svg.select('#g_axis').append('g')
          .attr('class', 'axis')
          .call(xAxis);

      // make y groups for different data series
      var g = svg.select('#g_data').selectAll('.g_data')
          .data(dataset.slice(startSet, endSet))
          .enter()
          .append('g')
          .attr('transform', function (d, i) {
            return 'translate(0,' + ((lineSpacing + dataHeight) * i) + ')';
          })
          .attr('class', 'dataset');

      // add data series
      g.selectAll('rect')
          .data(function (d) {
            return d.data;
          })
          .enter()
          .append('rect')
          .attr('x', function (d) {
            return xScale(d[0]);
          })
          .attr('y', lineSpacing)
          .attr('width', function (d) {
            return (xScale(d[2]) - xScale(d[0]));
          })
          .attr('height', dataHeight)
          .attr('class', function (d) {
            var series = dataset.find(function(series) {
              return series.data.indexOf(d) >= 0;
            });
            if (series && series.categories) {
              d3.select(this).attr('fill', series.categories[d[1]].color);
              return '';
            }
          })
          .on('mouseover', function (d, i) {
            var matrix = this.getScreenCTM().translate(+this.getAttribute('x'), +this.getAttribute('y'));
            div.transition()
                .duration(200)
                .style('opacity', 0.9);
            div.html(function () {
              var output = '';
              if (customCategories) {
                // custom categories: display category name
                output = '&nbsp;' + d[1] + '&nbsp;';
              } else {
                if (d[1] === 1) {
                  // checkmark icon
                  output = '<i class="fa fa-fw fa-check tooltip_has_data"></i>';
                } else {
                  // cross icon
                  output = '<i class="fa fa-fw fa-times tooltip_has_no_data"></i>';
                }
              }
              if (isDateOnlyFormat) {
                if (d[2] > d3.time.second.offset(d[0], 86400)) {
                  return output + moment(parseDate(d[0])).format('l')
                      + ' - ' + moment(parseDate(d[2])).format('l');
                }
                return output + moment(parseDate(d[0])).format('l');
              } else {
                if (d[2] > d3.time.second.offset(d[0], 86400)) {
                  return output + moment(parseDateTime(d[0])).format('l') + ' '
                      + moment(parseDateTime(d[0])).format('LT') + ' - '
                      + moment(parseDateTime(d[2])).format('l') + ' '
                      + moment(parseDateTime(d[2])).format('LS');
                }
                return output + moment(parseDateTime(d[0])).format('LT') + ' - '
                    + moment(parseDateTime(d[2])).format('LT');
              }
            })
            .style('left', function () {
              return window.pageXOffset + matrix.e + 'px';
            })
            .style('top', function () {
              return window.pageYOffset + matrix.f - 11 + 'px';
            })
            .style('height', dataHeight + 11 + 'px');
          })
          .on('mouseout', function () {
            div.transition()
                .duration(500)
                .style('opacity', 0);
          });

      // rework ticks and grid for better visual structure
      function isYear(t) {
        return +t === +(new Date(t.getFullYear(), 0, 1, 0, 0, 0));
      }

      function isMonth(t) {
        return +t === +(new Date(t.getFullYear(), t.getMonth(), 1, 0, 0, 0));
      }

      var xTicks = xScale.ticks();
      var isYearTick = xTicks.map(isYear);
      var isMonthTick = xTicks.map(isMonth);
    });
  }

  chart.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  return chart;
}
