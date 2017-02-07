# yeah.js
A javascript library to convert video input into its excitement score.
   
[![CircleCI](https://circleci.com/gh/naosk8/yeah.js/tree/master.svg?style=shield)](https://circleci.com/gh/naosk8/yeah.js/tree/master)
[![Codecov](https://codecov.io/gh/naosk8/yeah.js/branch/master/graph/badge.svg)](https://codecov.io/gh/naosk8/yeah.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Bower version](https://badge.fury.io/bo/yeah-js.svg)](https://badge.fury.io/bo/yeah-js)

## Demo page
[A demo page on Github](https://naosk8.github.io/yeah.js "A demo page on Github")
  
## Get started
### 1 - install  
```
bower install yeah-js
```
  
### 2 - Usage  <br>
**Plain usage**  
```
In HTML
<head>
  <script src='path/to/tracking.js'></script>
  <script src='path/to/yeah.js'></script>
  <script>
    function main() {
      videoElm = document.getElementById('targetVideo');
      // 1. Set a video element to be watched.
      yeah.setVideoElement(videoElm);

      // 2. Set options only if you want to arrange them.
      // yeah.setOptions(options);

      // 3. Set video src.
      if (navigator.getUserMedia) {
        navigator.getUserMedia({ audio: false, video: true }, function(stream) {
          yeah.playVideo(URL.createObjectURL(stream), 2000);
        }, function() {});
      } else {
        alert("This device doesn't support web camera. Please try sample movies listed on control panel above.")
      }

      // 4. Start capturing & Generate YEAH score: excitement barometer.
      yeah.startCaptureVideo(function successCallback(data) {
        console.log(data.yeah + '!');
      }, function failureCallback(error) {
        console.log(error);
      });

      // 5. Stop capturing as you like.
      setTimeout(function() {
        // stop capturing after 10sec.
        yeah.stopCaptureVideo();
      }, 10000);
    }
    document.addEventListener('DOMContentLoaded', main, false);
  </script>  
</head>
<body>
  <video id='targetVideo' autoplay playsinline></video>
</body>
```
  
**With requireJS**  
Basically, the usage is same as Plain usage written above.  
Differences are only these.
```
In HTML
<head>
  <script data-main='path/to/main.js' src='path/to/require.js'></script>
</head>

In Javascript(main.js)
// Use this line instead of calling DOMContentLoaded event.
require(['path/to/yeah'], function(yeah) {
  main();
});
```

## Documents
[API Documents written in YUIDoc](https://naosk8.github.io/yeah.js/docs/classes/Yeah.html "Documents written in YUIDoc")

## Reference for integration
### Tools
| Purpose     | Tool       | Command       | Setting      |
|:------------|:-----------|:--------------|:-------------|
| code check  | [eslint](http://eslint.org/)    | npm run lint  | .eslintrc    |
| unit test   | [mocha](https://mochajs.org/)      | mocha         |              |
| test report | [istanbul](https://istanbul.js.org/)   | npm run cover |              |
| test report | [Codecov.io](https://codecov.io/) | npm run report |              |
| lint & test |            | npm test      | package.json |
| CI          | [Circle.io](https://circleci.com/)  |               | circle.yml   |
| API doc     | [YUIDoc](http://yui.github.io/yuidoc/)     | yuidoc        | yuidoc.json  |
  
### For developers
All steps in this section assume npm and bower installed.
```
# Install yuildocjs
npm install -g yuidocjs

# Install devDependencies of npm modules
npm install

# Install devDependencies of bower components
bower install

# Create symlink for pre hook
ln -s -f ../../hooks/pre-commit .git/hooks/pre-commit
```

## Library dependency
[tracking.js](https://trackingjs.com/) ([github](https://github.com/eduardolundgren/tracking.js))  
  
## License
[MIT License Copyright (c) 2017 Nao Ito](https://github.com/naosk8/yeah.js/blob/master/LICENSE.txt)  
