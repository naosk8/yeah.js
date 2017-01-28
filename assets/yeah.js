var captureInterval = 1000;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var videoConstraints = {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 400, ideal: 720, max: 1080 },
    facingMode: "user",
    frameRate: { ideal: 20, max: 30 }
};
var chartOptions = {
    curveType: 'function',
    legend: {
        position: 'bottom',
        textStyle: {color: 'gray'}
    },
    width: 800,
    height: 200,
    lineWidth: 3,
    colors:['darkorange', 'limegreen'],
    backgroundColor: 'transparent', // 'black',
    vAxis: {
        viewWindow: {min: 0},
        minValue: 0
    }
};

var isVideoStopped = false;
google.charts.load('current', {'packages':['corechart']});
window.onload = function() {
    fixViewportHeight();
    var i, height, width, imageData, gray, myStream, dataWithTitle, vData, yeah, len,
        matches, lastCorners, lastDescriptors, corners, descriptors, startTime, now, diff;
    var videoElm = document.getElementById('video');
    videoElm.addEventListener('play', function() {
        isVideoStopped = false;
    }, false);
    videoElm.addEventListener('ended', function() {
        isVideoStopped = true;
    }, false);
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    var chartElm = document.getElementById('curve_chart');
    var chart = new google.visualization.LineChart(chartElm);

    var timeSeriesData = [];

    function drawChart(timeSeriesData) {
        if (chart) {
            dataWithTitle = [['time', 'diff', 'Yeah']].concat(timeSeriesData);
            vData = google.visualization.arrayToDataTable(dataWithTitle);
            chart.draw(vData, chartOptions);
        }
    }

    var doFindCnt = 0;
    var doFindFeatures = function(context) {
        if (isVideoStopped) {
            doFindCnt = 0;
            return;
        }
        doFindCnt++;
        now = (new Date()).getTime() / 1000;
        if (!startTime) {
            startTime = now;
        }

        height = context.canvas.height;
        width = context.canvas.width;
        tracking.Fast.THRESHOLD = 100 - datParam.sensitivity;
        imageData = context.getImageData(0, 0, width, height);
        gray = tracking.Image.grayscale(imageData.data, width, height);
        corners = tracking.Fast.findCorners(gray, width, height);

        if (datParam.autoAdjust) {
            if (corners.length > 400 && datParam.sensitivity > 0) {
                datParam.sensitivity -= Math.max(2, Math.ceil((corners.length - 400) / 500));
                datParam.sensitivity = Math.max(0, datParam.sensitivity);
                for (var i in gui.__controllers) {
                    gui.__controllers[i].updateDisplay();
                }
            } else if (corners.length < 250 && datParam.sensitivity < 100) {
                datParam.sensitivity += Math.max(2, Math.ceil((250 - corners.length) / 100));
                datParam.sensitivity = Math.min(100, datParam.sensitivity);
                for (var i in gui.__controllers) {
                    gui.__controllers[i].updateDisplay();
                }
            }
        }

        for (i = 0; i < corners.length; i += 2) {
            context.fillStyle = '#f00';
            context.fillRect(corners[i], corners[i + 1], 3, 3);
        }

        descriptors = tracking.Brief.getDescriptors(gray, width, corners);
        if (lastDescriptors && lastCorners) {
            matches = tracking.Brief.reciprocalMatch(lastCorners, lastDescriptors, corners, descriptors);
            diff = corners.length - matches.length;
            len = timeSeriesData.length;
            if (len >= 3) {
                yeah = (diff * 2 + timeSeriesData[len-1][1] + timeSeriesData[len-2][1] + timeSeriesData[len-3][1]) / 4;
                if (doFindCnt > 3) {
                    addEffect(yeah);
                }
            } else {
                yeah = 0;
            }
            timeSeriesData.push([
                now - startTime,
                diff,
                yeah
            ]);
            if (len > 99) {
                timeSeriesData = timeSeriesData.slice(len - 99);
            }
            drawChart(timeSeriesData);
        }

        lastDescriptors = descriptors;
        lastCorners = corners;
    };

    navigator.getUserMedia({audio: false, video: videoConstraints}, function(stream){
        myStream = stream;
        videoElm.src = URL.createObjectURL(myStream);
    }, function(){});

    setInterval(function() {
        if (myStream) {
            canvas.width = videoElm.clientWidth;
            canvas.height = videoElm.clientHeight;
            ctx.drawImage(videoElm, 0, 0);
            doFindFeatures(ctx);
        }
    }, captureInterval);

    var DatParam = function() {
        this.sensitivity = 50;
        this.autoAdjust = true;
        this.showCapturePanel = false;
        this.modeCamera = function() {
            videoElm.controls = false;
            videoElm.src = URL.createObjectURL(myStream);
        };
        this.modeFile = function() {
            videoElm.controls = true;
            videoElm.src = "./assets/kazuhiro.mp4";
        };
    };
    var gui = new dat.GUI();
    var datParam = new DatParam();
    gui.add(datParam, 'sensitivity', 0, 100).onChange(function() {
        doFindFeatures(ctx);
    });
    gui.add(datParam, 'autoAdjust');
    gui.add(datParam, 'showCapturePanel').onChange(function() {
        if (datParam.showCapturePanel) {
            videoElm.style.opacity = 0;
        } else {
            videoElm.style.opacity = 1;
        }
    });
    gui.add(datParam, 'modeCamera');
    gui.add(datParam, 'modeFile');

    var colorList = ['pink', 'blue', 'yellow', 'green', 'orange', 'violet'];
    var magicLayer = document.getElementById('magic-layer');
    var z, cnt, particleSize, delay, index, color;
    function addEffect(value) {
        value = Math.floor(value);
        var innerMagicLayer = document.createElement('div');
        innerMagicLayer.classList.add('inner-magic-layer');
        cnt = Math.floor(value / 60);
        if (cnt == 0) {
            return;
        } else if (cnt < 5) {
            particleSize = 'sm';
        } else if (cnt < 10) {
            particleSize = 'md';
        } else {
            particleSize = 'lg';
        }
        cnt = (cnt > 12) ? 12 : cnt;

        var b = document.createElement('b');
        b.classList.add(particleSize);
        b.classList.add('magictime');
        for (z = 0; z < cnt; z++) {
            delay = captureInterval / cnt * z;
            index = 0;
            setTimeout(function() {
                bClone = b.cloneNode();
                bClone.style.top = Math.floor(Math.random() * deviceHeight) + "px";
                bClone.style.left = Math.floor(Math.random() * deviceWidth) + "px";
                color = colorList[(value+index++) % 6];
                bClone.classList.add(color);
                bClone.classList.add('puffIn');
                bClone.addEventListener('webkitAnimationEnd', function(e) {
                    e.srcElement.classList.add('puffOut');
                });
                bClone.addEventListener('animationEnd', function(e) {
                    e.srcElement.classList.add('puffOut');
                });
                innerMagicLayer.appendChild(bClone);
            }, delay);
        }
        magicLayer.appendChild(innerMagicLayer);
        setTimeout(function() {
            innerMagicLayer.parentNode.removeChild(innerMagicLayer);
        }, captureInterval * 2);
    };

    videos = document.querySelectorAll("video");
    for (var i = 0, l = videos.length; i < l; i++) {
        var video = videos[i];
        var src = video.src || (function () {
            var sources = video.querySelectorAll("source");
            for (var j = 0, sl = sources.length; j < sl; j++) {
                var source = sources[j];
                var type = source.type;
                var isMp4 = type.indexOf("mp4") != -1;
                if (isMp4) return source.src;
            }
            return null;
        })();
        if (src) {
            var isYoutube = src && src.match(/(?:youtu|youtube)(?:\.com|\.be)\/([\w\W]+)/i);
            if (isYoutube) {
                var id = isYoutube[1].match(/watch\?v=|[\w\W]+/gi);
                id = (id.length > 1) ? id.splice(1) : id;
                id = id.toString();
                var mp4url = "http://www.youtubeinmp4.com/redirect.php?video=";
                video.src = mp4url + id;
            }
        }
    }

}

function getDeviceHeight() {
    return window.innerHeight || document.documentElement.offsetHeight || screen.height;
};
function getDeviceWidth() {
    return window.innerWidth || document.documentElement.offsetWidth || screen.width;
};
var deviceHeight = getDeviceHeight();
var deviceWidth = getDeviceWidth();
var html = document.querySelector('html');

function fixViewportHeight() {
    function _onResize(event) {
        html.style.height = getDeviceHeight() + 'px';
    };
    window.addEventListener('resize', debounce(_onResize, 125), true);
    _onResize();
};

// https://snippetrepo.com/snippets/basic-vanilla-javascript-throttlingdebounce
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        }, wait);
        if (immediate && !timeout) func.apply(context, args);
    };
};
