angular.module('PresentlyApp', ['LocalStorageModule'])

	.factory('UserSettings', function (localStorageService) {
		return {
			setData: function (key, val) {
				localStorageService.add(key, val);
			},

			getData: function (key) {
				return localStorageService.get(key);
			}
		}
	})

	.factory('Weather', function ($http, $q, UserSettings) {
		var apiKey = 'cd57b20026033575';

		return {
			weather: null,
			cities: null,
			timezone: {loc: 'Europe/Kiev'},
			getUrl: function(type, loc) {
				if (loc && loc.city && loc.city === UserSettings.getData('loc').city) {
					return false;
				} else if (!UserSettings.getData('loc')) {
					UserSettings.setData('loc', JSON.stringify({city: 'Kharkiv', tz: this.timezone.loc}));
					return "http://api.wunderground.com/api/" +
						apiKey + "/" + type + "/q/" +
						'Kharkiv' + '.json';
				}
				if (loc) {
					UserSettings.setData('loc', loc);
				} else {
					loc = UserSettings.getData('loc');
					this.timezone.loc = loc.tz;
				}

				return "http://api.wunderground.com/api/" +
					apiKey + "/" + type + "/q/" +
					loc.city + '.json';
			},

			getForecast: function (loc) {
				var api = this.getUrl("forecast", loc),
					self = this;
				if (!api) { return; }
				console.log(api);
				$http({
					method: 'GET',
					url: api
				}).success(function(data) {
					console.log(data);
					self.weather = data;
				});
			},

			getListOfCities: function (chunk, cb) {
				var self = this;
				$http({
					method: 'GET',
					url: 'http://autocomplete.wunderground.com/aq',
					params: {
						query: chunk
					}
				}).success(function(data) {
					if (data.RESULTS) {
						self.cities = data.RESULTS;
						cb();
					}
				});
			}
		};
	})

	.controller('MainCtrl', function($scope, $timeout, Weather) {
		$scope.weatherService = Weather;
	  	$scope.isSettingsShown = false;
		$scope.weatherService.getForecast();
		$timeout(Weather.getForecast, 1000 * 60 * 60);
	})

	.directive('imageTooltip', function () {
		return {
			restrict: 'E',
			template: '<div style="display: inline-block">\n ' +
				'<img  style="height: 50px"  ng-src="{{ imageSrc }}" />\n    ' +
				'<div  ng-show="isHidden" class="weather-tooltip">{{ text }}</div>\n</div>',
			link: function (scope,element, attrs) {
				scope.isHidden = false;
				element.bind('mouseover', function () {
				    if (scope.text) {
					  scope.isHidden = true;
				    }
				});
				element.bind('mouseout', function () {
					scope.isHidden = false;
				});
			},
			scope: {
				text: '=',
				imageSrc: '@'
			}
		}
	})

    .directive('showSettingsMenu', function () {
		var mainContent = $('.container'),
			settingsPanel = $('.settings-container');
		return {
			restrict: 'A',
			link: function (scope,element, attrs) {
			    scope.toggleSettings = function () {

					if (mainContent.css('marginLeft').indexOf('-') !== -1) {
						settingsPanel.toggle( 'blind', {}, 1000 );
						setTimeout(function () {
							mainContent.animate({marginLeft: '50px'}, 1000);
							element.animate({'right': '10px', 'top': '10px'},1000);
						}, 900)

					} else {
						setTimeout(function () {
							settingsPanel.toggle( 'blind', {}, 1000 );
						}, 750);
						mainContent.animate({marginLeft: '-200px'}, 1000);
						element.animate({'right': '240px'},1000);
					}
			    };

			}
		};
	})

	.directive('cityAutoFill', function () {
		return {
			restrict: 'E',

			template: '<label for="user-location">Enter your location</label>\n' +
				'<input type="text" class="form-control" id="user-location" placeholder="Enter region..." ng-model="location">\n' +
				'<button type="button" style="top: 140px" class="btn btn-info" ng-click="updateForecast(city)">Save</button>\n' +
				'<button type="button" class="btn btn-info" ng-click="reset()">Reset/Close</button>\n        ' +
				'<ul class="cities-list" ng-hide="isHidden">\n    ' +
				'<li ng-repeat="city in matches" ng-click="pickCity(city)">\n        {{ city.name }}\n    </li> \n' +
				'</ul>\n{{isHidden}}',
			controller: function ($scope, $timeout, Weather) {
				var timeout;

				$scope.weatherService = Weather;

				$scope.$watch('location', function (newVal, oldVal) {
					if (newVal && newVal !== oldVal) {
						if (timeout) {
							$timeout.cancel(timeout)
						}
						timeout = $timeout(function() {
							$scope.weatherService.getListOfCities(newVal, function () {
								$scope.isHidden = false;
							});
						}, 500);
					}
				});

				$scope.updateForecast = function () {
					if ($scope.userChoosenCity) {
						$scope.weatherService.timezone.loc = $scope.userChoosenCity.tz;
						$scope.weatherService.getForecast({city: $scope.userChoosenCity.name, tz: $scope.userChoosenCity.tz})
					}
				};

				$scope.reset = function () {
					$scope.location = '';
					$scope.isHidden = true;
				}
			},
			link: function (scope,element, attrs) {
				var input = element.children('input');
				scope.isHidden =  true;
				scope.userChoosenCity = null;
				 scope.pickCity = function (city) {
					input.val(city.name);
					scope.userChoosenCity = city;
					scope.isHidden = true;
				 }
			},
			scope: {
				matches: '='
			}
		};
	})


	.directive('date', function () {
		return {
			restrict: 'E',
			template: '<div id="datetime">\n    <h1>{{ date.raw | date:\'HH:mm:ss\'  }}</h1>\n    ' +
				'<h2>{{ date.raw | date:\'EEEE, MMMM yyyy\' }}</h2>\n</div>',
			controller: function ($scope, $timeout) {
				var currentDate = new Date(),
					days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
				$scope.date = {};
				$scope.currentDay = days[currentDate.getDay()];
				!function updateTime() {
					$scope.date.raw = new Date(new Date().toLocaleString(
						"en-US", {timeZone: $scope.tz.loc}
					));
					$timeout(updateTime, 1000);
				}();
			},
			link: function (scope,element, attrs) {


			},
			scope: {
				 tz: '='
			}
		};
	});
