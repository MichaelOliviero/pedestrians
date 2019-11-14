//
// Escalator Simulator
// All Credits To: https://github.com/jtfmumm/pedestrians
// By: Michael Oliviero
//


var requestAnimationFrame = window.requestAnimationFrame;
var cancelAnimationFrame = window.cancelAnimationFrame;
var myReq;
var c = document.getElementById("screen");
var ctx = c.getContext("2d");

var walkerImage = new Image();
walkerImage.src = "sprites/Walker.png";

var runnerImage = new Image();
runnerImage.src = "sprites/Runner.png";

var range = function(low, high) {
    var thisRange = [];
    for (var i = low; i < high; i++) {
        thisRange.push(i);
    }
    return thisRange;
}

var chooseRand = function(low, high) {
    return Math.floor(Math.random() * (++high - low)) + low;
}

var makeCounter = function() {
    var c = 0;
    return function() {
        return c++;
    }
}

var simStarted = false;
var startTrial;
var makeID = makeCounter();

var spriteSize = 16;
var startingY = 340;
var leftLaneX = 30;
var rightLaneX = 50;
var escalatorSpeed = 0.45;
var arrivals = 0;
var allowPassing;
var calculatedTotalArrivals;
var newWalkerCount;
var newRunnerCount;
var allTimes = 0;
var maxWalkerSpeed = 0.75;
var escalatorLength = 350;

var pedestrians = []; //Active pedestrians
var waitingLine = []; //Pedestrians waiting to start

function clearScreen(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

var getRect = function(x, y, xSide, ySide) {
    var rect = {pos: {x: x, y: y},
                size: {x: xSide, y: ySide}};
    return rect;
}

var getBox = function(x, y, side) {
    return getRect(x, y, side, side);
}

var isColliding = function(pedestrianA, pedestrianB) {
    return !(pedestrianA.pos.x + pedestrianA.size.x < pedestrianB.pos.x
             || pedestrianB.pos.x + pedestrianB.size.x < pedestrianA.pos.x
             || pedestrianA.pos.y + pedestrianA.size.y < pedestrianB.pos.y
             || pedestrianB.pos.y + pedestrianB.size.y < pedestrianA.pos.y)
}

var checkBox = function(box, id) {
    for (i = 0; i < pedestrians.length; i++) {
        if (isColliding(box, pedestrians[i])) {
            if (pedestrians[i].id !== id) { return pedestrians[i].actualSpeed; }
        }
    }
    return false;
}

var checkFront = function(x, y, id) {
    frontBox = getRect(x, (y - 3), spriteSize, 3);
    return checkBox(frontBox, id);
}

var openPass = function(x, pedestrian) {
    //x is the startingX of the side you're trying to pass to
    var y = pedestrian.pos.y;
    var id = pedestrian.id;
    var opposingBox = getRect(x, y, spriteSize, spriteSize);
    var opposingDownBox = getRect(x, (y - (spriteSize / 2)), spriteSize, spriteSize);
    return (!checkBox(opposingBox, id)); //&& !(checkBox(leftDownBox, id)));
}

var getOppositeX = function(side) {
    if (side === "Right") {
        return leftLaneX;
    } else { return rightLaneX; }
}

var Pedestrian = function(x, y, speed, id, type, timeStart) {
    this.id = id;
    this.timeStart = timeStart;
    this.timeAlive = 0;
    this.type = type;
    if (x == rightLaneX) {
      this.side = "Right";
    } else {
      this.side = "Left";
    }
	  //this.side = (x === leftLaneX) ? "Left" : "Right";
    this.pos = {x: x, y: y};
	  this.size = {x: spriteSize, y: spriteSize};
    this.blocked = 0;
    this.passing = 0;
    this.desiredSpeed = speed;
    this.actualSpeed = speed;
    this.passSpeed = 0; //Passing speed (may not be active)
    this.xSpeed = 0; //Actual speed along x axis
    //console.log(speed);
    if (speed > maxWalkerSpeed) {
      this.img = runnerImage;
    } else {
      this.img = walkerImage;
    }

	  this.walk = function() {
		this.pos.y = this.pos.y - this.actualSpeed;
        this.pos.x = this.pos.x - this.xSpeed;
	  }
    this.draw = function() {
        ctx.drawImage(this.img, this.pos.x, this.pos.y);
    }
    this.checkZone = function() {
        var newSpeed = checkFront(this.pos.x, this.pos.y, this.id);
        if (newSpeed) {
            this.blocked = 1;
            this.actualSpeed = Math.min(newSpeed - 0.02, this.actualSpeed);
        } else if (this.blocked === 1) {
            this.blocked = 0;
            this.actualSpeed = this.desiredSpeed;
        }
    }
    this.pass = function() {
        if (this.blocked === 1 && this.desiredSpeed >= 0.2) {
            if (openPass(getOppositeX(this.side), this)) {
                this.passSpeed = (this.side === "Right") ? this.actualSpeed : (0 - this.actualSpeed);
                this.xSpeed = this.passSpeed;
                this.passing = 1;
                this.walk();
            }
        }
    }
    this.endPass = function() {
        if (this.passing === 1) {
            var newSpeed = checkFront(this.pos.x, this.pos.y, this.id);
            if (newSpeed) {
                this.xSpeed = 0;
                this.actualSpeed = newSpeed - 0.02;
            }

            if (this.pos.x < leftLaneX) {
                this.passSpeed = 0;
                this.xSpeed = 0;
                this.pos.x = leftLaneX;
                this.actualSpeed = this.desiredSpeed;
                this.passing = 0;
                this.side = "Left";
            } else if (this.pos.x > rightLaneX) {
                this.passSpeed = 0;
                this.xSpeed = 0;
                this.pos.x = rightLaneX;
                this.actualSpeed = this.desiredSpeed;
                this.passing = 0;
                this.side = "Right";
            }
        }
    }
    this.look = function() {
        if (this.passing === 1 && this.xSpeed === 0) {
            if (checkFront(rightLaneX, this.pos.y, this.id)) {
                this.passSpeed = Math.abs(this.passSpeed);
                this.xSpeed = this.passSpeed;
                this.side = "Left";
            } else if (checkFront(leftLaneX, this.pos.y, this.id)) {
                this.passSpeed = 0 - (Math.abs(this.passSpeed));
                this.xSpeed = this.passSpeed;
                this.side = "Right";
            }
        }
    }
    this.checkArrive = function() {
        if (this.pos.y < -18) {
            var elapsed1 = Date.now() - this.timeStart;
            var minutes1 = Math.floor(elapsed1 / 60000);
            var seconds1 = Math.floor((elapsed1 - (minutes1 * 60000)) / 1000);
            this.timeAlive = seconds1;
            updateTable(this);
            arrivals++;
        }
    }
    //updateTable(this);
}

function updateTable(pedestrian) {
  var table = document.getElementById("tbody");

  var row = table.insertRow();

  var cell1 = row.insertCell(0);
  var cell2 = row.insertCell(1);
  var cell3 = row.insertCell(2);
  var cell4 = row.insertCell(3);
  var cell5 = row.insertCell(4);

  cell1.innerHTML = pedestrian.id;
  cell2.innerHTML = pedestrian.actualSpeed.toFixed(2);
  cell3.innerHTML = pedestrian.type;
  cell4.innerHTML = pedestrian.side;
  allTimes += pedestrian.timeAlive;
  cell5.innerHTML = pedestrian.timeAlive;
  //console.log(pedestrian);
}

var getSpeed = function() {
    speedCategory = chooseRand(1, 6);
    if (speedCategory === 1) {
            return 0.1 + escalatorSpeed;
    } else if (speedCategory > 1 && speedCategory < 5) {
            return (0.2 + (Math.random() * 0.2)) + escalatorSpeed;
    } else {
            return (0.4 + (Math.random() * 0.4)) + escalatorSpeed;
    }
}

var generatePedestrian = function() {
    var x, y, speed, id, type, timeStart;
    var good2go = false;
    timeStart = Date.now();
    type = null;
    //x = ((Math.random() * 2) < 1) ? leftLaneX : rightLaneX;
    y = startingY;
    speed = getSpeed();
    /*if (newWalkerCount == 0) {
      speed = speed - 0.25;
    } else if (newRunnerCount == 0) {
      speed = speed + 0.25;
    }*/
    if (speed > maxWalkerSpeed) {
        if (newRunnerCount > 0) {
          x = leftLaneX;
          type = "Runner";
          newRunnerCount = newRunnerCount - 1;
          //console.log("runner count: " + newRunnerCount);
          good2go = true;
        }
    } else {
      if (newWalkerCount > 0) {
        x = rightLaneX;
        type = "Walker";
        newWalkerCount = newWalkerCount - 1;
        //console.log("walker count: " + newWalkerCount);
        good2go = true;
      }
    }
    var startingLeftBox = getRect(x, startingY, 0.1);
    var startingRightBox = getRect(x, startingY - 8, 0.1);
    id = makeID();

    if (!checkBox(startingLeftBox, 0.1)) {
      //console.log("Value: " + good2go)
      if (good2go && type != null) {
        pedestrians.push(new Pedestrian(x, y, speed, id, type, timeStart));
        good2go = false;
      } else {
        generatePedestrian();
      }
    } else {
      if (type != null){
        waitingLine.push(new Pedestrian(x, y, speed, id, type, timeStart));
        good2go = false;
      }
    }
}

var nextInLine = function() {
    if (waitingLine[0] !== undefined) {
        var waitingLineClose = getRect(waitingLine[0].pos.x, startingY, spriteSize, spriteSize);
        var waitingLineBack = getRect(waitingLine[0].pos.x, startingY - 8, spriteSize, spriteSize);
        if (!checkBox(waitingLineClose, waitingLine[0].id) && !checkBox(waitingLineBack, waitingLine[0].id))
            pedestrians.push(waitingLine.shift());
    }
}

var drawLanes = function() {
    ctx.beginPath();
    ctx.moveTo(70,escalatorLength);
    ctx.lineTo(70,0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(28,escalatorLength);
    ctx.lineTo(28,0);
    ctx.stroke();
}

var rollAgainst = function(target) {
    var roll = Math.random() * 100;
    return (roll < target);
}

var render = function() {
    for (var i = 0; i < pedestrians.length; i++) {
        if (pedestrians[i].pos.y > -18) {
            pedestrians[i].checkZone();
            if (allowPassing) {
              pedestrians[i].pass();
              pedestrians[i].look();
              pedestrians[i].endPass();
            }
            pedestrians[i].walk();
            pedestrians[i].draw();
            pedestrians[i].checkArrive();
        }
    }
    drawLanes();
}

function main() {
    var length = document.getElementById("length"); length.disabled = true;
    var radios = document.getElementsByName("passing");
    var walkerCount = document.getElementById("walkers"); walkerCount.disabled = true;
    var runnerCount = document.getElementById("runners"); runnerCount.disabled = true;
    calculatedTotalArrivals = parseInt(walkerCount.value) + parseInt(runnerCount.value);

    for (var i = 0, length = radios.length; i < length; i++) {
      radios[i].disabled = true;
      if (radios[i].checked) {
        if (radios[i].value == "true"){
          allowPassing = true;
        } else {
          allowPassing = false;
        }
      }
    }

    var btn1 = document.getElementById("startbtn");
    btn1.disabled = true;
    var btn2 = document.getElementById("resetbtn");
    btn2.disabled = false;

    render();

    if ((newWalkerCount > 0) || (newRunnerCount > 0)) {
      //console.log("still within!")
        if (rollAgainst(3)) {
          generatePedestrian();
        }
    }
    nextInLine();

    if (arrivals < calculatedTotalArrivals) { myReq = requestAnimationFrame(main); }
}

function start() {
  startTrial = Date.now();
  simStarted = true;
  newWalkerCount = document.getElementById("walkers").value;
  newRunnerCount = document.getElementById("runners").value;
  escalatorLength = document.getElementById("length").value;
  document.getElementById("screen").height = escalatorLength;
  startingY = escalatorLength - 10;
  main();
  update();
}

function reset() {
  cancelAnimationFrame(myReq);
  simStarted = false;
  arrivals = 0;
  allTimes = 0;
  pedestrians = [];
  waitingLine = [];
  clearScreen(ctx);
  var length = document.getElementById("length"); length.disabled = false;
  var radios = document.getElementsByName("passing");
  var walkerCount = document.getElementById("walkers"); walkerCount.disabled = false;
  var runnerCount = document.getElementById("runners"); runnerCount.disabled = false;
  for (var i = 0, length = radios.length; i < length; i++) { radios[i].disabled = false; }
  var tbody = document.getElementById("tbody");
  tbody.innerHTML = "";
  var btn1 = document.getElementById("startbtn");
  btn1.disabled = false;
  var btn2 = document.getElementById("resetbtn");
  btn2.disabled = true;
}

function update() {
  var arrivalText = document.getElementById("arrivals");
  var arrivalsPerSecondText = document.getElementById("aps");
  var totalTimeMinutesText = document.getElementById("ttm");
  var totalTimeSecondsText = document.getElementById("tts");
  var avgTimeText = document.getElementById("at");
  var elapsed = Date.now() - startTrial;
  var minutes = Math.floor(elapsed / 60000);
  var seconds = Math.floor((elapsed - (minutes * 60000)) / 1000);
  var arrialsPerSecondTime = (arrivals / Math.floor(elapsed / 1000)).toFixed(2);

  arrivalText.innerHTML = arrivals + "/" + calculatedTotalArrivals;

  if (arrivals < calculatedTotalArrivals) {
    totalTimeMinutesText.innerHTML = minutes;
    totalTimeSecondsText.innerHTML = seconds;
    arrivalsPerSecondText.innerHTML = arrialsPerSecondTime;
    avgTimeText.innerHTML = (allTimes/arrivals).toFixed(2);
  }
}

window.setInterval(function() {
  if (simStarted){ update(); }
}, 1000);
