document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get('frameDelay', ({ frameDelay }) => {
        if (frameDelay) {
            document.getElementById('frameDelay').value = frameDelay;
        }
    });
});

onFrameDelayChange = (event) => {
    const frameDelay = event.target.value;
    try {
        const frameDelayNum = parseInt(frameDelay);
        if (isNaN(frameDelayNum)) {
            throw new Error('Invalid frame delay');
        }
        chrome.storage.sync.set({ frameDelay: frameDelayNum });
    } catch {
        chrome.storage.sync.set({ frameDelay: '' });
    }
}

const frameDelayInput = document.getElementById('frameDelay');
frameDelayInput.addEventListener('input', onFrameDelayChange);