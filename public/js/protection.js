// Anti-Debugging and Protection Layer
(function () {
    'use strict';

    // Disable right-click
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+J
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
    });

    // Detect DevTools (Less Aggressive)
    const devtools = {
        isOpen: false,
        orientation: null
    };

    const threshold = 200; // Increased threshold to reduce false positives
    const emitEvent = (isOpen, orientation) => {
        if (devtools.isOpen !== isOpen || devtools.orientation !== orientation) {
            devtools.isOpen = isOpen;
            devtools.orientation = orientation;

            if (isOpen) {
                // Just log warning, don't block the page
                console.warn('⚠️ Developer Tools Detected - Unauthorized access may be logged');
                // Optional: You can add analytics tracking here
            }
        }
    };

    const main = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const orientation = widthThreshold ? 'vertical' : 'horizontal';

        if (!(heightThreshold && widthThreshold) && ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)) {
            emitEvent(true, orientation);
        } else {
            emitEvent(false, null);
        }
    };

    // Check less frequently to reduce performance impact
    setInterval(main, 1000);

    // Disable console (but keep it working for our own warnings)
    const originalLog = console.log;
    const originalDebug = console.debug;
    const originalInfo = console.info;

    // Only disable user console, keep warnings and errors
    console.log = function () { };
    console.debug = function () { };
    console.info = function () { };

})();
