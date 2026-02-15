// WaterMarkCam - 核心 JavaScript 代码

class WaterMarkCam {
    constructor() {
        // DOM 元素
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.qrCanvas = document.getElementById('qrCanvas');
        this.photoPreviewImg = document.getElementById('photoPreviewImg');
        
        // 按钮
        this.startBtn = document.getElementById('startBtn');
        this.startControls = document.getElementById('startControls');
        this.captureBtn = document.getElementById('captureBtn');
        this.captureHint = document.getElementById('captureHint');
        this.switchBtn = document.getElementById('switchBtn');
        this.scanQrBtn = document.getElementById('scanQrBtn');
        this.scanControls = document.getElementById('scanControls');
        this.captureQrBtn = document.getElementById('captureQrBtn');
        this.stopScanBtn = document.getElementById('stopScanBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.shareBtn = document.getElementById('shareBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        
        // 步驟指示器
        this.stepIndicator = document.getElementById('stepIndicator');
        
        // 扫描相关
        this.scanOverlay = document.getElementById('scanOverlay');
        this.successMessage = document.getElementById('successMessage');
        this.successText = document.getElementById('successText');
        this.isScanning = false;
        this.scanAnimationId = null;
        
        // 容器
        this.cameraView = document.getElementById('cameraView');
        this.photoPreview = document.getElementById('photoPreview');
        this.watermarkPreview = document.getElementById('watermarkPreview');
        
        // 设置输入
        this.qrTextInput = document.getElementById('qrText');
        
        // 固定值
        this.qrSize = 230;
        this.opacity = 0.9;
        this.showTime = true; // 固定显示时间
        
        // 状态
        this.stream = null;
        this.currentFacingMode = 'environment'; // 默认后置摄像头
        this.qrCode = null;
        this.qrCodeReady = false; // 二维码是否就绪
        this.capturedImageData = null;
        
        // 初始化
        this.init();
    }
    
    init() {
        // 绑定事件
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.switchBtn.addEventListener('click', () => this.switchCamera());
        this.scanQrBtn.addEventListener('click', () => this.startQrScan());
        this.captureQrBtn.addEventListener('click', () => this.manualCapture());
        this.stopScanBtn.addEventListener('click', () => this.stopQrScan());
        this.saveBtn.addEventListener('click', () => this.savePhoto());
        this.shareBtn.addEventListener('click', () => this.sharePhoto());
        this.retakeBtn.addEventListener('click', () => this.retake());
        
        // 时间固定显示，移除相关事件监听
        
        // 生成初始二维码（如果有默认内容）
        if (this.qrTextInput.value.trim()) {
            this.generateQRCode();
        }
        
        // 检查是否支持 Web Share API
        this.checkShareSupport();
        
        // 检查浏览器支持
        this.checkBrowserSupport();
    }
    
    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('您的瀏覽器不支援攝影機功能。請使用最新版本的 Chrome、Safari 或 Firefox。');
        }
    }
    
    checkShareSupport() {
        // 检查是否支持 Web Share API 和文件分享
        if (navigator.share && navigator.canShare) {
            this.shareBtn.style.display = 'inline-flex';
        }
    }
    
    async startCamera() {
        try {
            this.startBtn.classList.add('loading');
            this.startBtn.textContent = '启动中...';
            
            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            // 等待视频加载并播放（某些浏览器需要手动调用play）
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.video.play()
                        .then(resolve)
                        .catch(err => {
                            console.warn('自動播放失敗，嘗試靜音播放:', err);
                            // 如果自动播放失败，尝试静音播放
                            this.video.muted = true;
                            this.video.play().then(resolve).catch(reject);
                        });
                };
            });
            
            // 更新 UI
            this.startControls.style.display = 'none';
            this.captureBtn.style.display = 'flex';
            this.captureHint.style.display = 'block';
            this.switchBtn.style.display = 'flex';
            this.scanQrBtn.style.display = 'flex';
            this.stepIndicator.textContent = '啟動成功';
            
        } catch (error) {
            console.error('啟動相機失敗:', error);
            let errorMsg = '無法訪問攝影機。';
            
            if (error.name === 'NotAllowedError') {
                errorMsg += '請允許瀏覽器訪問攝影機權限。';
            } else if (error.name === 'NotFoundError') {
                errorMsg += '未檢測到攝影機設備。';
            } else if (error.name === 'NotReadableError') {
                errorMsg += '攝影機正在被其他程式佔用。';
            }
            
            alert(errorMsg);
            this.startBtn.classList.remove('loading');
            this.startBtn.textContent = '啟動相機';
        }
    }
    
    async switchCamera() {
        // 切换前后摄像头
        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
        
        // 停止当前流
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        // 重新启动
        await this.startCamera();
    }
    startQrScan() {
        if (!this.stream) {
            alert('請先啟動相機');
            return;
        }
        
        this.isScanning = true;
        this.scanOverlay.style.display = 'flex';
        
        // 隐藏拍照按钮，显示停止扫描按钮
        this.captureBtn.style.display = 'none';
        this.switchBtn.style.display = 'none';
        this.scanQrBtn.style.display = 'none';
        this.scanControls.style.display = 'block';
        
        // 更新提示文字
        const scanText = this.scanOverlay.querySelector('.scan-text');
        if (scanText) {
            scanText.textContent = '對準二維碼，點擊下方按鈕掃描';
        }
    }
    
    stopQrScan() {
        this.isScanning = false;
        this.scanOverlay.style.display = 'none';
        this.scanControls.style.display = 'none';
        
        if (this.scanAnimationId) {
            cancelAnimationFrame(this.scanAnimationId);
            this.scanAnimationId = null;
        }
        
        // 恢复按钮显示
        this.captureBtn.style.display = 'flex';
        this.switchBtn.style.display = 'flex';
        this.scanQrBtn.style.display = 'flex';
        
        // 重新激活视频流
        this.refreshVideoStream();
    }
    
    manualCapture() {
        // 手動捕獲當前畫面嘗試識別二維碼
        if (!this.isScanning) return;
        
        // 提示正在掃描
        const scanText = this.scanOverlay.querySelector('.scan-text');
        if (scanText) {
            scanText.textContent = '正在掃描...';
            scanText.style.color = '#007AFF';
        }
        
        // 使用更高的采样率进行多次尝试
        let attempts = 0;
        const maxAttempts = 3;
        
        const tryCapture = () => {
            attempts++;
            
            const scanCanvas = document.createElement('canvas');
            // 兼容性：旧浏览器可能不支持willReadFrequently选项
            let scanCtx;
            try {
                scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
            } catch (e) {
                scanCtx = scanCanvas.getContext('2d');
            }
            
            scanCanvas.width = this.video.videoWidth;
            scanCanvas.height = this.video.videoHeight;
            
            if (scanCanvas.width > 0 && scanCanvas.height > 0) {
                try {
                    scanCtx.drawImage(this.video, 0, 0, scanCanvas.width, scanCanvas.height);
                    const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "attemptBoth",
                    });
                    
                    if (code) {
                        this.onQrCodeDetected(code.data);
                        return;
                    }
                } catch (error) {
                    console.error('捕獲失敗:', error);
                }
            }
            
            // 如果没找到且尝试次数未达上限，快速重试
            if (attempts < maxAttempts) {
                requestAnimationFrame(tryCapture);
            } else {
                // 所有尝试都失败了
                if (scanText) {
                    scanText.textContent = '未檢測到二維碼，請重新對準後再試';
                    scanText.style.color = '#FF3B30';
                    setTimeout(() => {
                        scanText.textContent = '對準二維碼，點擊下方按鈕掃描';
                        scanText.style.color = 'rgba(255, 255, 255, 0.9)';
                    }, 1500);
                }
            }
        };
        
        tryCapture();
    }
    
    refreshVideoStream() {
        // 强制刷新视频显示
        if (this.video && this.stream) {
            // 临时移除再重新设置视频流可以触发重绘
            const currentStream = this.video.srcObject;
            this.video.srcObject = null;
            
            // 使用 requestAnimationFrame 确保在下一帧重新设置
            requestAnimationFrame(() => {
                this.video.srcObject = currentStream;
                this.video.play().catch(err => console.error('恢复视频播放错误:', err));
            });
        }
    }
    
    scanQrCode() {
        // 此方法已废弃，现在使用手动点击扫描（manualCapture）
        // 保留此方法以防代码中有其他调用
    }
    
    onQrCodeDetected(qrContent) {
        // 停止扫描（会自动调用 refreshVideoStream）
        this.stopQrScan();
        
        // 设置二维码内容
        this.qrTextInput.value = qrContent;
        
        // 生成新的水印二维码
        this.generateQRCode();
        
        // 更新步驟
        this.stepIndicator.textContent = '步驟 2/2：拍攝照片';
        
        // 显示成功消息，延迟确保二维码生成完成
        setTimeout(() => {
            this.showSuccessMessage(`二維碼識別成功：${qrContent}`);
        }, 200);
    }
    
    showSuccessMessage(message) {
        // 显示成功提示
        this.successText.textContent = message;
        this.successMessage.style.display = 'flex';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            this.successMessage.style.display = 'none';
        }, 3000);
    }
    
    
    generateQRCode() {
        const qrText = this.qrTextInput.value.trim();
        
        if (!qrText) {
            alert('請輸入二維碼內容');
            return;
        }
        
        // 清空之前的二维码
        this.qrCanvas.innerHTML = '';
        this.qrCodeReady = false;  // 标记二维码未就绪
        
        // 生成新的二维码
        try {
            this.qrCode = new QRCode(this.qrCanvas, {
                text: qrText,
                width: this.qrSize,
                height: this.qrSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // 等待二维码图片真正加载完成
            const waitForQrImage = () => {
                const img = this.qrCanvas.querySelector('img');
                if (img) {
                    // 检查多个条件确保图片真正加载完成
                    const isComplete = img.complete;
                    const hasNaturalDimensions = img.naturalWidth > 0 && img.naturalHeight > 0;
                    const hasSrc = img.src && img.src.length > 0;
                    
                    if (isComplete && hasNaturalDimensions && hasSrc) {
                        console.log('二维码生成成功，尺寸:', img.naturalWidth, 'x', img.naturalHeight);
                        this.qrCodeReady = true;  // 标记二维码就绪
                        return;
                    }
                }
                // 继续等待
                setTimeout(waitForQrImage, 50);
            };
            
            // 开始等待
            setTimeout(waitForQrImage, 10);
            
        } catch (error) {
            console.error('生成二維碼失敗:', error);
            alert('生成二維碼失敗，請檢查輸入內容');
        }
    }
    
    capturePhoto() {
        console.log('開始拍照...');
        
        // 设置 canvas 尺寸为视频尺寸
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        console.log('Canvas 尺寸:', this.canvas.width, 'x', this.canvas.height);
        
        const ctx = this.canvas.getContext('2d');
        
        // 绘制视频帧
        ctx.drawImage(this.video, 0, 0);
        
        // 获取二维码图片（如果有的话）
        const qrImg = this.qrCanvas.querySelector('img');
        const hasQrText = this.qrTextInput.value.trim();
        
        // 更可靠的二维码就绪检测
        let hasQrCode = false;
        if (qrImg && hasQrText) {
            const isComplete = qrImg.complete;
            const hasNaturalDimensions = qrImg.naturalWidth > 0 && qrImg.naturalHeight > 0;
            const hasSrc = qrImg.src && qrImg.src.length > 0;
            const isReady = this.qrCodeReady === true;
            
            hasQrCode = isComplete && hasNaturalDimensions && hasSrc && isReady;
            
            console.log('二維碼檢測:', {
                isComplete,
                hasNaturalDimensions,
                hasSrc,
                isReady,
                finalResult: hasQrCode
            });
        }
        
        // 如果用户输入了二维码内容但图片还没生成完成，提示等待
        if (hasQrText && !hasQrCode) {
            this.showSuccessMessage('二維碼正在生成中，請稍後再試');
            console.log('二維碼未就緒，等待生成');
            return;
        }
        
        const qrSize = this.qrSize;
        const padding = 20;
        const bgPadding = 10;
        const borderRadius = 10;
        const opacity = this.opacity;
        
        // 1. 绘制二维码在左下角（如果有的话）
        if (hasQrCode) {
            const qrX = padding;
            const qrY = this.canvas.height - qrSize - bgPadding * 2 - padding;
            
            // 绘制二维码背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.roundRect(ctx, qrX - bgPadding, qrY - bgPadding, 
                          qrSize + bgPadding * 2, qrSize + bgPadding * 2, borderRadius);
            ctx.fill();
            
            // 绘制二维码
            ctx.globalAlpha = opacity;
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            ctx.globalAlpha = 1.0;
        }
        
        // 2. 绘制时间戳在右下角（固定显示）
        if (this.showTime) {
            const timeText = this.getFormattedTime();
            const fontSize = Math.max(18, qrSize * 0.15);
            
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'right';
            
            // 测量文本宽度
            const textMetrics = ctx.measureText(timeText);
            const textWidth = textMetrics.width;
            const textHeight = fontSize;
            const textBgPadding = 12;
            
            // 计算时间位置（右下角）
            const timeX = this.canvas.width - padding - textBgPadding;
            const timeY = this.canvas.height - padding - textBgPadding;
            
            // 绘制时间背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.roundRect(ctx, 
                          this.canvas.width - padding - textWidth - textBgPadding * 2,
                          timeY - textHeight - textBgPadding,
                          textWidth + textBgPadding * 2, 
                          textHeight + textBgPadding * 2, 
                          borderRadius);
            ctx.fill();
            
            // 绘制时间文本
            ctx.globalAlpha = opacity;
            ctx.fillStyle = '#333333';
            ctx.fillText(timeText, timeX, timeY - textBgPadding / 2);
            ctx.globalAlpha = 1.0;
        }
        
        // 显示预览
        console.log('生成照片成功，切換到預覽模式');
        
        try {
            this.photoPreviewImg.src = this.canvas.toDataURL('image/jpeg', 0.95);
            this.capturedImageData = this.canvas.toDataURL('image/jpeg', 0.95);
        } catch (error) {
            console.error('生成照片失敗:', error);
            // 尝试使用默认参数
            try {
                this.photoPreviewImg.src = this.canvas.toDataURL();
                this.capturedImageData = this.canvas.toDataURL();
            } catch (e) {
                alert('生成照片失敗，請重試');
                return;
            }
        }
        
        // 切换显示
        this.cameraView.style.display = 'none';
        this.photoPreview.style.display = 'block';
        document.querySelector('.controls').style.display = 'none';
        document.querySelector('.settings').style.display = 'none';
    }
    
    // 绘制圆角矩形辅助函数
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    savePhoto() {
        if (!this.capturedImageData) {
            alert('沒有可保存的照片');
            return;
        }
        
        // 生成带时间戳的文件名
        const now = new Date();
        const timestamp = now.getFullYear() + 
                         String(now.getMonth() + 1).padStart(2, '0') + 
                         String(now.getDate()).padStart(2, '0') + '_' +
                         String(now.getHours()).padStart(2, '0') + 
                         String(now.getMinutes()).padStart(2, '0') + 
                         String(now.getSeconds()).padStart(2, '0');
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `watermark_${timestamp}.jpg`;
        link.href = this.capturedImageData;
        link.click();
        
        // 显示提示
        this.saveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg> 已下載';
        setTimeout(() => {
            this.saveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 下載照片';
        }, 2000);
    }
    
    async sharePhoto() {
        if (!this.capturedImageData) {
            alert('沒有可分享的照片');
            return;
        }
        
        try {
            // 将 base64 转换为 Blob
            const response = await fetch(this.capturedImageData);
            const blob = await response.blob();
            
            // 生成文件名
            const now = new Date();
            const timestamp = now.getFullYear() + 
                             String(now.getMonth() + 1).padStart(2, '0') + 
                             String(now.getDate()).padStart(2, '0') + '_' +
                             String(now.getHours()).padStart(2, '0') + 
                             String(now.getMinutes()).padStart(2, '0') + 
                             String(now.getSeconds()).padStart(2, '0');
            
            const file = new File([blob], `watermark_${timestamp}.jpg`, { type: 'image/jpeg' });
            
            // 检查是否可以分享
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: '水印照片',
                    text: '来自 WaterMarkCam 的照片'
                });
                
                // 显示成功提示
                this.shareBtn.innerHTML = '<span>✅</span> 已分享';
                setTimeout(() => {
                    this.shareBtn.innerHTML = '<span>📤</span> 保存到相册';
                }, 2000);
            } else {
                alert('您的设备不支持分享功能，请使用“下载照片”按钮');
            }
        } catch (error) {
            // 用户取消分享或发生错误
            if (error.name !== 'AbortError') {
                console.error('分享失败:', error);
                alert('分享失败，请使用“下载照片”按钮');
            }
        }
    }
    
    retake() {
        // 重置显示
        this.cameraView.style.display = 'block';
        this.photoPreview.style.display = 'none';
        document.querySelector('.controls').style.display = 'flex';
        document.querySelector('.settings').style.display = 'block';
        
        // 清空预览
        this.capturedImageData = null;
    }
    
    getFormattedTime() {
        const now = new Date();
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // 固定格式：完整日期时间
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const app = new WaterMarkCam();
    
    // 页面卸载时停止相机
    window.addEventListener('beforeunload', () => {
        app.stopCamera();
    });
});
