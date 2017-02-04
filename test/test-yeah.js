'use strict'
let assert = require('assert');
let yeah = require('../lib/yeah');
let jsdom = require('mocha-jsdom');

describe("application", function() {
    jsdom();
    before(function() {
        yeah.createCanvas();
    });
    describe('createCanvas', function() {
        it('executable without error', function() {
            assert(true);
        });
    });
    describe('setVideoElement', function() {
        it('canvas is also set to body automatically', function() {
            let videoElm = document.createElement('video');
            document.body.appendChild(videoElm);
            yeah.setVideoElement(videoElm);
            assert.equal(document.body.children.length, 2);
        });
    });
    describe('setVideoSrc', function() {
        it('executable without error', function() {
            let videoElm = document.createElement('video');
            document.body.appendChild(videoElm);
            yeah.setVideoElement(videoElm);
            yeah.setVideoSrc('../assets/media/kazuhiro.mp4');
            assert(true);
        });
    });
    describe('playVideo', function() {
        let src = '../assets/media/kazuhiro.mp4';
        it('executable without error', function(done) {
            let videoElm = document.createElement('video');
            document.body.appendChild(videoElm);
            yeah.setVideoElement(videoElm);
            let p = yeah.playVideo(src, 500);
            p.then(() => {
                assert(true);
                done();
            });
        });

        it('without delay argument', function(done) {
            let videoElm = document.createElement('video');
            document.body.appendChild(videoElm);
            yeah.setVideoElement(videoElm);
            let p = yeah.playVideo(src);
            p.then(() => {
                assert(true);
                done();
            });
        });
    });
    describe('option setter + getter', function() {
        let options = {
            captureInterval:         1500,
            sensitivity:             34,
            isShowCapturePanel:      true,
            isAutoAdjustSensitivity: false,
            markerSize:              90
        };
        it('set all options', function() {
            let videoElm = document.createElement('video');
            document.body.appendChild(videoElm);
            yeah.setVideoElement(videoElm);
            let acceptedOptions = yeah.setOptions(options);
            assert.equal(acceptedOptions.captureInterval, options.captureInterval);
            assert.equal(acceptedOptions.sensitivity, options.sensitivity);
            assert.equal(acceptedOptions.isShowCapturePanel, options.isShowCapturePanel);
            assert.equal(acceptedOptions.isAutoAdjustSensitivity, options.isAutoAdjustSensitivity);
            assert.equal(acceptedOptions.markerSize, options.markerSize);
        });
        it ('get all options', function() {
            assert.equal(yeah.getCaptureInterval(), options.captureInterval);
            assert.equal(yeah.getSensitivity(), options.sensitivity);
            assert.equal(yeah.getCaptureInterval(), options.captureInterval);
            assert.equal(yeah.isAutoAdjustSensitivity(), options.isAutoAdjustSensitivity);
            assert.equal(yeah.isShowCapturePanel(), options.isShowCapturePanel);
        });
        it ('sensitivity threshold check', function() {
            yeah.setSensitivity(-1);
            assert.equal(yeah.getSensitivity(), 0);
            yeah.setSensitivity(0);
            assert.equal(yeah.getSensitivity(), 0);
            yeah.setSensitivity(100);
            assert.equal(yeah.getSensitivity(), 100);
            yeah.setSensitivity(101);
            assert.equal(yeah.getSensitivity(), 100);
        });
        it ('captureInterval threshold check', function() {
            yeah.setCaptureInterval(249);
            assert.equal(yeah.getCaptureInterval(), 250);
            yeah.setCaptureInterval(250);
            assert.equal(yeah.getCaptureInterval(), 250);
            yeah.setCaptureInterval(251);
            assert.equal(yeah.getCaptureInterval(), 251);
        });
    });
    describe('calcYeah', function() {
        it('calculation check', function() {
            let tsDataList = [
                {matchRate: 50},
                {matchRate: 100}
            ];
            let currentMatchRate = 50;
            let result = yeah.calcYeah(currentMatchRate, tsDataList);
            assert.equal(result, 50);

            currentMatchRate = 95;
            result = yeah.calcYeah(currentMatchRate, tsDataList);
            assert.equal(result, 20);
        });
        it('lack of data count', function() {
            let tsDataList = [];
            let currentMatchRate = 50;
            let result = yeah.calcYeah(currentMatchRate, tsDataList);
            assert.equal(result, null);

            tsDataList.push({matchRate: 50});
            result = yeah.calcYeah(currentMatchRate, tsDataList);
            assert.equal(result, null);

            tsDataList.push({matchRate: 100});
            result = yeah.calcYeah(currentMatchRate, tsDataList);
            assert.equal(result, 50);
        });
    });
    describe('setCustomYeahCalculator', function() {
        let customFunc = function(currentMatchRate, tsDataList) {
            return currentMatchRate * currentMatchRate / 100;
        };
        it('executable without error', function() {
            yeah.setCustomYeahCalculator(customFunc);
            assert(true);
        });
        it('calculation check', function() {
            yeah.setCustomYeahCalculator(customFunc);
            let result = yeah.calcYeah(50, []);
            assert.equal(result, 25);
        });
    });
    describe('clearLastCaptureInfo', function() {
        it('executable without error', function() {
            yeah.clearLastCaptureInfo();
            assert(true);
        });
    });
    describe('fillTrackedPointsOnCanvas', function() {
        it('executable without error', function() {
            let trackedData = {
                cornerList: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
                matchList: [
                    {keypoint1: [0, 0]}, {keypoint1: [1, 1]}, {keypoint1: [2, 2]}, {keypoint1: [3, 3]}, {keypoint1: [4, 4]}
                ]
            }
            yeah.setIsShowCapturePanel(false);
            yeah.fillTrackedPointsOnCanvas(trackedData);
            assert(true);
        });
    });
    describe('startCaptureVideo', function() {
        this.timeout(5000);
        it('first interval', function(done) {
            yeah.setIsShowCapturePanel(false);
            yeah.startCaptureVideo(function(data) {
                yeah.stopCaptureVideo();
                assert.equal(data.cornerList.length, 0);
                assert.equal(data.matchList.length, 0);
                assert.equal(data.matchRate, null);
                assert.equal(data.time, 0);
                assert.equal(data.isSensitivityAdjusted, false);
                assert.equal(data.yeah, null);
                done();
            }, function(error) {
                console.log(error);
            });
        });

        it('interval existence', function(done) {
            yeah.setIsShowCapturePanel(false);
            yeah.setCaptureInterval(1000);
            let calledCnt = 0;
            yeah.startCaptureVideo(function(data) {
                calledCnt++;
            }, function(error) {
                console.log(error);
            });
            setTimeout(function() {
                assert.equal(calledCnt, 2);
                yeah.stopCaptureVideo();
                done();
            }, 3000);
        });
    });
    describe('stopCaptureVideo', function() {
        it('executable without error', function(done) {
            let calledCnt = 0;
            yeah.setIsShowCapturePanel(false);
            yeah.startCaptureVideo(function(data) {
                yeah.stopCaptureVideo();
                calledCnt++;
            }, function(error) {
                console.log(error);
            });
            setTimeout(function() {
                assert.equal(calledCnt, 1);
                done();
            }, 2000);
            this.timeout(3000);
        });
    });
    describe('findFeatures', function() {
        it('executable without error', function(done) {
            let p = yeah.findFeatures();
            p.then((data) => {
                assert.equal(data.cornerList.length, 0);
                assert.equal(data.matchList.length, 0);
                assert.equal(data.matchRate, null);
                done();
            });
        });
    });
    describe('adjustSensitivity', function() {
        it('auto adjust off', function() {
            yeah.setIsAutoAdjustSensitivity(false);
            let isUpdated = yeah.adjustSensitivity(10000);
            assert(!isUpdated);
        });

        it('auto adjust on: corner=401 x sensitivity=0 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(0);
            let isUpdated = yeah.adjustSensitivity(401);
            assert(!isUpdated);
            assert.equal(yeah.getSensitivity(), 0);
        });

        it('auto adjust on: corner=401 x sensitivity=1 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(1);
            let isUpdated = yeah.adjustSensitivity(401);
            assert(isUpdated);
            assert.equal(yeah.getSensitivity(), 0);
        });

        it('auto adjust on: corner=400 x sensitivity=100 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(100);
            let isUpdated = yeah.adjustSensitivity(400);
            assert(!isUpdated);
            assert.equal(yeah.getSensitivity(), 100);
        });

        it('auto adjust on: corner=250 x sensitivity=0 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(0);
            let isUpdated = yeah.adjustSensitivity(250);
            assert(!isUpdated);
            assert.equal(yeah.getSensitivity(), 0);
        });

        it('auto adjust on: corner=249 x sensitivity=0 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(0);
            let isUpdated = yeah.adjustSensitivity(249);
            assert(isUpdated);
            assert.equal(yeah.getSensitivity(), 2);
        });

    });
});