'use strict';
(function(name, entity) {
    let instance = entity();
    // This is only for unit test.
    if (typeof module !== 'undefined') {
        module['exports'] = instance;
    } else {
        window[name] = instance;
        instance.createCanvas();
    }
    return instance;

}) ('yeah', function(global) {
    let tracking = global.tracking || {};
    /**
     * A utility to convert video into its excitement score.
     *
     * @class Yeah
     * @param {Object} options Options for tracking
     * @constructor
     */
    function Yeah() {
        const MAX_TRACKING_FAST_THRESHOLD = 100;
        const MAX_SENSITIVITY = 100;
        const MIN_SENSITIVITY = 0;
        const DEFAULT_SENSITIVITY = 60;
        const MIN_CAPTURE_INTERVAL = 250;
        const DEFAULT_CAPTURE_INTERVAL = 1000;
        const DELAY_TO_DECENTRALIZE_CPU_USAGE = 200;
        const CAPTURE_OFFSET_TOP = 0;
        const CAPTURE_OFFSET_LEFT = 0;
        const CANVAS_HEIGHT_FOR_CALCULATION = 128;
        const DEFAULT_DELAY_FOR_VIDEO_INIT = 1000;
        const DEFAULT_MARKER_SIZE = 4;
        const DEFAULT_OPACITY = 1;
        const OVER_WRAPPED_OPACITY = 0.5;
        const HIDDEN_OPACITY = 0;

        const MIN_DATA_TO_CALC_YEAH = 2;

        const MIN_SENSITIVITY_AUTO_ADJUSTMENT = 2;
        const MAX_MODERATE_CORNER_COUNT = 400;
        const MIN_MODERATE_CORNER_COUNT = 250;
        const MAX_SENSITIVITY_ADJUST_DENOMINATOR = 500;
        const MIN_SENSITIVITY_ADJUST_DENOMINATOR = 100;
        const MAX_MATCH_RATE = 100;
        const MAX_YEAH_SCORE = 100;
        const MIN_YEAH_SCORE = 0;

        const INVERSE_BASE = 1;

        let videoElm, userCanvas, userCtx, calcCanvas, calcCtx;

        let options = {
            captureInterval:         DEFAULT_CAPTURE_INTERVAL,
            sensitivity:             DEFAULT_SENSITIVITY,
            isShowCapturePanel:      false,
            isAutoAdjustSensitivity: true,
            markerSize:              DEFAULT_MARKER_SIZE
        };

        let now, startTime, loopCnt, scale, scaleInverse, imageData, gray, matchRate, matchList, match,
            customYeahCalculator, lastCornerList, lastDescriptorList, cornerList, descriptorList, tsDataCnt,
            captureIntervalTimer, tsDataList = new Array();

        /**
         * Get flag for video playing status
         * http://www.w3schools.com/TagS/ref_av_dom.asp
         *
         * @method isVideoPaused
         * @return {Boolean} Flag for video playing status (stop: true, playing: false)
         */
        function isVideoPaused() {
            return (videoElm !== undefined) ? videoElm.paused : false;
        }

        /**
         * Promise to make delay
         *
         * @method delayTimer
         * @param {Number} delay Delay time for resolve timer (ms)
         * @return {Object} Promise object to make delay like setTimeout
         */
        function delayTimer(delay) {
            return new Promise((resolve) => {
                setTimeout(resolve, delay);
            });
        }

        /**
         * Promise to wrap processing
         *
         * @method pEmit
         * @param {Function} func Function to be wrapped by Promise
         * @return {Object} Promise object for some processing
         */
        function pEmit(func) {
            return new Promise((resolve, reject) => {
                try {
                    let result = func();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }

        return {
            /**
             * Create canvas
             *
             * @method createCanvas
             */
            createCanvas: function() {
                if (userCanvas === undefined) {
                    userCanvas = document.createElement('canvas');
                    userCtx = userCanvas.getContext('2d');
                    calcCanvas = document.createElement('canvas');
                    calcCtx = calcCanvas.getContext('2d');
                }
            },
            /**
             * Set options
             *
             * @method SetOptions
             * @param {Object} newOptions Options to be set
             * @return {Object} Accepted options
             */
            setOptions: function(newOptions) {
                if (newOptions.captureInterval !== undefined) {
                    this.setCaptureInterval(newOptions.captureInterval);
                }
                if (newOptions.sensitivity !== undefined) {
                    this.setSensitivity(newOptions.sensitivity);
                }
                if (newOptions.isShowCapturePanel !== undefined) {
                    this.setIsShowCapturePanel(newOptions.isShowCapturePanel);
                }
                if (newOptions.isAutoAdjustSensitivity !== undefined) {
                    this.setIsAutoAdjustSensitivity(newOptions.isAutoAdjustSensitivity);
                }
                if (newOptions.markerSize !== undefined) {
                    this.setMarkerSize(newOptions.markerSize);
                }
                return options;
            },
            /**
             * Set video element
             *
             * @param {Object} targetVideoElm A video element as a capture target
             */
            setVideoElement: function(targetVideoElm) {
                if (videoElm === undefined) {
                    videoElm = targetVideoElm;
                    videoElm.parentNode.insertBefore(userCanvas, videoElm.nextSibling);
                }
            },
            /**
             * Set video src
             *
             * @method setVideoSrc
             * @param {String} src Video source url
             */
            setVideoSrc: function(src) {
                videoElm.src = src;
                this.clearLastCaptureInfo();
            },
            /**
             * Get capture interval
             *
             * @method getCaptureInterval
             * @return {Number} Capture interval
             */
            getCaptureInterval: function() {
                return options.captureInterval;
            },
            /**
             * Set capture interval
             *
             * @method setCaptureInterval
             * @param {Number} newCaptureInterval Capture interval to be set
             */
            setCaptureInterval: function(newCaptureInterval) {
                options.captureInterval = Math.max(MIN_CAPTURE_INTERVAL, newCaptureInterval);
            },
            /**
             * Get sensitivity
             *
             * @method getSensitivity
             * @return {Number} Sensitivity
             */
            getSensitivity: function() {
                return options.sensitivity;
            },
            /**
             * Update sensitivity
             *
             * @method setSensitivity
             * @param {Number} newSensitivity Sensitivity to be set
             */
            setSensitivity: function(newSensitivity) {
                newSensitivity = Math.min(MAX_SENSITIVITY, newSensitivity);
                newSensitivity = Math.max(MIN_SENSITIVITY, newSensitivity);
                options.sensitivity = newSensitivity;
            },
            /**
             * Get flag for showing capture panel
             *
             * @method getIsShowCapturePanel
             * @return {Boolean} Flag for show capture panel
             */
            isShowCapturePanel: function() {
                return options.isShowCapturePanel;
            },
            /**
             * Set flag for showing capture panel
             *
             * @method setIsShowCapturePanel
             * @param {Boolean} bool Flag to be set
             */
            setIsShowCapturePanel: function(bool) {
                options.isShowCapturePanel = bool;
                videoElm.style.opacity = bool ? OVER_WRAPPED_OPACITY : DEFAULT_OPACITY;
            },
            /**
             * Get flag for auto sensitivity adjustment
             *
             * @method getIsAutoAdjustSensitivity
             * @return {Boolean} Flag for auto sensitivity adjustment
             */
            isAutoAdjustSensitivity: function() {
                return options.isAutoAdjustSensitivity;
            },
            /**
             * Set flag for auto sensitivity adjustment
             *
             * @method setIsAutoAdjustSensitivity
             * @param {Boolean} bool Flag to be set
             */
            setIsAutoAdjustSensitivity: function(bool) {
                options.isAutoAdjustSensitivity = bool;
            },
            /**
             * Set marker size
             *
             * @method setMarkerSize
             * @param {Number} newMarkerSize Marker size to be set
             */
            setMarkerSize: function(newMarkerSize) {
                options.markerSize = newMarkerSize;
            },
            /**
             * Initialize canvas by video element
             *
             * @method initCanvasByVideo
             * @param {Number} delay Delay for copying height and width from video element
             * @return {Object} Promise object
             */
            initCanvasByVideo: function(delay) {
                delay = delay || DEFAULT_DELAY_FOR_VIDEO_INIT;
                videoElm.style.opacity = HIDDEN_OPACITY;
                userCanvas.style.opacity = HIDDEN_OPACITY;
                return delayTimer(delay)
                .then(function() {
                    userCanvas.width = videoElm.clientWidth;
                    userCanvas.height = videoElm.clientHeight;
                    scale = CANVAS_HEIGHT_FOR_CALCULATION / userCanvas.height;
                    scaleInverse = INVERSE_BASE / scale;
                    calcCanvas.width = userCanvas.width * scale;
                    calcCanvas.height = userCanvas.height * scale;
                    videoElm.style.opacity = options.isShowCapturePanel ?
                        OVER_WRAPPED_OPACITY : DEFAULT_OPACITY;
                    userCanvas.style.opacity = DEFAULT_OPACITY;
                });
            },
            /**
             * Stop capturing video element
             *
             * @method stopCaptureVideo
             */
            stopCaptureVideo: function() {
                if (captureIntervalTimer) {
                    clearInterval(captureIntervalTimer);
                }
            },
            /**
             * Start capturing video element to canvas
             *
             * @method startCaptureVideo
             * @param {Function} successCallback Callback after getting capture data
             * @param {Function} failureCallback Callback for getting error for each capture loop
             */
            startCaptureVideo: function(successCallback, failureCallback) {
                this.stopCaptureVideo();
                captureIntervalTimer = setInterval(() => {
                    if (!isVideoPaused()) {
                        if (options.isShowCapturePanel) {
                            userCtx.drawImage(videoElm, CAPTURE_OFFSET_LEFT, CAPTURE_OFFSET_TOP, videoElm.clientWidth, videoElm.clientHeight);
                        }
                        calcCtx.drawImage(videoElm, CAPTURE_OFFSET_LEFT, CAPTURE_OFFSET_TOP, calcCanvas.width, calcCanvas.height);
                    } else {
                        this.clearLastCaptureInfo();
                    }
                    delayTimer(DELAY_TO_DECENTRALIZE_CPU_USAGE)
                    .then(this.findFeatures)
                    .then((data) => pEmit(() => {
                        data.time = data.now - startTime;
                        if (!isVideoPaused()) {
                            data.isSensitivityAdjusted = this.autoAdjustSensitivity(data.cornerList.length);
                            data.yeah = this.calcYeah(data.matchRate, tsDataList);
                            this.fillTrackedPointsOnCanvas(data);
                            tsDataList.push(data);
                        } else {
                            data.isSensitivityAdjusted = false;
                            data.yeah = null;
                        }
                        if (tsDataList.length > MIN_DATA_TO_CALC_YEAH) {
                            tsDataList.shift();
                        }
                        return data;
                    })).then((data) => {
                        successCallback(data);
                    }).catch((error) => {
                        if (failureCallback !== undefined) {
                            failureCallback(error);
                        }
                    });
                }, options.captureInterval);
            },
            /**
             * Set custom yeah calculator
             *
             * @method setCustomYeahCalculator
             * @param {Function} func Customized yeah calculator
             */
            setCustomYeahCalculator: function(func) {
                customYeahCalculator = func;
            },
            /**
             * Calculate yeah score from time series data set
             *
             * @method calcYeah
             * @param {Number} currentMatchRate Current match rate score
             * @param {Array} tsDataList List of corner detection and yeah score history data
             * @return {Number} Yeah score
             */
            calcYeah: function(currentMatchRate, tsDataList) {
                if (customYeahCalculator !== undefined) {
                    return customYeahCalculator(currentMatchRate, tsDataList);
                }

                let yeahScore;
                tsDataCnt = tsDataList.length;
                if (tsDataCnt >= MIN_DATA_TO_CALC_YEAH) {
                    /* eslint-disable */
                    yeahScore = (Math.abs(currentMatchRate - tsDataList[tsDataCnt - 1].matchRate) * 2
                        + Math.abs(tsDataList[tsDataCnt - 1].matchRate - tsDataList[tsDataCnt - 2].matchRate)) / 3;
                    /* eslint-enable */
                    yeahScore = Math.min(MAX_YEAH_SCORE, yeahScore);
                    yeahScore = Math.max(MIN_YEAH_SCORE, yeahScore);
                } else {
                    yeahScore = null;
                }
                return yeahScore;
            },
            /**
             * Clear last capture info
             *
             * @method clearLastCaptureInfo
             */
            clearLastCaptureInfo: function() {
                tsDataList = new Array();
                lastCornerList = undefined;
                lastDescriptorList = undefined;
            },
            /**
             * Find features from captured image on canvas
             *
             * @method findFeatures
             * @return {Object} Promise object to find features
             */
            findFeatures: function() {
                return pEmit(() => {
                    now = (new Date()).getTime();
                    if (startTime === undefined) {
                        startTime = now;
                    }
                    if (isVideoPaused()) {
                        return {
                            now:        now,
                            cornerList: [],
                            matchList:  [],
                            matchRate:  null
                        };
                    }

                    tracking.Fast.THRESHOLD = MAX_TRACKING_FAST_THRESHOLD - options.sensitivity;
                    imageData = calcCtx.getImageData(CAPTURE_OFFSET_LEFT, CAPTURE_OFFSET_TOP, calcCanvas.width, calcCanvas.height);
                    gray = tracking.Image.grayscale(imageData.data, imageData.width, imageData.height);
                    cornerList = tracking.Fast.findCorners(gray, imageData.width, imageData.height);

                    matchList = new Array();
                    descriptorList = tracking.Brief.getDescriptors(gray, imageData.width, cornerList);
                    if (cornerList.length && lastDescriptorList && lastCornerList) {
                        // tracking.Brief.reciprocalMatch is more accurate but takes higher cpu cost.
                        matchList = tracking.Brief.match(lastCornerList, lastDescriptorList, cornerList, descriptorList);
                        matchRate = Math.min(MAX_MATCH_RATE, matchList.length / cornerList.length * MAX_MATCH_RATE);
                    }

                    lastDescriptorList = descriptorList;
                    lastCornerList = cornerList;

                    return {
                        now:        now,
                        cornerList: cornerList,
                        matchList:  matchList,
                        matchRate:  matchRate
                    };
                });
            },
            /**
             * Fill marker on tracked corners and matched points
             *
             * @method fillTrackedPointsOnCanvas
             * @param {object} trackedData Tracked data points
             */
            fillTrackedPointsOnCanvas: function(trackedData) {
                if (!options.isShowCapturePanel) {
                    return;
                }
                userCtx.fillStyle = '#f00';
                loopCnt = trackedData.cornerList.length;
                // eslint-disable-next-line
                while ((loopCnt-=2)>=0) {
                    userCtx.fillRect(
                        trackedData.cornerList[loopCnt] * scaleInverse,
                        // eslint-disable-next-line
                        trackedData.cornerList[loopCnt + 1] * scaleInverse,
                        options.markerSize, options.markerSize
                    );
                }
                userCtx.fillStyle = '#0f0';
                loopCnt = trackedData.matchList.length;
                // eslint-disable-next-line
                while ((loopCnt-=2)>=0) { // Skip drawing the half of them.
                    match = trackedData.matchList[loopCnt].keypoint1;
                    userCtx.fillRect(
                        match[0] * scaleInverse, match[1] * scaleInverse,
                        options.markerSize, options.markerSize
                    );
                }
            },
            /**
             * Auto adjustment for sensitivity with found corner size
             *
             * @method autoAdjustSensitivity
             * @param {Number} cornerCnt Found corner size
             * @return {Boolean} Result flag for auto adjustment
             */
            autoAdjustSensitivity: function(cornerCnt) {
                if (!options.isAutoAdjustSensitivity) {
                    return false;
                }
                let isUpdate = false;
                if (cornerCnt > MAX_MODERATE_CORNER_COUNT && options.sensitivity > MIN_SENSITIVITY) {
                    options.sensitivity -= Math.max(
                        MIN_SENSITIVITY_AUTO_ADJUSTMENT,
                        Math.ceil((cornerCnt - MAX_MODERATE_CORNER_COUNT) / MAX_SENSITIVITY_ADJUST_DENOMINATOR)
                    );
                    options.sensitivity = Math.max(MIN_SENSITIVITY, options.sensitivity);
                    isUpdate = true;
                } else if (cornerCnt < MIN_MODERATE_CORNER_COUNT && options.sensitivity < MAX_SENSITIVITY) {
                    options.sensitivity += Math.max(
                        MIN_SENSITIVITY_AUTO_ADJUSTMENT,
                        Math.ceil((MIN_MODERATE_CORNER_COUNT - cornerCnt) / MIN_SENSITIVITY_ADJUST_DENOMINATOR)
                    );
                    options.sensitivity = Math.min(MAX_SENSITIVITY, options.sensitivity);
                    isUpdate = true;
                }
                return isUpdate;
            }
        };
    }
    return Yeah;
} (this.self || global));
