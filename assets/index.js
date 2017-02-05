'use strict';
(function(global, undefined) {
    let ua = navigator.userAgent.toLowerCase();
    let device = (() => {
        if(ua.indexOf('iphone') > 0 || ua.indexOf('ipod') > 0 || (ua.indexOf('android') > 0 && ua.indexOf('mobile')) > 0){
            return 'sp';
        }else if(ua.indexOf('ipad') > 0 || ua.indexOf('android') > 0){
            return 'tab';
        }else{
            return 'other';
        }
    })();
    let isIOS = (ua.search(/iphone|ipad|ipod/) > -1);

    let CanvasJS = global.CanvasJS || {};
    let dat = global.dat || {};
    let deviceHeight, deviceWidth,
        html = document.querySelector('html');

    if (!navigator.getUserMedia) {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;
    }

    /* params and elements related to yeah.js */
    let myStream, videoElm, gui;
    let videoConstraints = {
        facingMode: 'user',
        width:      { min: 350, ideal: 1280, max: 1920 },
        height:     { min: 200, ideal: 720, max: 1080 },
        frameRate:  { ideal: 10, max: 15 }
    };
    let datParam = {
        captureInterval:         1000,
        minCaptureInterval:      500,
        maxCaptureInterval:      3000,
        stepCaptureInterval:     250,
        sensitivity:             60,
        minSensitivity:          0,
        maxSensitivity:          100,
        isAutoAdjustSensitivity: true,
        isShowCapturePanel:      false,

        'sample:WebCamera': function() {
            videoElm.controls = false;
            turnOnVideo();
            closeDatGUIContorlPanel();
        },
        'sample:DanceMovie': function() {
            videoElm.controls = true;
            yeah.playVideo('./assets/media/kazuhiro.mp4');
            if (myStream) {
                myStream.getTracks()[0].stop();
            }
            closeDatGUIContorlPanel();
        },
        'sample:GameMovie': function() {
            videoElm.controls = true;
            yeah.playVideo('./assets/media/umehara.mp4');
            if (myStream) {
                myStream.getTracks()[0].stop();
            }
            closeDatGUIContorlPanel();
        }
    };

    /* params related to CanvasJS chart */
    let chartOptions = {
        theme:           'theme2',
        zoomEnabled:     false,
        backgroundColor: 'transparent',
        toolTip:         { shared: true },

        axisX: {
            includeZero: false,
            interval:    10
        },
        axisY: {
            includeZero: false,
            maximum:     100,
            minimum:     0,
            interval:    25,
            gridColor:   'silver',
            tickColor:   'silver'
        },
        legend: {
            fontColor:       'silver',
            verticalAlign:   'bottom',
            horizontalAlign: 'center',
            fontSize:        12,
            fontFamily:      'Lucida Sans Unicode',
            cursor:          'pointer',

            itemclick: function(event) {
                if (event.dataSeries.visible === undefined || event.dataSeries.visible) {
                    event.dataSeries.visible = false;
                } else {
                    event.dataSeries.visible = true;
                }
                chart.render();
            }
        },
        data: [
            {
                type:            'line',
                markerType:      'none',
                lineThickness:   3,
                showInLegend:    true,
                name:            'changing-rate',
                color:           'darkorange',
                connectNullData: true,
                dataPoints:      []
            },
            {
                type:            'line',
                markerType:      'none',
                lineThickness:   3,
                showInLegend:    true,
                name:            'Yeah',
                color:           'limegreen',
                connectNullData: true,
                dataPoints:      []
            }
        ]
    };
    const CHART_TYPE_YEAH = 'Yeah';
    const CHART_TYPE_CHANGING_RATE = 'changing-rate';
    let chart, dataKey;

    /* params and elements related to particle */
    const MAX_PARTICLE_CNT = 12;
    const COLOR_LIST = ['pink', 'blue', 'yellow', 'green', 'orange', 'violet'];
    const COLOR_LIST_SIZE = COLOR_LIST.length;
    let innerMagicLayerTpl = document.createElement('div');
    innerMagicLayerTpl.classList.add('inner-magic-layer');
    let bTpl = document.createElement('b');
    bTpl.classList.add('magictime');
    let magicLayer, particleSize, cnt, bTplForSize, bClone, delay, color, delayPerClone;

    /**
     * You can also call with requireJS like this:
     * @HTML
     * <head>
     *     <script data-main='./assets/index.js' src='./bower_components/requirejs/require.js'></script>
     * </head>
     *
     * @Javascript(index.js)
     *    require(['../lib/yeah'], function(yeah) {
     *        init();
     *    });
     */
    document.addEventListener('DOMContentLoaded', init, false);

    function init() {
        fixViewportHeight();
        initDatGUI();
        magicLayer = document.getElementById('animation-layer');

        chart = new CanvasJS.Chart('chart', chartOptions);
        chart.render();

        videoElm = document.getElementById('video');
        yeah.setVideoElement(videoElm);
        yeah.setOptions(datParam);
        if (device === 'sp') {
            yeah.setMarkerSize(3);
        }
        yeah.startCaptureVideo(yeahCallback);
        turnOnVideo();
    }

    function yeahCallback(data) {
        addEffect(data.yeah);
        data.time = round(data.time / 1000, 2);
        appendChartData(CHART_TYPE_CHANGING_RATE, {
            x: data.time,
            y: (data.matchRate === null) ? null : (100 - round(data.matchRate, 2))
        });
        appendChartData(CHART_TYPE_YEAH, {
            x: data.time,
            y: (data.yeah === null) ? null : round(data.yeah, 2)
        });
        chart.render();
        if (data.sensitivity && (datParam.sensitivity !== data.sensitivity)) {
            datParam.sensitivity = data.sensitivity;
            updateDatParamManually();
        }
    }

    function turnOnVideo() {
        if (navigator.getUserMedia) {
            navigator.getUserMedia({ audio: false, video: videoConstraints }, function(stream) {
                myStream = stream;
                yeah.playVideo(URL.createObjectURL(myStream), 2000);
            }, function() {});
        } else {
            alert("This device doesn't support web camera. Please try sample movies listed on control panel above.")
        }
    }

    function addEffect(value) {
        value = Math.floor(value);
        cnt = Math.floor(value / 5);
        if (cnt === 0) {
            return;
        }
        let fragment = document.createDocumentFragment();
        let innerMagicLayer = innerMagicLayerTpl.cloneNode();

        bTplForSize = bTpl.cloneNode();
        particleSize = getParticleSizeClass(cnt);
        bTplForSize.classList.add(particleSize);

        cnt = (cnt > MAX_PARTICLE_CNT) ? MAX_PARTICLE_CNT : cnt;
        delayPerClone = Math.floor(datParam.captureInterval / cnt);
        while (cnt--) {
            delay = delayPerClone * cnt;
            color = COLOR_LIST[(value + cnt) % COLOR_LIST_SIZE];
            bClone = bTplForSize.cloneNode();
            bClone.style.top = Math.floor(Math.random() * deviceHeight) + 'px';
            bClone.style.left = Math.floor(Math.random() * deviceWidth) + 'px';
            bClone.classList.add(color);
            // Set delay before append elm to prevent from updating view.
            bClone.style.animationDelay = delay + 'ms';
            bClone.style.webkitAnimationDelay = delay + 'ms';
            bClone.style.mozAnimationDelay = delay + 'ms';
            bClone.classList.add('puffInOut');
            fragment.appendChild(bClone);
        }
        // This doesn't seem to make difference in this case because children will be wrapped anyway.
        innerMagicLayer.appendChild(fragment);
        magicLayer.appendChild(innerMagicLayer);
        setTimeout(function() {
            innerMagicLayer.parentNode.removeChild(innerMagicLayer);
            innerMagicLayer = undefined;
        }, datParam.captureInterval * 2);
    }

    function getParticleSizeClass(value) {
        if (value < 5) {
            return 'sm';
        } else if (value < 10) {
            return 'md';
        } else {
            return 'lg';
        }
    }

    function updateDatParamManually() {
        let controllerSize = gui.__controllers.length;
        while(controllerSize--) {
            gui.__controllers[controllerSize].updateDisplay();
        }
    }

    function appendChartData(type, rowData) {
        if (type === CHART_TYPE_CHANGING_RATE) {
            dataKey = 0;
        } else if (type === CHART_TYPE_YEAH) {
            dataKey = 1;
        }
        if (chart.options.data[dataKey].dataPoints.length >= 60) {
            chart.options.data[dataKey].dataPoints.shift();
        }
        chart.options.data[dataKey].dataPoints.push(rowData);
    }

    function initDatGUI() {
        gui = new dat.GUI();
        if (device === 'sp') {
            gui.closed = true;
        }
        gui.add(
            datParam,
            'captureInterval',
            datParam.minCaptureInterval,
            datParam.maxCaptureInterval
        ).step(datParam.stepCaptureInterval).onChange(function() {
            yeah.setCaptureInterval(datParam.captureInterval);
            yeah.startCaptureVideo(yeahCallback);
        });
        gui.add(datParam, 'sensitivity', datParam.minSensitivity, datParam.maxSensitivity).onChange(function() {
            yeah.setSensitivity(datParam.sensitivity);
        });
        gui.add(datParam, 'isAutoAdjustSensitivity').onChange(function() {
            yeah.setIsAutoAdjustSensitivity(datParam.isAutoAdjustSensitivity);
        });
        gui.add(datParam, 'isShowCapturePanel').onChange(function() {
            yeah.setIsShowCapturePanel(datParam.isShowCapturePanel);
        });
        gui.add(datParam, 'sample:WebCamera');
        gui.add(datParam, 'sample:DanceMovie');
        gui.add(datParam, 'sample:GameMovie');
    }

    /* utilities */
    function getDeviceHeight() {
        return global.innerHeight || document.documentElement.offsetHeight || screen.height;
    }
    function getDeviceWidth() {
        return global.innerWidth || document.documentElement.offsetWidth || screen.width;
    }
    deviceHeight = getDeviceHeight();
    deviceWidth = getDeviceWidth();

    function fixViewportHeight() {
        function _onResize() {
            html.style.height = getDeviceHeight() + 'px';
            html.style.width = getDeviceWidth() + 'px';
        }
        global.addEventListener('resize', debounce(_onResize, 125), true);
        _onResize();
    }

    // https://snippetrepo.com/snippets/basic-vanilla-javascript-throttlingdebounce
    function debounce(func, wait, immediate) {
        let timeout;
        return function() {
            let context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            }, wait);
            if (immediate && !timeout) {
                func.apply(context, args);
            }
        };
    }

    function round(base, digit) {
        return Math.round(base * Math.pow(10, digit)) / Math.pow(10, digit);
    }

    function closeDatGUIContorlPanel() {
        if (device === 'sp') {
            setTimeout(function() {
                gui.closed = true;
            }, 300);
        }
    }

})((this || 0).self || global);
