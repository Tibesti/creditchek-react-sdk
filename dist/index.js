"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var creditchekSDK = {
    open: function (_a) {
        var publicKey = _a.publicKey, module = _a.module, onComplete = _a.onComplete, onClose = _a.onClose, _b = _a.postMessageParam, postMessageParam = _b === void 0 ? "result" : _b;
        var url = "https://securedwidget.creditchek.africa/" +
            "?publicKey=".concat(encodeURIComponent(publicKey || "")) +
            "&module=".concat(module === null || module === void 0 ? void 0 : module.join(",")) +
            "&source=react";
        var win = window.open(url, '_blank');
        // Listen for postMessage from the widget
        var messageHandler = function (event) {
            // Verify origin for security
            if (event.origin === 'https://securedwidget.creditchek.africa') {
                if (event.data && typeof event.data === 'object') {
                    // Check if the specified parameter exists in the message
                    if (postMessageParam && event.data[postMessageParam] !== undefined) {
                        // Clean up listener
                        window.removeEventListener('message', messageHandler);
                        clearInterval(interval);
                        // Pass the result to onComplete
                        onComplete(event.data);
                    }
                }
            }
        };
        window.addEventListener('message', messageHandler);
        // Fallback: Check if window is closed (for demo purposes)
        var interval = setInterval(function () {
            if (win === null || win === void 0 ? void 0 : win.closed) {
                clearInterval(interval);
                window.removeEventListener('message', messageHandler);
                onClose === null || onClose === void 0 ? void 0 : onClose();
            }
        }, 500);
    },
};
exports.default = creditchekSDK;
