var Clay = require('pebble-clay');
var clayConfig = require('./clay-config');
var clay = new Clay(clayConfig, null, { autoHandleEvents: false });

// Fetch saved symbol from local storage (using standard localStorage webAPI)
var cookie = localStorage.getItem("cookie");
var username = localStorage.getItem("username");
var password = localStorage.getItem("password");

if (!username || !password || username == "" || password == "") {
  console.log("looks like I haven't a username or password?  let's open the config page.");
  Pebble.openURL(clay.generateUrl());
}

function login(succ, fail) {
  console.log("logging in with username '"+username+"' and password '"+password+"'");
  if (!username || !password) {
    console.log("login: no username / password?");
    return fail();
  }

  var response;
  var req = new XMLHttpRequest();
  var params = "loginID="+encodeURIComponent(username)+"&password="+encodeURIComponent(password);
  req.open('POST', 'http://epicmix-proxy.appspot.com/authenticate.ashx', true);
  req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  console.log("login: here we go");
  req.onload = function(e) {
    if (req.readyState != 4)
      return;
    
    if (req.status != 200) {
      console.log("login: request returned error code " + req.status.toString());
      return fail();
    }

    //console.log(req.getAllResponseHeaders());
    //console.log(req.responseText);
    console.log("login: succeeded");
    cookie = req.getResponseHeader('x-set-cookie').split(";")[0];
    
    response = JSON.parse(req.responseText);
    
    succ(response);
 }
  req.send(params);
}

function getUrl(url, params, succ, fail, isretry) {
  if (!cookie) {
    console.log("getUrl(" + url + "): not logged in -- will try again afterwards");
    login(function () { getUrl(url, params, succ, fail, isretry); }, fail);
    return;
  }

  var response;
  var req = new XMLHttpRequest();
  var params = params;
  req.open('POST', 'http://epicmix-proxy.appspot.com/'+url, true);
  req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  req.setRequestHeader("x-cookie", cookie);
  console.log("getUrl(" + url + "): doing request with " + params);
  req.onload = function(e) {
    if (req.readyState != 4)
      return;

    if (req.status != 200) {
      console.log("getUrl (" + url +"): Request returned error code " + req.status.toString());
      console.log(req.getAllResponseHeaders());
      console.log(req.responseText);
      if (!isretry) {
        console.log("getUrl (" + url + "): going to try logging in again ...");
        login(function () { getUrl(url, params, succ, fail, true); }, fail);
      } else {
        fail();
      }
      
      return;
    }
    
    //console.log(req.getAllResponseHeaders());
    //console.log(req.responseText);
    response = JSON.parse(req.responseText);
    succ(response);
  }
  req.send(params);
}

function getSeasonStats(succ, fail) {
  getUrl("userstats.ashx", "timetype=season", succ, fail);
}

function getDayStats(succ, fail) {
  getUrl("userstats.ashx", "timetype=day", succ, fail);
}

function parseSeasonStats() {
  function succ(data) {
    Pebble.sendAppMessage({"username": data["userName"]});
    
    var vertical = 0;
    for (s in data["seasonStats"])
      if (data["seasonStats"][s].isCurrentSeason)
        vertical = data["seasonStats"][s].verticalFeet;
    
    Pebble.sendAppMessage({"vertical": vertical});
  }
  
  function fail() {
    console.log("arse");
  }
  
  getSeasonStats(succ, fail);
}

function parseDayStats() {
  function succ(data) {
    Pebble.sendAppMessage({"username": data["userName"],
                           "vertical": data["resortDayStats"][0]["verticalFeet"],
                           "date": data["resortDayStats"][0]["date"].split(" ")[0],
                           });
  }
  
  function fail() {
    console.log("arse");
  }
  
  getDayStats(succ, fail);
}


// Set callback for the app ready event
Pebble.addEventListener("ready",
                        function(e) {
                          console.log("connect!" + e.ready);
                          console.log(e.type);
                          Pebble.sendAppMessage({"fetch": "hi there!"});
                        });

// Set callback for appmessage events
Pebble.addEventListener("appmessage",
                        function(e) {
                          console.log("message");
                          if (e.payload.fetch) {
                            parseDayStats();
                          }
                        });


Pebble.addEventListener('showConfiguration', function(e) {
  Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function(e) {
  if (e && !e.response) {
    return;
  }
  
  var dict = clay.getSettings(e.response, false);
  console.log("updating configuration");
  localStorage.setItem("username", dict.cfg_username.value);
  localStorage.setItem("password", dict.cfg_password.value);
  username = dict.cfg_username.value;
  password = dict.cfg_password.value;
  
  Pebble.sendAppMessage({"fetch": "hi there!"});
});
