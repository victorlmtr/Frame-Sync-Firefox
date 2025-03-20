document.addEventListener('DOMContentLoaded', () => {
    browser.storage.sync.get(['frameDelay', 'pauseDelay']).then(result => {
        const frameDelay = result.frameDelay;
        const pauseDelay = result.pauseDelay;
        console.log('Frame delay retrieved:', frameDelay);
        console.log('Pause delay retrieved:', pauseDelay);
        if (frameDelay) {
            document.getElementById('frameDelay').value = frameDelay;
        }
        if (pauseDelay !== undefined) {
            refreshPauseResumeButton(pauseDelay);
        }
    }).catch(error => {
        console.error('Error retrieving storage values:', error);
    });
});

const onFrameDelayChange = (event) => {
    const frameDelay = event.target.value;
    try {
        const frameDelayNum = parseInt(frameDelay);
        if (isNaN(frameDelayNum)) {
            throw new Error('Invalid frame delay');
        }
        browser.storage.sync.set({ frameDelay: frameDelayNum });
        console.log('Frame delay set:', frameDelayNum);
    } catch (error) {
        console.error('Error setting frame delay:', error);
        browser.storage.sync.set({ frameDelay: '' });
    }
}

const button = document.getElementById('pauseResumeButton');

button.addEventListener('click', async () => {
    try {
        const result = await browser.storage.sync.get('pauseDelay');
        const pauseDelay = result.pauseDelay;
        const newValue = !pauseDelay;
        await browser.storage.sync.set({ pauseDelay: newValue });
        console.log('Pause delay set to:', newValue);
        refreshPauseResumeButton(newValue);
    } catch (error) {
        console.error('Error toggling pause delay:', error);
    }
});

const refreshPauseResumeButton = (isPaused) => {
    button.textContent = isPaused ? 'Resume Delay' : 'Pause Delay';
}

const frameDelayInput = document.getElementById('frameDelay');
frameDelayInput.addEventListener('input', onFrameDelayChange);