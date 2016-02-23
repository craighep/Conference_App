var Conference = Conference || {};

Conference.controller = (function ($, dataContext, document) {
    "use strict";

    var position = null;
    var mapDisplayed = false;
    var currentMapWidth = 0;
    var currentMapHeight = 0;
    var sessionsListSelector = "#sessions-list-content";
    var sessionsList = [];
    var noSessionsCachedMsg = "<div>Your sessions list is empty.</div>";
    var databaseNotInitialisedMsg = "<div>Your browser does not support local databases.</div>";

    var TECHNICAL_SESSION = "Technical",
        SESSIONS_LIST_PAGE_ID = "sessions",
        MAP_PAGE = "map";

    // This changes the behaviour of the anchor <a> link
    // so that when we click an anchor link we change page without
    // updating the browser's history stack (changeHash: false).
    // We also don't want the usual page transition effect but
    // rather to have no transition (i.e. tabbed behaviour)
    var initialisePage = function (event) {
        change_page_back_history();
    };

    var onPageChange = function (event, data) {
        // Find the id of the page
        var toPageId = data.toPage.attr("id");

        // If we're about to display the map tab (page) then
        // if not already displayed then display, else if
        // displayed and window dimensions changed then redisplay
        // with new dimensions
        switch (toPageId) {
            case SESSIONS_LIST_PAGE_ID:
                dataContext.processSessionsList(saveSessionList);
                renderSessionsList();
                break;
            case MAP_PAGE:
                if (!mapDisplayed || (currentMapWidth != get_map_width() ||
                    currentMapHeight != get_map_height())) {
                    dataContext.processSessionsList(saveSessionList);
                    deal_with_geolocation();
                }
                break;
        }
    };

    var saveSessionList = function(sessions) {
        if(sessions != null)
                sessionsList = sessions;
    }

    function renderSessionsList() {
        var sessionListElement = $('#sessions-list-content');
        var sessionListHtml = "";
        if (sessionsList.length == 0) {
            sessionListElement.append("<div>No sessions available!</div>");
            return;
        }
        sessionListHtml += '<form class="ui-filterable">';
        sessionListHtml +=  '<input id="myFilter" data-type="search" placeholder="Search for sessions..">';
        sessionListHtml += '</form>';
        sessionListHtml += '<ul data-role="listview" data-filter="true" data-input="#myFilter">\n';
        var innerElements = [];
        for (var i = 0; i < sessionsList.length; i++) {
            var session = sessionsList[i];
            var html = "";
            html += '<li><a href="">\n';
            html += '<div class="session-list-item">\n';
            html += '<h3>' + session["title"] + '</h3>\n';
            html += '<div>\n<h6>' + session["type"] + '</h6>\n';
            html += '<h6>' + session["starttime"] + ' - ' + session["endtime"] + '</h6>\n';
            html += '</div>\n</div>\n</a></li>';
            innerElements.push(html);
        }
        sessionListHtml += innerElements.join("\n");
        sessionListHtml += '</ul>';
        sessionListElement.html(sessionListHtml);
        if (sessionListElement.hasClass('ui-listview')) {
            sessionListElement.listview('refresh');
        } else {
            sessionListElement.trigger('create');
        }
    };

    var noDataDisplay = function (event, data) {
        var view = $(sessionsListSelector);
        view.empty();
        $(databaseNotInitialisedMsg).appendTo(view);
    }

    var change_page_back_history = function () {
        $('a[data-role="tab"]').each(function () {
            var anchor = $(this);
            anchor.bind("click", function () {
                $.mobile.changePage(anchor.attr("href"), { // Go to the URL
                    transition: "none",
                    changeHash: false
                });
                return false;
            });
        });
    };

    var deal_with_geolocation = function() {
        var phoneGapApp = (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1 );
        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            // Running on a mobile. Will have to add to this list for other mobiles.
            // We need the above because the deviceready event is a phonegap event and
            // if we have access to PhoneGap we want to wait until it is ready before
            // initialising geolocation services
            if (phoneGapApp) {
                //alert('Running as PhoneGapp app');
                document.addEventListener("deviceready", initiate_geolocation, false);
            }
            else {
                initiate_geolocation(); // Directly from the mobile browser
            }
        } else {
            //alert('Running as desktop browser app');
            initiate_geolocation(); // Directly from the browser
        }
    };

    var initiate_geolocation = function () {
        // Do we have built-in support for geolocation (either native browser or phonegap)?
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(handle_geolocation_query, handle_errors);
        }
        else {
            // We don't so let's try a polyfill
            yqlgeo.get('visitor', normalize_yql_response);
        }
    };

    var handle_errors = function (error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                alert("user did not share geolocation data");
                break;

            case error.POSITION_UNAVAILABLE:
                alert("could not detect current position");
                break;

            case error.TIMEOUT:
                alert("retrieving position timed out");
                break;

            default:
                alert("unknown error");
                break;
        }
    };

    var normalize_yql_response = function (response) {
        if (response.error) {
            var error = { code: 0 };
            handle_errors(error);
            return;
        }

        position = {
            coords: {
                latitude: response.place.centroid.latitude,
                longitude: response.place.centroid.longitude
            },
            address: {
                city: response.place.locality2.content,
                region: response.place.admin1.content,
                country: response.place.country.content
            }
        };

        handle_geolocation_query(position);
    };

    var get_map_height = function () {
        return $(window).height() - ($('#maptitle').height() + $('#mapfooter').height());
    }

    var get_map_width = function () {
        return $(window).width();
    }

    var handle_geolocation_query = function (pos) {

        var the_height = get_map_height();
        var the_width = get_map_width();
        $('#mapPos').css("height",the_height+"px");
        var locations = [];

            console.log(sessionsList);
        for(var i=0;i<sessionsList.length;i++){
            locations[i] = [sessionsList[i]["title"], sessionsList[i]["longitude"], sessionsList[i]["latitude"], i+1];
        }
        console.log(locations);

    var map = new google.maps.Map(document.getElementById('mapPos'), {
      zoom: 16,
      center: new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
    });

    var infowindow = new google.maps.InfoWindow();

    var marker, i;

    for (i = 0; i < locations.length; i++) {  
      marker = new google.maps.Marker({
        position: new google.maps.LatLng(locations[i][1], locations[i][2]),
        map: map,
        label: ""+i
      });

      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infowindow.setContent(locations[i][0]);
          infowindow.open(map, marker);
        }
      })(marker, i));
    }
    // Finally, add marker for user current location
        marker = new google.maps.Marker({
        position: new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude),
        map: map,
        label: ""
      });
        // Add custom icon for user location to differenciate from others
        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png')

        mapDisplayed = true;
    };

    var init = function () {
        // The pagechange event is fired every time we switch pages or display a page
        // for the first time.
        var d = $(document);
        var databaseInitialised = dataContext.init();
        if (!databaseInitialised) {
            d.on('pagechange', $(document), noDataDisplay);
        }
       
        // The pagechange event is fired every time we switch pages or display a page
        // for the first time.
        d.on('pagechange', $(document), onPageChange);
        // The pageinit event is fired when jQM loads a new page for the first time into the
        // Document Object Model (DOM). When this happens we want the initialisePage function
        // to be called.
        d.on('pageinit', $(document), initialisePage);
    };


    // Provides a hash of functions that we return to external code so that they
    // know which functions they can call. In this case just init.
    var pub = {
        init: init
    };

    return pub;
}(jQuery, Conference.dataContext, document));

// Called when jQuery Mobile is loaded and ready to use.
$(document).on('mobileinit', $(document), function () {
    Conference.controller.init();
});


