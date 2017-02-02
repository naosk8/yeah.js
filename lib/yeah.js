'use strict';
(function(window, undefined) {
    let tracking = window.tracking || {};
    /**
     * A utility to convert video into its excitement score.
     *
     * @class Yeah
     * @param {Object} options Options for tracking
     * @constructor
     */
    function Yeah(options) {
        const MAX_TRACKING_FAST_THRESHOLD = 100;
        const MAX_SENSITIVITY = 100;
        const MIN_SENSITIVITY = 0;

        const DEFAULT_SENSITIVITY = 60;
        const DEFAULT_CAPTURE_INTERVAL = 1000;
        const DELAY_TO_DECENTRALIZE_CPU_USAGE = 200;
        const CAPTURE_OFFSET_TOP = 0;
        const CAPTURE_OFFSET_LEFT = 0;
        const CANVAS_HEIGHT_FOR_CALCULATION = 128;
        const DEFAULT_DELAY_FOR_VIDEO_INIT = 1000;
        const DEFAULT_MARKER_SIZE = 4;
        const DEFAULT_FIND_COUNT = 0;

        const MIN_DATA_TO_CALC_YEAH = 3;

        const MIN_SENSITIVITY_AUTO_ADJUSTMENT = 2;
        const MAX_MODERATE_CORNER_COUNT = 400;
        const MIN_MODERATE_CORNER_COUNT = 250;
        const MAX_SENSITIVITY_ADJUST_DENOMINATOR = 500;
        const MIN_SENSITIVITY_ADJUST_DENOMINATOR = 100;
        const MAX_MATCH_RATE = 100;
        const MAX_YEAH_SCORE = 100;
        const MIN_YEAH_SCORE = 0;

        const INVERSE_BASE = 1;

        let isVideoStopped = false;
        let doFindCnt = DEFAULT_FIND_COUNT;
        let videoElm;
        let userCanvas = document.createElement('canvas');
        let userCtx = userCanvas.getContext('2d');
        let calcCanvas = document.createElement('canvas');
        let calcCtx = calcCanvas.getContext('2d');

        let captureInterval = options.captureInterval || DEFAULT_CAPTURE_INTERVAL;
        let sensitivity = options.sensitivity || DEFAULT_SENSITIVITY;
        let isShowCapturePanel = options.showCapturePanel || false;
        let isAutoAdjustSensitivity = options.autoAdjust || true;
        let markerSize = options.markerSize || DEFAULT_MARKER_SIZE;

        let now, startTime, loopCnt, scale, scaleInverse, imageData, gray, matchRate, matchList, match,
            customYeahCalculator, lastCornerList, lastDescriptorList, cornerList, descriptorList, tsDataCnt,
            captureIntervalTimer, tsDataList = new Array();

        return {
            /**
             * Set video element
             *
             * @param {Object} targetVideoElm A video element as a capture target
             */
            setVideoElement: function(targetVideoElm) {
                let that = this;
                videoElm = targetVideoElm;
                videoElm.addEventListener('play', function() {
                    isVideoStopped = false;
                }, false);
                videoElm.addEventListener('ended', function() {
                    isVideoStopped = true;
                    that.clearLastCaptureInfo();
                }, false);
                videoElm.addEventListener('pause', function() {
                    isVideoStopped = true;
                    that.clearLastCaptureInfo();
                }, false);
                videoElm.parentNode.insertBefore(userCanvas, videoElm.nextSibling);
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
             * Set capture interval
             *
             * @method setCaptureInterval
             * @param {Number} newCaptureInterval Capture interval to be set
             */
            setCaptureInterval: function(newCaptureInterval) {
                captureInterval = newCaptureInterval;
            },
            /**
             * Get sensitivity
             *
             * @method getSensitivity
             * @return {Number} Sensitivity
             */
            getSensitivity: function() {
                return sensitivity;
            },
            /**
             * Update sensitivity
             *
             * @method setSensitivity
             * @param {Number} newSensitivity Sensitivity to be set
             */
            setSensitivity: function(newSensitivity) {
                sensitivity = newSensitivity;
            },
            /**
             * Set flag for showing capture panel
             *
             * @method setIsShowCapturePanel
             * @param {Boolean} bool Flag to be set
             */
            setIsShowCapturePanel: function(bool) {
                isShowCapturePanel = bool;
                if (bool) {
                    videoElm.style.opacity = 0.5;
                } else {
                    videoElm.style.opacity = 1;
                }
            },
            /**
             * Set flag for auto sensitivity adjustment
             *
             * @method setIsAutoAdjustSensitivity
             * @param {Boolean} bool Flag to be set
             */
            setIsAutoAdjustSensitivity: function(bool) {
                isAutoAdjustSensitivity = bool;
            },
            /**
             * Initialize canvas by video element
             *
             * @method initCanvasByVideo
             * @param {Number} delay Delay for copying height and width from video element
             */
            initCanvasByVideo: function(delay) {
                delay = delay || DEFAULT_DELAY_FOR_VIDEO_INIT;
                videoElm.style.opacity = 0;
                userCanvas.style.opacity = 0;
                setTimeout(function() {
                    userCanvas.width = videoElm.clientWidth;
                    userCanvas.height = videoElm.clientHeight;
                    scale = CANVAS_HEIGHT_FOR_CALCULATION / userCanvas.height;
                    scaleInverse = INVERSE_BASE / scale;
                    calcCanvas.width = userCanvas.width * scale;
                    calcCanvas.height = userCanvas.height * scale;
                    if (isShowCapturePanel) {
                        videoElm.style.opacity = 0.5;
                    } else {
                        videoElm.style.opacity = 1;
                    }
                    userCanvas.style.opacity = 1;
                }, delay);
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
                let that = this;
                this.stopCaptureVideo();
                captureIntervalTimer = setInterval(function() {
                    if (isVideoStopped === false) {
                        if (isShowCapturePanel) {
                            userCtx.drawImage(videoElm, CAPTURE_OFFSET_LEFT, CAPTURE_OFFSET_TOP, videoElm.clientWidth, videoElm.clientHeight);
                        }
                        calcCtx.drawImage(videoElm, CAPTURE_OFFSET_LEFT, CAPTURE_OFFSET_TOP, calcCanvas.width, calcCanvas.height);
                    }
                    (new Promise(function(resolve) {
                        setTimeout(resolve, DELAY_TO_DECENTRALIZE_CPU_USAGE);
                    }))
                    .then(that.findFeatures)
                    .then(function(data) {
                        return new Promise(function(resolve) {
                            if (isVideoStopped === false) {
                                data.isSensitivityAdjusted = that.autoAdjustSensitivity(data.cornerList.length);
                                data.yeah = that.calcYeah(data.matchRate, tsDataList);
                                that.fillTrackedPointsOnCanvas(data);
                            } else {
                                data.isSensitivityAdjusted = false;
                                data.yeah = null;
                            }
                            data.time = data.now - startTime;
                            tsDataList.push(data);
                            if (tsDataList.length > MIN_DATA_TO_CALC_YEAH) {
                                tsDataList.shift();
                            }
                            resolve(data);
                        });
                    }).then(function(data) {
                        successCallback(data);
                    }).catch(function(error) {
                        failureCallback(error);
                    });
                }, captureInterval);
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
                if (doFindCnt > MIN_DATA_TO_CALC_YEAH) {
                    tsDataCnt = tsDataList.length;
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
                doFindCnt = DEFAULT_FIND_COUNT;
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
                return new Promise(function(resolve) {
                    now = (new Date()).getTime();
                    if (startTime === undefined) {
                        startTime = now;
                    }
                    if (isVideoStopped) {
                        resolve({
                            now:        now,
                            cornerList: [],
                            matchList:  [],
                            matchRate:  null
                        });
                        return;
                    }
                    doFindCnt++;

                    tracking.Fast.THRESHOLD = MAX_TRACKING_FAST_THRESHOLD - sensitivity;
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

                    resolve({
                        now:        now,
                        cornerList: cornerList,
                        matchList:  matchList,
                        matchRate:  matchRate
                    });
                });
            },
            /**
             * Fill marker on tracked corners and matched points
             *
             * @method fillTrackedPointsOnCanvas
             * @param {object} trackedData Tracked data points
             */
            fillTrackedPointsOnCanvas: function(trackedData) {
                if (isShowCapturePanel) {
                    userCtx.fillStyle = '#f00';
                    loopCnt = trackedData.cornerList.length;
                    // eslint-disable-next-line
                    while ((loopCnt-=2)>=0) {
                        userCtx.fillRect(
                            trackedData.cornerList[loopCnt] * scaleInverse,
                            // eslint-disable-next-line
                            trackedData.cornerList[loopCnt + 1] * scaleInverse,
                            markerSize, markerSize
                        );
                    }
                    userCtx.fillStyle = '#0f0';
                    loopCnt = trackedData.matchList.length;
                    // eslint-disable-next-line
                    while ((loopCnt-=2)>=0) { // Skip drawing the half of them.
                        match = trackedData.matchList[loopCnt].keypoint1;
                        userCtx.fillRect(match[0] * scaleInverse, match[1] * scaleInverse, markerSize, markerSize);
                    }
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
                let isUpdate = false;
                if (isAutoAdjustSensitivity) {
                    if (cornerCnt > MAX_MODERATE_CORNER_COUNT && sensitivity > MIN_SENSITIVITY) {
                        sensitivity -= Math.max(
                            MIN_SENSITIVITY_AUTO_ADJUSTMENT,
                            Math.ceil((cornerCnt - MAX_MODERATE_CORNER_COUNT) / MAX_SENSITIVITY_ADJUST_DENOMINATOR)
                        );
                        sensitivity = Math.max(MIN_SENSITIVITY, sensitivity);
                        isUpdate = true;
                    } else if (cornerCnt < MIN_MODERATE_CORNER_COUNT && sensitivity < MAX_SENSITIVITY) {
                        sensitivity += Math.max(
                            MIN_SENSITIVITY_AUTO_ADJUSTMENT,
                            Math.ceil((MIN_MODERATE_CORNER_COUNT - cornerCnt) / MIN_SENSITIVITY_ADJUST_DENOMINATOR)
                        );
                        sensitivity = Math.min(MAX_SENSITIVITY, sensitivity);
                        isUpdate = true;
                    }
                }
                return isUpdate;
            }
        };
    }

    // export
    window.Yeah = Yeah;
} (window));
