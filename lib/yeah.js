(function(window, undefined) {
    'use strict';
    /**
     * A utility to convert video into its excitement score.
     *
     * @class Yeah
     * @param {Object} options Options for tracking
     * @constructor
     */
    function Yeah(options) {
        var MAX_TRACKING_FAST_THRESHOLD = 100;
        var CANVAS_HEIGHT_FOR_CALCULATION = 128;
        var MIN_DATA_TO_CALC_YEAH = 3;
        var DEFAULT_DELAY_FOR_VIDEO_INIT = 1000;
        var DELAY_TO_DECENTRALIZE_CPU_USAGE = 200;

        var isVideoStopped = false;
        var doFindCnt = 0;
        var videoElm;
        var userCanvas = document.createElement('canvas');
        var userCtx = userCanvas.getContext('2d');
        var calcCanvas = document.createElement('canvas');
        var calcCtx = calcCanvas.getContext('2d');
        var scale, scaleInverse, imageData, gray;
        var matchRate, matchList;

        var captureIntervalTimer;
        var captureInterval = 1000;
        var sensitivity = 60;
        var isShowCapturePanel = false;
        var isAutoAdjustSensitivity = true;

        var detectRectSize = 4;

        var timeSeriesDataList = new Array();
        var i, len, target, now, startTime, customYeahCalculator,
            lastCornerList, lastDescriptorList, cornerList, descriptorList, tsDataSize;

        if ('sensitivity' in options) {
            sensitivity = options.sensitivity;
        }
        if ('captureInterval' in options) {
            captureInterval = options.captureInterval;
        }
        if ('showCapturePanel' in options) {
            isShowCapturePanel = options.showCapturePanel;
        }
        if ('autoAdjust' in options) {
            isAutoAdjustSensitivity = options.autoAdjust;
        }

        return {
            /**
             * Set video element
             *
             * @param {Object} videoElm A video element as a capture target
             */
            setVideoElement: function(targetVideoElm) {
                videoElm = targetVideoElm;
                videoElm.addEventListener('play', function() { isVideoStopped = false; }, false);
                videoElm.addEventListener('ended', function() { isVideoStopped = true; }, false);
                videoElm.addEventListener('pause', function() { isVideoStopped = true; }, false);
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
             * @return {Number}
             */
            getSensitivity: function() {
                return sensitivity;
            },
            /**
             * Update sensitivity
             *
             * @method setSensitivity
             * @oaram {Number} newSensitivity Sensitivity to be set
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
                    scaleInverse = 1 / scale;
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
             * Set event listeners on video element
             *
             * @method setVideoEventListener
             * @param {Object} videoElm A video element as a capture target
             */
            setVideoEventListener: function(videoElm) {
                videoElm.addEventListener('play', function() {
                    isVideoStopped = false;
                }, false);
                videoElm.addEventListener('ended', function() {
                    isVideoStopped = true;
                }, false);
                videoElm.addEventListener('pause', function() {
                    isVideoStopped = true;
                }, false);
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
                var that = this;
                this.stopCaptureVideo();
                captureIntervalTimer = setInterval(function() {
                    if (isVideoStopped === false) {
                        if (isShowCapturePanel) {
                            userCtx.drawImage(videoElm, 0, 0, videoElm.clientWidth, videoElm.clientHeight);
                        }
                        calcCtx.drawImage(videoElm, 0, 0, calcCanvas.width, calcCanvas.height);
                    }
                    (new Promise(function(resolve) {setTimeout(resolve, DELAY_TO_DECENTRALIZE_CPU_USAGE)}))
                    .then(that.findFeatures)
                    .then(function(data) {
                        return new Promise(function(resolve, reject) {
                            if (isVideoStopped === false) {
                                data.isSensitivityAdjusted = that.autoAdjustSensitivity(data.cornerList.length);
                                data.yeah = that.calcYeah(data.matchRate, timeSeriesDataList);
                                if (isShowCapturePanel) {
                                    userCtx.fillStyle = '#f00';
                                    len = data.cornerList.length;
                                    while ((len-=2)>=0) {
                                        userCtx.fillRect(data.cornerList[len] * scaleInverse, data.cornerList[len + 1] * scaleInverse, detectRectSize, detectRectSize);
                                    }
                                    userCtx.fillStyle = '#0f0';
                                    len = data.matchList.length;
                                    while ((len-=2)>=0) { // Skip drawing the half of them.
                                        target = data.matchList[len].keypoint1;
                                        userCtx.fillRect(target[0] * scaleInverse, target[1] * scaleInverse, detectRectSize, detectRectSize);
                                    }
                                }
                            } else {
                                data.isSensitivityAdjusted = false;
                                data.yeah = null;
                            }
                            data.time = data.now - startTime;
                            timeSeriesDataList.push(data);
                            if (timeSeriesDataList.length > MIN_DATA_TO_CALC_YEAH) {
                                timeSeriesDataList.shift();
                            }
                            resolve(data);
                        });
                    }).then(function(data) {
                        successCallback(data);
                    }).catch(function(e) {
                        failureCallback(e);
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
             * @param {Array} timeSeriesDataList List of corner detection and yeah score history data
             * @return {Number}
             */
            calcYeah: function(currentMatchRate, timeSeriesDataList) {
                if (customYeahCalculator !== undefined) {
                    return customYeahCalculator(currentMatchRate, timeSeriesDataList);
                }

                var yeah;
                if (doFindCnt >= MIN_DATA_TO_CALC_YEAH) {
                    tsDataSize = timeSeriesDataList.length;
                    yeah = (Math.abs(currentMatchRate - timeSeriesDataList[tsDataSize - 1].matchRate) * 2
                        + Math.abs(timeSeriesDataList[tsDataSize - 1].matchRate - timeSeriesDataList[tsDataSize - 2].matchRate)) / 3;
                    yeah = Math.floor(yeah * 100) / 100
                } else {
                    yeah = 0;
                }
                return yeah;
            },
            /**
             * Find features from captured image on canvas
             *
             * @method findFeatures
             * @return {Object}
             */
            findFeatures: function() {
                return new Promise(function(resolve, reject) {
                    now = Math.round((new Date()).getTime() / 100) / 10;
                    if (startTime === undefined) {
                        startTime = now;
                    }
                    if (isVideoStopped) {
                        doFindCnt = 0;
                        lastCornerList = undefined;
                        lastDescriptorList = undefined;
                        resolve({
                            now: now,
                            cornerList: [],
                            matchList: [],
                            matchRate: null
                        });
                        return;
                    }
                    doFindCnt++;

                    tracking.Fast.THRESHOLD = MAX_TRACKING_FAST_THRESHOLD - sensitivity;
                    imageData = calcCtx.getImageData(0, 0, calcCanvas.width, calcCanvas.height);
                    gray = tracking.Image.grayscale(imageData.data, imageData.width, imageData.height);
                    cornerList = tracking.Fast.findCorners(gray, imageData.width, imageData.height);

                    matchList = new Array();
                    descriptorList = tracking.Brief.getDescriptors(gray, imageData.width, cornerList);
                    if (cornerList.length > 0 && lastDescriptorList && lastCornerList) {
                        // This method is more accurate, but cut because of its cpu cost.
                        // matchList = tracking.Brief.reciprocalMatch(lastCornerList, lastDescriptorList, cornerList, descriptorList);
                        matchList = tracking.Brief.match(lastCornerList, lastDescriptorList, cornerList, descriptorList);
                        matchRate = Math.floor(Math.min(1, matchList.length / cornerList.length) * 10000) / 100;
                    }

                    lastDescriptorList = descriptorList;
                    lastCornerList = cornerList;

                    resolve({
                        now: now,
                        cornerList: cornerList,
                        matchList: matchList,
                        matchRate: matchRate
                    });
                });
            },
            /**
             * Auto adjustment for sensitivity with found corner size
             *
             * @method autoAdjustSensitivity
             * @param {Number} cornerSize Found corner size
             * @return {Boolean}
             */
            autoAdjustSensitivity: function(cornerSize) {
                var isUpdate = false;
                if (isAutoAdjustSensitivity) {
                    if (cornerSize > 400 && sensitivity > 0) {
                        sensitivity -= Math.max(2, Math.ceil((cornerSize - 400) / 500));
                        sensitivity = Math.max(0, sensitivity);
                        isUpdate = true;
                    } else if (cornerSize < 250 && sensitivity < 100) {
                        sensitivity += Math.max(2, Math.ceil((250 - cornerSize) / 100));
                        sensitivity = Math.min(100, sensitivity);
                        isUpdate = true;
                    }
                }
                return isUpdate;
            }
        };
    };

    // export
    window.Yeah = Yeah;
} (window));
