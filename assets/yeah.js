var captureInterval = 1000;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var videoConstraints = {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 400, ideal: 720, max: 1080 },
    facingMode: "user",
    frameRate: { ideal: 10, max: 15 }
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
function DatParam() {
    this.sensitivity = 60;
    this.autoAdjust = true;
    this.showCapturePanel = false;
    this.playCamera = function() {
        videoElm.controls = false;
        turnOnVideo();
    };
    this.playDance = function() {
        videoElm.controls = true;
        videoElm.src = "./assets/kazuhiro.mp4";
        initCanvasByVideo();

        myStream.getTracks()[0].stop();
    };
    this.playGame = function() {
        videoElm.controls = true;
        videoElm.src = "./assets/umehara.mp4";
        initCanvasByVideo();

        myStream.getTracks()[0].stop();
    };
};
var datParam = new DatParam();
var i, z, y, height, width, imageData, gray, myStream, dataWithTitle, vData, yeah, len, scale,
    matches, lastCorners, lastDescriptors, corners, descriptors, startTime, now, diff, videoElm, gui, canvas, ctx,
    chartElm, chart, magicLayer;
var isVideoStopped = false, baseHeight = 128, doFindCnt = 0, tsData = [];
var tmpCanvas = document.createElement('canvas');
var tmpCtx = tmpCanvas.getContext('2d');

var colorList = ['pink', 'blue', 'yellow', 'green', 'orange', 'violet'];
var colorListLen = colorList.length;
var innerMagicLayerTpl = document.createElement('div');
innerMagicLayerTpl.classList.add('inner-magic-layer');
var bTpl = document.createElement('b');
bTpl.classList.add('magictime');
var cnt, particleSize, delay, index, color;

google.charts.load('current', {'packages':['corechart']});

window.onload = function() {
    fixViewportHeight();
    videoElm = document.getElementById('video');
    setVideoEventListener(videoElm);

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    chartElm = document.getElementById('curve_chart');
    chart = new google.visualization.LineChart(chartElm);

    magicLayer = document.getElementById('magic-layer');

    // fadeIn
    var demoContainer = document.getElementById('demo-container');
    setTimeout(function() {
        demoContainer.style.opacity = 1;
    }, 1000);

    turnOnVideo();
    initDatGUI();

    setInterval(function() {
        if (!isVideoStopped) {
            ctx.drawImage(videoElm, 0, 0);
            tmpCtx.drawImage(videoElm, 0, 0, tmpCanvas.width, tmpCanvas.height);
            // make delay to save some CPU usage. (I hope)
            setTimeout(function() {
                findFeatures(ctx);
            }, 100);
        }
    }, captureInterval);

}

function turnOnVideo() {
    navigator.getUserMedia({audio: false, video: videoConstraints}, function(stream){
        myStream = stream;
        videoElm.src = URL.createObjectURL(myStream);
        initCanvasByVideo();
    }, function() {});
};

function addEffect(value) {
    value = Math.floor(value);
    var fragment = document.createDocumentFragment();
    var innerMagicLayer = innerMagicLayerTpl.cloneNode();
    cnt = Math.floor(value / 5);
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

    b = bTpl.cloneNode();
    b.classList.add(particleSize);
    var bList = [], index = 0;
    for (z = 0; z < cnt; z++) {
        bClone = b.cloneNode();
        bClone.style.top = Math.floor(Math.random() * deviceHeight) + "px";
        bClone.style.left = Math.floor(Math.random() * deviceWidth) + "px";
        color = colorList[(value + z) % colorListLen];
        bClone.classList.add(color);
        fragment.appendChild(bClone);
        bList.push(bClone);
        delay = captureInterval / cnt * z;
        setTimeout(function() {
            bList[index].classList.add('puffInOut');
            index++;
        }, delay);
    }
    innerMagicLayer.appendChild(fragment);
    magicLayer.appendChild(innerMagicLayer);
    setTimeout(function() {
        innerMagicLayer.parentNode.removeChild(innerMagicLayer);
    }, captureInterval * 2);
};

function findFeatures(context) {
    if (isVideoStopped) {
        doFindCnt = 0;
        lastCorners = void 0;
        lastDescriptors = void 0;
        return;
    }
    doFindCnt++;
    now = Math.round((new Date()).getTime() / 1000);
    if (!startTime) {
        startTime = now;
    }

    height = context.canvas.height;
    width = context.canvas.width;
    tracking.Fast.THRESHOLD = 100 - datParam.sensitivity;
    imageData = getScaledImageData();
    gray = tracking.Image.grayscale(imageData.data, imageData.width, imageData.height);
    corners = tracking.Fast.findCorners(gray, imageData.width, imageData.height);

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

    if (datParam.showCapturePanel) {
        for (i = 0; i < corners.length; i += 2) {
            context.fillStyle = '#f00';
            context.fillRect(corners[i] * (1/scale), corners[i + 1] * (1/scale), 4, 4);
        }
    }

    descriptors = tracking.Brief.getDescriptors(gray, width, corners);
    if (corners.length > 0 && lastDescriptors && lastCorners) {
        matches = tracking.Brief.match(lastCorners, lastDescriptors, corners, descriptors);
        if (datParam.showCapturePanel) {
            for (i = 0; i < matches.length; i += 2) {
                context.fillStyle = '#0f0';
                context.fillRect(matches[i].keypoint1[0] * (1/scale), matches[i].keypoint1[1] * (1/scale), 4, 4);
            }
        }

        // 双方向のマッチ処理: 負荷が高いので一時カット
        // matches = tracking.Brief.reciprocalMatch(lastCorners, lastDescriptors, corners, descriptors);
        diff = (1 - Math.min(1, matches.length / corners.length)) * 100;
        yeah = calcYeah(diff, tsData);
        if (doFindCnt > 3) {
            addEffect(yeah);
        }
        tsData.push([now - startTime, diff, yeah]);
        if (len > 59) {
            tsData = tsData.slice(len - 59);
        }
        drawChart(tsData);

//
//        len = tsData.length;
//        if (len >= 2) {
//            yeah = (Math.abs(diff - tsData[len-1][1]) * 2
//                + Math.abs(tsData[len-1][1] - tsData[len-2][1])) / 3;
//            if (doFindCnt > 3) {
//                addEffect(yeah);
//            }
//        } else {
//            yeah = 0;
//        }
//        tsData.push([now - startTime, diff, yeah]);
//        if (len > 59) {
//            tsData = tsData.slice(len - 59);
//        }
//        drawChart(tsData);
    }

    lastDescriptors = descriptors;
    lastCorners = corners;
};

function calcYeah(currentValue, tsData) {
    len = tsData.length;
    if (len >= 2) {
        yeah = (Math.abs(currentValue - tsData[len-1][1]) * 2
            + Math.abs(tsData[len-1][1] - tsData[len-2][1])) / 3;
    } else {
        yeah = 0;
    }
    return yeah;
}

function drawChart(tsData) {
    if (chart) {
        if (!vData) {
            dataWithTitle = [['time', 'diff', 'Yeah']].concat(tsData);
            vData = google.visualization.arrayToDataTable(dataWithTitle);
        } else {
            if (vData.getNumberOfRows() >= 61) {
                vData.removeRow(0);
            }
            vData.addRow(tsData[tsData.length - 1]);
        }
        chart.draw(vData, chartOptions);
    }
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
        tmpCanvas.width = canvas.width * scale;
        tmpCanvas.height = canvas.height * scale;
        videoElm.style.opacity = 1;
        canvas.style.opacity = 1;
    }, delay);
};

function initDatGUI() {
    gui = new dat.GUI();
    gui.add(datParam, 'sensitivity', 0, 100);
    gui.add(datParam, 'autoAdjust');
    gui.add(datParam, 'showCapturePanel').onChange(function() {
        if (datParam.showCapturePanel) {
            videoElm.style.opacity = 0.5;
        } else {
            videoElm.style.opacity = 1;
        }
    });
    gui.add(datParam, 'playCamera');
    gui.add(datParam, 'playDance');
    gui.add(datParam, 'playGame');
};


/* utilities */
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
