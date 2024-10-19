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
        chrome.storage.sync.set({ frameDelay: frameDelayNum });
    } catch {
        chrome.storage.sync.set({ frameDelay: undefined });
    }
}

const frameDelayInput = document.getElementById('frameDelay');
frameDelayInput.addEventListener('change', onFrameDelayChange);