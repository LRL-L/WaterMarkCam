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
        this.driveConnectBtn = document.getElementById('driveConnectBtn');
        this.driveStatusText = document.getElementById('driveStatusText');
        this.uploadDriveBtn = document.getElementById('uploadDriveBtn');
        
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
        this.lastQrContent = null; // 保存最后一次扫描的内容
        
        // Google Drive 配置
        this.GOOGLE_CLIENT_ID = '929594650238-cu7drqo4qt3be9s4imnha9a9589n6e4j.apps.googleusercontent.com';
        this.GOOGLE_API_KEY = ''; // 可选：如果需要 API Key
        this.DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
        this.DRIVE_FOLDER_NAME = 'WaterMarkCam Photos';
        this.isDriveConnected = false;
        this.accessToken = null;
        this.driveFolderId = null;
        this.tokenClient = null; // Google Identity Services Token Client
        
        // 自动连接控制
        this.userManuallyDisconnected = false; // 用户是否手动断开连接
        
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
        this.driveConnectBtn.addEventListener('click', () => this.handleDriveConnect());
        this.uploadDriveBtn.addEventListener('click', () => this.uploadToDrive());
        
        // 时间固定显示，移除相关事件监听
        
        // 生成初始二维码（如果有默认内容）
        if (this.qrTextInput.value.trim()) {
            this.generateQRCode().catch(err => {
                console.error('初始化二维码失败:', err);
            });
        }
        
        // 检查是否支持 Web Share API
        this.checkShareSupport();
        
        // 检查浏览器支持
        this.checkBrowserSupport();
        
        // 初始化 Google Drive API
        this.initGoogleDrive();
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
            
            // 恢復高分辨率以確保拍照質量（掃描時會降低處理分辨率）
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
            
            // 等待视频加载并播放（Android设备特别处理）
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    // Android某些设备需要手动设置属性
                    this.video.setAttribute('autoplay', '');
                    this.video.setAttribute('playsinline', '');
                    this.video.setAttribute('muted', '');
                    
                    console.log('📹 視頻尺寸:', this.video.videoWidth, 'x', this.video.videoHeight);
                    
                    this.video.play()
                        .then(() => {
                            console.log('✅ 视频播放成功');
                            resolve();
                        })
                        .catch(err => {
                            console.warn('⚠️ 自動播放失敗，嘗試靜音播放:', err);
                            // 如果自动播放失败，确保静音后重试
                            this.video.muted = true;
                            this.video.play()
                                .then(() => {
                                    console.log('✅ 靜音播放成功');
                                    resolve();
                                })
                                .catch(err2 => {
                                    console.error('❌ 播放失败:', err2);
                                    // 最后尝试：用户手动触发
                                    reject(err2);
                                });
                        });
                };
                
                // 超时保护（10秒）
                setTimeout(() => {
                    reject(new Error('視頻載入超時'));
                }, 10000);
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
            scanText.textContent = '請將二維碼放在框內';
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
        // 點擊按鈕後開始持續掃描視頻流
        if (!this.isScanning) return;
        
        // 如果已經在掃描中，不要重複啟動
        if (this.scanAnimationId) {
            console.log('已經在掃描中');
            return;
        }
        
        // 提示正在掃描
        const scanText = this.scanOverlay.querySelector('.scan-text');
        if (scanText) {
            scanText.textContent = '正在掃描中...';
            scanText.style.color = '#007AFF';
        }
        
        // 開始持續掃描
        this.scanQrCode();
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
        // 持續掃描視頻流
        if (!this.isScanning) return;
        
        // 檢查視頻是否正常播放
        if (this.video.paused || this.video.ended) {
            this.video.play().catch(err => console.error('視頻播放錯誤:', err));
        }
        
        // 創建臨時 canvas 用於掃描
        const scanCanvas = document.createElement('canvas');
        const scanCtx = scanCanvas.getContext('2d');
        
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        
        if (videoWidth > 0 && videoHeight > 0) {
            try {
                // 優化1: 只掃描中心區域（70%），提高識別速度和準確率
                const scanRegion = 0.7;
                const scanWidth = Math.floor(videoWidth * scanRegion);
                const scanHeight = Math.floor(videoHeight * scanRegion);
                const offsetX = Math.floor((videoWidth - scanWidth) / 2);
                const offsetY = Math.floor((videoHeight - scanHeight) / 2);
                
                // 優化2: 降低分辨率以提高性能（保持最大800px）
                const maxDimension = 800;
                let targetWidth = scanWidth;
                let targetHeight = scanHeight;
                
                if (scanWidth > maxDimension || scanHeight > maxDimension) {
                    const scale = Math.min(maxDimension / scanWidth, maxDimension / scanHeight);
                    targetWidth = Math.floor(scanWidth * scale);
                    targetHeight = Math.floor(scanHeight * scale);
                }
                
                scanCanvas.width = targetWidth;
                scanCanvas.height = targetHeight;
                
                // 繪製視頻中心區域到 canvas
                scanCtx.drawImage(
                    this.video,
                    offsetX, offsetY, scanWidth, scanHeight,
                    0, 0, targetWidth, targetHeight
                );
                
                // 優化3: 增強對比度和亮度，提高識別率
                const imageData = scanCtx.getImageData(0, 0, targetWidth, targetHeight);
                this.enhanceImageContrast(imageData);
                scanCtx.putImageData(imageData, 0, 0);
                
                // 重新獲取增強後的圖像數據
                const enhancedImageData = scanCtx.getImageData(0, 0, targetWidth, targetHeight);
                
                // 使用 jsQR 識別二維碼，添加更多選項
                const code = jsQR(enhancedImageData.data, enhancedImageData.width, enhancedImageData.height, {
                    inversionAttempts: "attemptBoth",
                });
                
                if (code) {
                    // 識別成功
                    console.log('✅ 二維碼識別成功:', code.data);
                    this.onQrCodeDetected(code.data);
                    return;
                }
            } catch (error) {
                console.error('掃描錯誤:', error);
            }
        }
        
        // 優化4: 控制掃描頻率（每 100ms 掃描一次，避免過度消耗資源）
        setTimeout(() => {
            this.scanAnimationId = requestAnimationFrame(() => this.scanQrCode());
        }, 100);
    }
    
    enhanceImageContrast(imageData) {
        // 增強圖像對比度和亮度，提高二維碼識別率
        const data = imageData.data;
        const factor = 1.5; // 對比度增強係數
        const brightness = 10; // 亮度增加值
        
        for (let i = 0; i < data.length; i += 4) {
            // 轉換為灰度值（提高識別速度）
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            
            // 應用對比度和亮度調整
            let enhanced = ((gray - 128) * factor) + 128 + brightness;
            enhanced = Math.max(0, Math.min(255, enhanced));
            
            // 設置 RGB 為相同值（灰度圖）
            data[i] = enhanced;     // R
            data[i + 1] = enhanced; // G
            data[i + 2] = enhanced; // B
            // Alpha 通道保持不變
        }
    }
    
    onQrCodeDetected(qrContent) {
        // 停止扫描（会自动调用 refreshVideoStream）
        this.stopQrScan();
        
        // 设置二维码内容
        this.qrTextInput.value = qrContent;
        this.lastQrContent = qrContent; // 保存内容供重试
        
        // 显示生成中的提示
        this.stepIndicator.textContent = '正在生成水印...';
        
        // 生成新的水印二维码，带重试机制
        this.generateQRCodeWithRetry(qrContent, 0);
    }
    
    generateQRCodeWithRetry(qrContent, retryCount = 0) {
        const maxRetries = 2; // 最多重试次数
        
        this.generateQRCode()
            .then(() => {
                console.log('✅ 二維碼水印已就緒');
                // 更新步驟
                this.stepIndicator.textContent = '步驟 2/2：拍攝照片';
                // 显示成功消息
                const displayText = qrContent.length > 30 ? qrContent.substring(0, 30) + '...' : qrContent;
                this.showSuccessMessage(`二維碼識別成功：${displayText}`);
            })
            .catch((error) => {
                console.error(`生成二維碼失敗 (第${retryCount + 1}次嘗試):`, error);
                
                // 如果还有重试次数，自动重试
                if (retryCount < maxRetries) {
                    console.log(`🔄 正在重试... (${retryCount + 1}/${maxRetries})`);
                    this.stepIndicator.textContent = `重試中 (${retryCount + 1}/${maxRetries})...`;
                    
                    // 清空之前的生成尝试
                    this.qrCanvas.innerHTML = '';
                    this.qrCodeReady = false;
                    
                    // 延迟500ms后重试
                    setTimeout(() => {
                        this.generateQRCodeWithRetry(qrContent, retryCount + 1);
                    }, 500);
                } else {
                    // 所有重试都失败了
                    this.stepIndicator.textContent = '生成失敗，請重試';
                    
                    // 提供更详细的错误信息
                    let errorMsg = '生成二維碼水印失敗\n\n';
                    
                    if (error === '生成超時') {
                        errorMsg += '原因：生成超时（5秒）\n';
                        errorMsg += '建议：\n1. 檢查二維碼內容是否過長\n2. 關閉其他應用程式釋放內存\n3. 再次掃描二維碼';
                    } else {
                        errorMsg += `原因：${error}\n`;
                        errorMsg += '建议：\n1. 刷新頁面重試\n2. 清除瀏覽器緩存\n3. 檢查網路連接';
                    }
                    
                    alert(errorMsg);
                    
                    // 自动返回扫描状态，方便用户重试
                    console.log('🔄 準備重新掃描...');
                }
            });
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
            return Promise.reject('無內容');
        }
        
        console.log('📝 開始生成二維碼:', qrText);
        
        // 清空之前的二维码
        this.qrCanvas.innerHTML = '';
        this.qrCodeReady = false;
        
        // 使用纯Canvas绘制，不依赖DOM img元素
        return new Promise((resolve, reject) => {
            try {
                // 创建二维码对象（纯算法，不操作DOM）
                const qr = qrcode(0, 'H'); // 0=自动选择版本, H=高纠错
                qr.addData(qrText);
                qr.make();
                
                const moduleCount = qr.getModuleCount();
                const cellSize = Math.floor(this.qrSize / moduleCount);
                const qrPixelSize = cellSize * moduleCount;
                
                console.log('🔧 二維碼模块数:', moduleCount, '单元格大小:', cellSize);
                
                // 创建Canvas直接绘制
                const canvas = document.createElement('canvas');
                canvas.width = qrPixelSize;
                canvas.height = qrPixelSize;
                const ctx = canvas.getContext('2d');
                
                // 白色背景
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, qrPixelSize, qrPixelSize);
                
                // 绘制二维码（黑色方块）
                ctx.fillStyle = '#000000';
                for (let row = 0; row < moduleCount; row++) {
                    for (let col = 0; col < moduleCount; col++) {
                        if (qr.isDark(row, col)) {
                            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                        }
                    }
                }
                
                // 将Canvas添加到容器
                this.qrCanvas.appendChild(canvas);
                
                console.log('✅ 二維碼Canvas繪製完成');
                this.qrCodeReady = true;
                
                // 立即resolve，因为Canvas是同步绘制的
                resolve(canvas);

                
            } catch (error) {
                console.error('生成二維碼失敗:', error);
                this.qrCodeReady = false;
                reject(error);
            }
        });
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
        
        // 获取二维码Canvas（不再依赖img元素）
        const qrCanvasElement = this.qrCanvas.querySelector('canvas');
        const hasQrText = this.qrTextInput.value.trim();
        
        // 更可靠的二维码就绪检测（使用Canvas）
        let hasQrCode = false;
        if (qrCanvasElement && hasQrText) {
            const hasValidSize = qrCanvasElement.width > 0 && qrCanvasElement.height > 0;
            const isReady = this.qrCodeReady === true;
            
            hasQrCode = hasValidSize && isReady;
            
            console.log('📸 拍照时二維碼檢測 (Canvas模式):', {
                hasQrText,
                hasQrCanvas: !!qrCanvasElement,
                canvasWidth: qrCanvasElement ? qrCanvasElement.width : 0,
                canvasHeight: qrCanvasElement ? qrCanvasElement.height : 0,
                isReady,
                finalResult: hasQrCode
            });
        }
        
        // 如果用户输入了二维码内容但Canvas还没生成完成，提示等待
        if (hasQrText && !hasQrCode) {
            console.warn('⚠️ 二維碼未就緒，拒絕拍照');
            
            // Canvas是同步生成的，如果存在就应该可用
            if (qrCanvasElement && qrCanvasElement.width > 0) {
                console.log('🔄 二維碼Canvas存在，設置為就緒');
                this.qrCodeReady = true;
                this.showSuccessMessage('二維碼已就緒，請再次點擊拍照按鈕');
            } else {
                this.showSuccessMessage('二維碼正在生成中，請稍後再試');
            }
            return;
        }
        
        const qrSize = this.qrSize;
        const padding = 20;
        const bgPadding = 10;
        const borderRadius = 10;
        const opacity = this.opacity;
        
        // 1. 绘制二维码在左下角（如果有的话）- 使用Canvas
        if (hasQrCode) {
            const qrX = padding;
            const qrY = this.canvas.height - qrSize - bgPadding * 2 - padding;
            
            // 绘制二维码背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.roundRect(ctx, qrX - bgPadding, qrY - bgPadding, 
                          qrSize + bgPadding * 2, qrSize + bgPadding * 2, borderRadius);
            ctx.fill();
            
            // 绘制二维码（从Canvas绘制）
            ctx.globalAlpha = opacity;
            ctx.drawImage(qrCanvasElement, qrX, qrY, qrSize, qrSize);
            ctx.globalAlpha = 1.0;
            
            console.log('✅ 二維碼已添加到照片 (Canvas模式)');
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
        
        // Android兼容性：某些浏览器需要将链接添加到DOM
        document.body.appendChild(link);
        link.click();
        
        // 清理（延迟删除，确保下载触发）
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
        
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
    
    // ===== Google Drive 云端存储功能 =====
    
    initGoogleDrive() {
        // 等待 Google API 客户端库加载
        const waitForGapi = () => {
            return new Promise((resolve) => {
                if (typeof gapi !== 'undefined') {
                    gapi.load('client', () => {
                        gapi.client.init({
                            apiKey: this.GOOGLE_API_KEY || '',
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                        }).then(() => {
                            console.log('✅ Google API 客户端已初始化');
                            resolve();
                        }).catch(err => {
                            console.error('Google API 初始化失败:', err);
                            resolve(); // 即使失败也继续
                        });
                    });
                } else {
                    console.warn('gapi 未加载，3秒后重试...');
                    setTimeout(() => waitForGapi().then(resolve), 3000);
                }
            });
        };
        
        // 等待 Google Identity Services 加载
        const waitForGIS = () => {
            return new Promise((resolve) => {
                const checkGIS = () => {
                    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                        this.tokenClient = google.accounts.oauth2.initTokenClient({
                            client_id: this.GOOGLE_CLIENT_ID,
                            scope: this.DRIVE_SCOPE,
                            callback: (response) => {
                                if (response.error) {
                                    console.log('OAuth 响应错误:', response.error);
                                    
                                    // 静默登录失败是正常情况，不需要弹窗
                                    if (response.error !== 'popup_closed' && 
                                        response.error !== 'access_denied' &&
                                        response.error !== 'user_logged_out') {
                                        console.error('OAuth 错误:', response);
                                        alert('連接失敗：' + response.error);
                                    }
                                    
                                    this.driveStatusText.textContent = '連接雲端';
                                    this.driveConnectBtn.disabled = false;
                                    return;
                                }
                                
                                // 获取访问令牌成功
                                console.log('✅ 获取到访问令牌');
                                this.accessToken = response.access_token;
                                this.onDriveConnected();
                            }
                        });
                        console.log('✅ Google Identity Services 已初始化');
                        resolve();
                    } else {
                        console.log('等待 Google Identity Services 加载...');
                        setTimeout(checkGIS, 500);
                    }
                };
                checkGIS();
            });
        };
        
        // 并行等待两个库加载
        Promise.all([waitForGapi(), waitForGIS()]).then(() => {
            console.log('✅ Google Drive 功能已就绪');
            // 启用连接按钮
            if (this.driveConnectBtn) {
                this.driveConnectBtn.disabled = false;
                this.driveStatusText.textContent = '連接雲端';
            }
            
            // 尝试自动连接（静默登录）
            this.autoConnectDrive();
        });
    }
    
    async autoConnectDrive() {
        if (!this.tokenClient) {
            console.log('Token client 未初始化，跳过自动连接');
            return;
        }
        
        // 如果用户之前手动断开过，则不自动连接
        if (this.userManuallyDisconnected) {
            console.log('用户已手动断开，跳过自动连接');
            return;
        }
        
        try {
            console.log('🔄 尝试静默自动登录...');
            this.driveStatusText.textContent = '自動連接中...';
            
            // 使用静默模式请求 token
            this.tokenClient.requestAccessToken({ prompt: '' });
            
        } catch (error) {
            console.log('静默登录失败（正常情况）:', error);
            this.driveStatusText.textContent = '連接雲端';
        }
    }
    
    async handleDriveConnect() {
        if (this.isDriveConnected) {
            // 已连接，点击断开
            this.disconnectDrive();
        } else {
            // 未连接，开始认证
            this.userManuallyDisconnected = false; // 重置断开标志
            await this.connectToDrive();
        }
    }
    
    async connectToDrive() {
        try {
            if (!this.tokenClient) {
                alert('Google Identity Services 未初始化，請重新加載頁面');
                return;
            }
            
            this.driveStatusText.textContent = '連接中...';
            this.driveConnectBtn.disabled = true;
            
            // 用户主动点击，显示账号选择界面
            this.tokenClient.requestAccessToken({ prompt: 'select_account' });
            
        } catch (error) {
            console.error('Google Drive 连接失败:', error);
            alert('連接 Google 雲端硬碟失敗，請稍後重試');
            this.driveStatusText.textContent = '連接雲端';
            this.driveConnectBtn.disabled = false;
        }
    }
    
    async onDriveConnected() {
        try {
            // 确保文件夹存在
            await this.ensureDriveFolder();
            
            // 更新 UI
            this.isDriveConnected = true;
            this.driveConnectBtn.classList.add('connected');
            this.driveStatusText.textContent = '已連接';
            this.driveConnectBtn.disabled = false;
            
            // 显示上传按钮
            this.uploadDriveBtn.style.display = 'inline-flex';
            
            console.log('✅ Google Drive 连接成功');
        } catch (error) {
            console.error('文件夹初始化失败:', error);
            alert('雲端文件夾初始化失敗');
            this.driveStatusText.textContent = '連接雲端';
            this.driveConnectBtn.disabled = false;
        }
    }
    
    disconnectDrive() {
        // 撤销访问令牌
        if (this.accessToken && google.accounts.oauth2) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                console.log('✅ Access token 已撤销');
            });
        }
        
        this.isDriveConnected = false;
        this.accessToken = null;
        this.driveFolderId = null;
        this.driveConnectBtn.classList.remove('connected');
        this.driveStatusText.textContent = '連接雲端';
        this.uploadDriveBtn.style.display = 'none';
        this.userManuallyDisconnected = true; // 标记为手动断开
        
        console.log('✅ Google Drive 已断开');
    }
    
    async ensureDriveFolder() {
        try {
            // 设置访问令牌
            gapi.client.setToken({
                access_token: this.accessToken
            });
            
            // 搜索是否已存在该文件夹
            const response = await gapi.client.drive.files.list({
                q: `mimeType='application/vnd.google-apps.folder' and name='${this.DRIVE_FOLDER_NAME}' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            });
            
            if (response.result.files.length > 0) {
                // 文件夹已存在
                this.driveFolderId = response.result.files[0].id;
                console.log('📁 找到现有文件夹:', this.driveFolderId);
            } else {
                // 创建新文件夹
                const folderMetadata = {
                    name: this.DRIVE_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                };
                
                const folder = await gapi.client.drive.files.create({
                    resource: folderMetadata,
                    fields: 'id'
                });
                
                this.driveFolderId = folder.result.id;
                console.log('📁 创建新文件夹:', this.driveFolderId);
            }
        } catch (error) {
            console.error('文件夹检查/创建失败:', error);
            throw error;
        }
    }
    
    async uploadToDrive() {
        if (!this.isDriveConnected) {
            alert('請先連接 Google 雲端硬碟');
            return;
        }
        
        if (!this.capturedImageData) {
            alert('沒有可上傳的照片');
            return;
        }
        
        try {
            // 更新按钮状态
            this.uploadDriveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 上傳中...';
            this.uploadDriveBtn.disabled = true;
            this.driveConnectBtn.classList.add('uploading');
            
            // 设置访问令牌
            gapi.client.setToken({
                access_token: this.accessToken
            });
            
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
            const fileName = `watermark_${timestamp}.jpg`;
            
            // 准备元数据
            const fileMetadata = {
                name: fileName,
                parents: [this.driveFolderId]
            };
            
            // 使用 multipart 上传
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
            form.append('file', blob);
            
            const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: form
            });
            
            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error('上传失败: ' + (errorData.error?.message || uploadResponse.statusText));
            }
            
            const result = await uploadResponse.json();
            console.log('✅ 文件上传成功:', result);
            
            // 更新按钮状态
            this.uploadDriveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg> 已上傳';
            this.driveConnectBtn.classList.remove('uploading');
            
            // 2秒后恢复按钮
            setTimeout(() => {
                this.uploadDriveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="17 13 12 8 7 13"/><line x1="12" y1="8" x2="12" y2="21"/></svg> 上傳至雲端';
                this.uploadDriveBtn.disabled = false;
            }, 2000);
            
        } catch (error) {
            console.error('上传到 Google Drive 失败:', error);
            alert('上傳失敗：' + error.message);
            
            // 恢复按钮
            this.uploadDriveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="17 13 12 8 7 13"/><line x1="12" y1="8" x2="12" y2="21"/></svg> 上傳至雲端';
            this.uploadDriveBtn.disabled = false;
            this.driveConnectBtn.classList.remove('uploading');
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
