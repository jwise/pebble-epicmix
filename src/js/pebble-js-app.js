// Fetch saved symbol from local storage (using standard localStorage webAPI)
var cookie = localStorage.getItem("cookie");

if (!cookie) {
  /* ... need to log in ... */
}

function login(username, password) {
  var response;
  var req = new XMLHttpRequest();
  var params = "loginID="+encodeURIComponent(username)+"&password="+encodeURIComponent(password);
  req.open('POST', 'http://nyus.joshuawise.com:8081/authenticate.ashx', true);
  req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  req.onload = function(e) {
    if (req.readyState == 4) {
      // 200 - HTTP OK
      if(req.status == 200) {
        console.log(req.getAllResponseHeaders());
        console.log(req.responseText);
        cookie = req.getResponseHeader('x-set-cookie').split(";")[0];
        getVertical();
      } else {
        console.log("Request returned error code " + req.status.toString());
      }
    }
  }
  req.send(params);
}
login("joshua@joshuawise.com", "<not really my password>");

function getVertical() {
  var response;
  var req = new XMLHttpRequest();
  var params = "timetype=season";
  req.open('POST', 'http://nyus.joshuawise.com:8081/userstats.ashx', true);
  req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  req.setRequestHeader("x-cookie", cookie);
  req.onload = function(e) {
    if (req.readyState == 4) {
      // 200 - HTTP OK
      if(req.status == 200) {
        console.log(req.getAllResponseHeaders());
        console.log(req.responseText);
        response = JSON.parse(req.responseText);
        
        Pebble.sendAppMessage({"username": response["userName"]});
        
        var vertical = 0;
        for (s in response["seasonStats"])
          if (response["seasonStats"][s].isCurrentSeason)
            vertical = response["seasonStats"][s].verticalFeet;
        
        Pebble.sendAppMessage({"vertical": vertical});
      } else {
        console.log("Request returned error code " + req.status.toString());
        console.log(req.getAllResponseHeaders());
        console.log(req.responseText);
      }
    }
  }
  req.send(params);
}

function getLatestStats() {
  getVertical();
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
                            getLatestStats();
                          }
                        });

