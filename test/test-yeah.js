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
            yeah.setOptions(options);
            assert(true);
        });
        it ('get all options', function() {
            assert.equal(yeah.getCaptureInterval(), options.captureInterval);
            assert.equal(yeah.getSensitivity(), options.sensitivity);
            assert.equal(yeah.getCaptureInterval(), options.captureInterval);
            assert.equal(yeah.isAutoAdjustSensitivity(), options.isAutoAdjustSensitivity);
            assert.equal(yeah.isShowCapturePanel(), options.isShowCapturePanel);
            assert.equal(yeah.getMarkerSize(), options.markerSize);

            let opts = yeah.getOptions();
            assert.equal(opts.captureInterval, options.captureInterval);
            assert.equal(opts.sensitivity, options.sensitivity);
            assert.equal(opts.captureInterval, options.captureInterval);
            assert.equal(opts.isAutoAdjustSensitivity, options.isAutoAdjustSensitivity);
            assert.equal(opts.isShowCapturePanel, options.isShowCapturePanel);
            assert.equal(opts.markerSize, options.markerSize);
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
    describe('startCaptureVideo', function() {
        this.timeout(5000);
        it('first interval', function(done) {
            let sensitivity = yeah.getSensitivity();
            yeah.setIsShowCapturePanel(false);
            yeah.startCaptureVideo(function(data) {
                yeah.stopCaptureVideo();
                assert.equal(data.cornerList.length, 0);
                assert.equal(data.matchList.length, 0);
                assert.equal(data.matchRate, null);
                assert.equal(data.time, 0);
                assert.equal(data.sensitivity, sensitivity);
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
    describe('calcAdjustedSensitivity', function() {
        let options = yeah.getOptions();
        it('auto adjust off', function() {
            let sensitivity = yeah.getSensitivity();
            yeah.setIsAutoAdjustSensitivity(false);
            let newSensitivity = yeah.calcAdjustedSensitivity(10000, options);
            assert.equal(newSensitivity, sensitivity);
        });

        it('auto adjust on: corner=401 x sensitivity=0 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(0);
            let newSensitivity = yeah.calcAdjustedSensitivity(401, options);
            assert.equal(newSensitivity, 0);
        });

        it('auto adjust on: corner=401 x sensitivity=1 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(1);
            let newSensitivity = yeah.calcAdjustedSensitivity(401, options);
            assert.equal(newSensitivity, 0);
        });

        it('auto adjust on: corner=250 x sensitivity=0 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(0);
            let newSensitivity = yeah.calcAdjustedSensitivity(250, options);
            assert.equal(newSensitivity, 0);
        });

        it('auto adjust on: corner=249 x sensitivity=0 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(0);
            let newSensitivity = yeah.calcAdjustedSensitivity(249, options);
            assert.equal(newSensitivity, 2);
        });

        it('auto adjust on: corner=400 x sensitivity=100 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(100);
            let newSensitivity = yeah.calcAdjustedSensitivity(400, options);
            assert.equal(newSensitivity, 100);
        });

        it('auto adjust on: corner=401 x sensitivity=100 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(100);
            let newSensitivity = yeah.calcAdjustedSensitivity(401, options);
            assert.equal(newSensitivity, 98);
        });

        it('auto adjust on: corner=0 x sensitivity=100 ', function() {
            yeah.setIsAutoAdjustSensitivity(true);
            yeah.setSensitivity(100);
            let newSensitivity = yeah.calcAdjustedSensitivity(0, options);
            assert.equal(newSensitivity, 100);
        });

    });
});