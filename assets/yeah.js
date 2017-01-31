navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var videoConstraints = {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 400, ideal: 720, max: 1080 },
    facingMode: "user",
    frameRate: { ideal: 10, max: 15 }
};
function DatParam() {
    this.captureInterval = 1000;
    this.sensitivity = 60;
    this.autoAdjust = true;
    this.showCapturePanel = false;
    this.captureCamera = function() {
        videoElm.controls = false;
        turnOnVideo();
    };
    this.captureDanceMovie = function() {
        videoElm.controls = true;
        videoElm.src = "./assets/kazuhiro.mp4";
        initCanvasByVideo();
        myStream.getTracks()[0].stop();
    };
    this.captureGameMovie = function() {
        videoElm.controls = true;
        videoElm.src = "./assets/umehara.mp4";
        initCanvasByVideo();
        myStream.getTracks()[0].stop();
    };
};
var datParam = new DatParam();
var i, z, y, imageData, gray, myStream, vData, yeah, tsDataSize, scale, scaleInverse,
    matches, corners, descriptors, lastCorners, lastDescriptors, cornersSize, matchesSize,
    startTime, now, diff, videoElm, gui, canvas, ctx, chart, magicLayer, captureIntvl;
var isVideoStopped = false, baseHeight = 128, doFindCnt = 0;
var tmpCanvas = document.createElement('canvas');
var tmpCtx = tmpCanvas.getContext('2d');

var colorList = ['pink', 'blue', 'yellow', 'green', 'orange', 'violet'];
var colorListLen = colorList.length;

var innerMagicLayerTpl = document.createElement('div');
innerMagicLayerTpl.classList.add('inner-magic-layer');
var bTpl = document.createElement('b');
bTpl.classList.add('magictime');
var cnt, particleSize, delay, index, color;
var w = window;

w.onload = function() {
    fixViewportHeight();
    videoElm = document.getElementById('video');
    setVideoEventListener(videoElm);

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    initChart();

    magicLayer = document.getElementById('magic-layer');

    turnOnVideo();
    initDatGUI();
    resetCaptureInterval();
}

function resetCaptureInterval() {
    if (captureIntvl) {
        clearInterval(captureIntvl);
    }
    captureIntvl = setInterval(function() {
        if (!isVideoStopped) {
            if (datParam.showCapturePanel) {
                ctx.drawImage(videoElm, 0, 0, videoElm.clientWidth, videoElm.clientHeight);
            }
            tmpCtx.drawImage(videoElm, 0, 0, tmpCanvas.width, tmpCanvas.height);
        }
        // make delay to save some CPU usage. (I hope)
        setTimeout(function() {
            findFeatures(ctx);
        }, 200);
    }, datParam.captureInterval);
}

function initChart() {
    chart = new CanvasJS.Chart("curve_chart", {
        theme: "theme2",
        zoomEnabled: false,
        axisX: {
            includeZero: false,
            interval: 10
        },
        axisY: {
            includeZero: false,
            maximum: 100,
            minimum: 0,
            interval: 25,
            gridColor: "silver",
            tickColor: "silver"
        },
        backgroundColor: "transparent",
        toolTip:{shared: true},
        legend:{
            fontColor: "silver",
            verticalAlign: "bottom",
            horizontalAlign: "center",
            fontSize: 12,
            fontFamily: "Lucida Sans Unicode",
            cursor:"pointer",
            itemclick : function(e) {
                if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                    e.dataSeries.visible = false;
                } else {
                    e.dataSeries.visible = true;
                }
                chart.render();
            }
        },
        data: [
            {
                type: "line",
                markerType: "none",
                lineThickness:3,
                showInLegend: true,
                name: "changing-rate",
                color: "darkorange",
                connectNullData: true,
                dataPoints: []
            },
            {
                type: "line",
                markerType: "none",
                lineThickness:3,
                showInLegend: true,
                name: "Yeah",
                color: "limegreen",
                connectNullData: true,
                dataPoints: []
            }
        ]
    });
    chart.render();
};

function turnOnVideo() {
    navigator.getUserMedia({audio: false, video: videoConstraints}, function(stream){
        myStream = stream;
        videoElm.src = URL.createObjectURL(myStream);
        initCanvasByVideo();
    }, function() {});
};

function addEffect(value) {
    value = Math.floor(value);
    cnt = Math.floor(value / 5);
    if (cnt == 0) {
        return;
    }
    var fragment = document.createDocumentFragment();
    var innerMagicLayer = innerMagicLayerTpl.cloneNode();
    particleSize = getParticleSizeClass(cnt);

    b = bTpl.cloneNode();
    b.classList.add(particleSize);

    cnt = (cnt > 12) ? 12 : cnt;
    var bList = new Array(), index = 0;
    for (z = 0; z < cnt; z++) {
        bClone = b.cloneNode();
        bClone.style.top = Math.floor(Math.random() * deviceHeight) + "px";
        bClone.style.left = Math.floor(Math.random() * deviceWidth) + "px";
        color = colorList[(value + z) % colorListLen];
        bClone.classList.add(color);
        delay = Math.floor(datParam.captureInterval / cnt * z);
        bClone.style.animationDelay = delay + 'ms';
        bClone.classList.add('puffInOut');
        fragment.appendChild(bClone);
    }
    innerMagicLayer.appendChild(fragment);
    magicLayer.appendChild(innerMagicLayer);
    setTimeout(function() {
        innerMagicLayer.parentNode.removeChild(innerMagicLayer);
        innerMagicLayer = null;
    }, datParam.captureInterval * 2);
};

function getParticleSizeClass(value) {
    if (value < 5) {
        return 'sm';
    } else if (value < 10) {
        return 'md';
    } else {
        return 'lg';
    }
}

function findFeatures(context) {
    now = Math.round((new Date()).getTime() / 100) / 10;
    if (!startTime) {
        startTime = now;
    }
    if (isVideoStopped) {
        doFindCnt = 0;
        lastCorners = void 0;
        lastDescriptors = void 0;
        appendChartData('changing-rate', {x:now - startTime, y: null});
        appendChartData('Yeah', {x:now - startTime, y: null});
        chart.render();
        return;
    }
    doFindCnt++;

    tracking.Fast.THRESHOLD = 100 - datParam.sensitivity;
    imageData = getScaledImageData();
    gray = tracking.Image.grayscale(imageData.data, imageData.width, imageData.height);
    corners = tracking.Fast.findCorners(gray, imageData.width, imageData.height);
    cornersSize = corners.length;

    autoAdjustSensitivity(datParam, cornersSize);

    matches = null, matchesSize = 0;
    descriptors = tracking.Brief.getDescriptors(gray, imageData.width, corners);
    if (cornersSize > 0 && lastDescriptors && lastCorners) {
        // 双方向のマッチ処理: 負荷が高いので一時カット
//        matches = tracking.Brief.reciprocalMatch(lastCorners, lastDescriptors, corners, descriptors);
        matches = tracking.Brief.match(lastCorners, lastDescriptors, corners, descriptors);
        matchesSize = matches.length;
        diff = Math.floor((1 - Math.min(1, matchesSize / cornersSize)) * 10000) / 100;
        yeah = calcYeah(diff, chart.options.data[0].dataPoints);
        if (doFindCnt > 3) {
            addEffect(yeah);
        }

        appendChartData('changing-rate', {x:now - startTime, y: diff});
        appendChartData('Yeah', {x:now - startTime, y: yeah});
        chart.render();
    }

    if (datParam.showCapturePanel) {
        for (i = 0; i < cornersSize; i += 2) {
            context.fillStyle = '#f00';
            context.fillRect(corners[i] * scaleInverse, corners[i + 1] * scaleInverse, 4, 4);
        }
        for (i = 0; i < matchesSize; i += 2) {
            context.fillStyle = '#0f0';
            context.fillRect(matches[i].keypoint1[0] * scaleInverse, matches[i].keypoint1[1] * scaleInverse, 4, 4);
        }
    }

    lastDescriptors = descriptors;
    lastCorners = corners;
};

function autoAdjustSensitivity(datParam, targetValue) {
    if (datParam.autoAdjust) {
        if (targetValue > 400 && datParam.sensitivity > 0) {
            datParam.sensitivity -= Math.max(2, Math.ceil((targetValue - 400) / 500));
            datParam.sensitivity = Math.max(0, datParam.sensitivity);
            updateDatParam();
        } else if (targetValue < 250 && datParam.sensitivity < 100) {
            datParam.sensitivity += Math.max(2, Math.ceil((250 - targetValue) / 100));
            datParam.sensitivity = Math.min(100, datParam.sensitivity);
            updateDatParam();
        }
    }
}

function updateDatParam() {
    for (var i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
}

function calcYeah(currentValue, dataPoints) {
    tsDataSize = dataPoints.length;
    if (tsDataSize >= 2) {
        yeah = (Math.abs(currentValue - dataPoints[tsDataSize-1].y) * 2
            + Math.abs(dataPoints[tsDataSize-1].y - dataPoints[tsDataSize-2].y)) / 3;
        yeah = Math.floor(yeah * 100) / 100
    } else {
        yeah = 0;
    }
    return yeah;
}

var dataKey;
function appendChartData(type, rowData) {
    if (type == chart.options.data[0].name) {
        dataKey = 0;
    } else if (type == chart.options.data[1].name) {
        dataKey = 1;
    }
    if (chart.options.data[dataKey].dataPoints.length >= 60) {
        chart.options.data[dataKey].dataPoints.shift();
    }
    chart.options.data[dataKey].dataPoints.push(rowData);
}

function getScaledImageData() {
    return tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
};

function getScale(height) {
    return baseHeight / height;
}

function setVideoEventListener(videoElm) {
    videoElm.addEventListener('play', function() {
        isVideoStopped = false;
    }, false);
    videoElm.addEventListener('ended', function() {
        isVideoStopped = true;
    }, false);
    videoElm.addEventListener('pause', function() {
        isVideoStopped = true;
    }, false);
}

function initCanvasByVideo(delay) {
    delay = (delay == void 0) ? 1000 : delay;
    videoElm.style.opacity = 0;
    canvas.style.opacity = 0;
    setTimeout(function() {
        canvas.width = videoElm.clientWidth;
        canvas.height = videoElm.clientHeight;
        scale = getScale(canvas.height);
        scaleInverse = 1 / scale;
        tmpCanvas.width = canvas.width * scale;
        tmpCanvas.height = canvas.height * scale;
        if (datParam.showCapturePanel) {
            videoElm.style.opacity = 0.5;
        } else {
            videoElm.style.opacity = 1;
        }
        canvas.style.opacity = 1;
    }, delay);
};

function initDatGUI() {
    gui = new dat.GUI();
    gui.add(datParam, 'captureInterval', 500, 3000).onChange(function() {
        resetCaptureInterval();
    });
    gui.add(datParam, 'sensitivity', 0, 100);
    gui.add(datParam, 'autoAdjust');
    gui.add(datParam, 'showCapturePanel').onChange(function() {
        if (datParam.showCapturePanel) {
            videoElm.style.opacity = 0.5;
        } else {
            videoElm.style.opacity = 1;
        }
    });
    gui.add(datParam, 'captureCamera');
    gui.add(datParam, 'captureDanceMovie');
    gui.add(datParam, 'captureGameMovie');
};


/* utilities */
function getDeviceHeight() {
    return w.innerHeight || document.documentElement.offsetHeight || screen.height;
};
function getDeviceWidth() {
    return w.innerWidth || document.documentElement.offsetWidth || screen.width;
};
var deviceHeight = getDeviceHeight();
var deviceWidth = getDeviceWidth();
var html = document.querySelector('html');

function fixViewportHeight() {
    function _onResize(event) {
        html.style.height = getDeviceHeight() + 'px';
    };
    w.addEventListener('resize', debounce(_onResize, 125), true);
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
