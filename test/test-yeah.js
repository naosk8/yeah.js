'use strict'
let assert = require('assert');
let yeah = require('../lib/yeah');

describe("application", function() {
    beforeEach(function() {
        let jsdom = require('jsdom').jsdom;
        global.document = jsdom('<html><body></body></html>')
        global.window = document.defaultView;
        global.navigator = window.navigator;
        global.location = window.location;
        yeah.createCanvas();
    });
    afterEach(function() {
        delete global.document;
        delete global.window;
        delete global.navigator;
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
    describe('initCanvasByVideo', function() {
        it('executable without error', function() {
            let videoElm = document.createElement('video');
            document.body.appendChild(videoElm);
            yeah.setVideoElement(videoElm);
            yeah.setVideoSrc('../assets/media/kazuhiro.mp4');
            yeah.initCanvasByVideo();
            assert(true);
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
});