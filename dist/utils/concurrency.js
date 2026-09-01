"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLimit = makeLimit;
function makeLimit(concurrency) {
    let activeCount = 0;
    const queue = [];
    const next = () => {
        activeCount--;
        if (queue.length > 0) {
            activeCount++;
            const resolve = queue.shift();
            if (resolve)
                resolve();
        }
    };
    return async (fn) => {
        if (activeCount >= concurrency) {
            await new Promise(resolve => queue.push(resolve));
        }
        activeCount++;
        try {
            return await fn();
        }
        finally {
            next();
        }
    };
}
