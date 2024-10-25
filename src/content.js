(async function () {
    'use strict';
    class BufferFrame {
        /**
         * @param {HTMLVideoElement} video
         */
        constructor(video) {
            const frame = document.createElement('canvas');
            this.frame = frame;
            this.video = video;
            this.captureTs = 0;
            this.Resize();
        }
        CaptureFrame(now) {
            this.ctx.drawImage(this.video, 0, 0, this.frame.width, this.frame.height);
            this.captureTs = now;
        }
        Resize() {
            const frame = this.frame;
            const video = this.video;
            frame.width = video.videoWidth;
            frame.height = video.videoHeight;
            this.ctx = this.frame.getContext('2d');
        }
    }

    class FrameSync {
        /**
         * @param {HTMLVideoElement} video 
         * @param {number} maxBuffer 
         * @param {number} frameDelayMs 
         */
        constructor(video, maxBuffer, frameDelayMs) {
            if (video.frameSyncObj) {
                return video.frameSyncObj;
            }

            this.video = video;
            this.buffer = [];
            this.maxBuffer = 0;
            this.frameDelayMs = frameDelayMs;
            this.active = false;
            this.frameCount = 0;
            this.lastDelayedFrameIndex = -1;
            this.SetMaxBuffer(maxBuffer);
            video.frameSyncObj = this;
            this._captureFrameFunc = this._captureFrame.bind(this);
            this._drawFrameFunc = this._drawFrame.bind(this);
            this._resizeFunc = this.Resize.bind(this);

            this.lastVideoOffsetWidth = video.offsetWidth;
            this.lastVideoOffsetHeight = video.offsetHeight;
            this.lastVideoOffsetLeft = video.offsetLeft;
            this.lastVideoOffsetTop = video.offsetTop;
        }

        SetMaxBuffer(maxBuffer) {
            if (maxBuffer < 2) {
                console.error('maxBuffer should be at least 2');
                return;
            }

            this.maxBuffer = maxBuffer;

            // Reuse the existing buffer frames
            const sortedBuffer = this.buffer.filter(frame => frame.captureTs != 0).sort((a, b) => a.captureTs - b.captureTs);
            const sortedBufferLength = sortedBuffer.length;
            this.buffer = [...sortedBuffer];

            for (let i = this.buffer.length; i < this.maxBuffer; i++) {
                const frame = new BufferFrame(this.video);
                this.buffer.push(frame);
            }
            this.frameCount = sortedBufferLength;
            this.lastDelayedFrameIndex = -1;
        }

        Resize = () => {
            const video = this.video;
            const canvas = this.canvas;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.style.width = `${video.offsetWidth}px`;
            canvas.style.height = `${video.offsetHeight}px`;
            canvas.style.left = `${video.offsetLeft}px`;
            canvas.style.top = `${video.offsetTop}px`;

            const videoAspect = video.videoWidth / video.videoHeight;
            const canvasAspect = video.offsetWidth / video.offsetHeight;
            if (Math.abs(videoAspect / canvasAspect - 1) < 0.02) {
                // aspect ratio is close enough, do nothing
            } else if (videoAspect > canvasAspect) {
                canvas.style.height = `${video.offsetWidth / videoAspect}px`;
                canvas.style.top = `${video.offsetTop + (video.offsetHeight - video.offsetWidth / videoAspect) / 2}px`;
            } else {
                canvas.style.width = `${video.offsetHeight * videoAspect}px`;
                canvas.style.left = `${video.offsetLeft + (video.offsetWidth - video.offsetHeight * videoAspect) / 2}px`;
            }

            this.lastVideoOffsetWidth = video.offsetWidth;
            this.lastVideoOffsetHeight = video.offsetHeight;
            this.lastVideoOffsetLeft = video.offsetLeft;
            this.lastVideoOffsetTop = video.offsetTop;

            for (let i = 0; i < this.maxBuffer; i++) {
                this.buffer[i].Resize();
            }
        };

        NeedResize() {
            const video = this.video;
            const canvas = this.canvas;
            return canvas.width != video.videoWidth || canvas.height != video.videoHeight
                || this.lastVideoOffsetWidth != video.offsetWidth || this.lastVideoOffsetHeight != video.offsetHeight
                || this.lastVideoOffsetLeft != video.offsetLeft || this.lastVideoOffsetTop != video.offsetTop;
        }

        _createCanvasOverlay() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const video = this.video;

            canvas.style.position = 'absolute';
            const videoStyle = window.getComputedStyle(video);
            canvas.style.zIndex = videoStyle.zIndex;
            canvas.style.pointerEvents = 'none';

            video.parentElement.appendChild(canvas);

            window.addEventListener('resize', this._resizeFunc);
            video.addEventListener('resize', this._resizeFunc);

            this.canvas = canvas;
            this.ctx = ctx;
            this.Resize();
        }

        _captureFrame(now, metadata) {
            if (this.buffer[this.frameCount % this.maxBuffer].captureTs != 0 &&
                // A little bigger than frameDelayMs to avoid buffer overflow
                now - this.buffer[this.frameCount % this.maxBuffer].captureTs < Math.min(this.frameDelayMs * 2, this.frameDelayMs + 500)) {
                this.SetMaxBuffer(Math.round(this.maxBuffer * 1.5));
            }

            try {
                this.buffer[this.frameCount % this.maxBuffer].CaptureFrame(now);
            } catch (e) {
                debugger;
            }
            this.frameCount++;

            if (this.active) {
                this.video.requestVideoFrameCallback(this._captureFrameFunc);
            }
        }

        _shouldShowNextFrame(now) {
            // if (this.lastDelayedFrameIndex == -1) {
            //     return true;
            // }
            // return Math.abs(now - this.buffer[(this.lastDelayedFrameIndex + 1) % this.maxBuffer].captureTs - this.frameDelayMs)
            //     < Math.abs(now - this.buffer[(this.lastDelayedFrameIndex) % this.maxBuffer].captureTs - this.frameDelayMs);
            return now - this.buffer[(this.lastDelayedFrameIndex + 1) % this.maxBuffer].captureTs >= this.frameDelayMs
        }

        _drawFrame(now) {
            let canSkip = false;
            while ((this.lastDelayedFrameIndex + 1) % this.maxBuffer != this.frameCount % this.maxBuffer && this._shouldShowNextFrame(now)) {
                this.lastDelayedFrameIndex = (this.lastDelayedFrameIndex + 1) % this.maxBuffer;
                canSkip = true;
            }
            if (!canSkip) {
                const delayedFrame = this.buffer[this.lastDelayedFrameIndex];
                try {
                    this.ctx.drawImage(delayedFrame.frame, 0, 0, this.video.videoWidth, this.video.videoHeight);
                } catch (e) {
                }
            }

            if (this.active) {
                window.requestAnimationFrame(this._drawFrameFunc);
            }
        }

        Activate() {
            this.active = true;
            this.frameCount = 0;
            this.lastDelayedFrameIndex = -1;
            this._createCanvasOverlay();
            this.video.requestVideoFrameCallback(this._captureFrameFunc);
            window.requestAnimationFrame(this._drawFrameFunc);
        }
    }

    const frameDelay = (await chrome.storage.sync.get('frameDelay'))['frameDelay'];
    if (frameDelay) {
        const frameDelayNum = parseInt(frameDelay);
        if (frameDelayNum > 0) {
            setInterval(() => {
                const videoList = document.querySelectorAll('video');
                videoList.forEach(video => {
                    if (!video.frameSyncObj) {
                        // dynamically extend the max buffer size
                        const frameSync = new FrameSync(video, 10, frameDelayNum);
                        frameSync.Activate();
                    } else {
                        if (video.frameSyncObj.NeedResize()) {
                            video.frameSyncObj.Resize();
                        }
                    }
                });
            }, 2000);
        }
    }
})();
