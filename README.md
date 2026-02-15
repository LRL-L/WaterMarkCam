# WaterMarkCam - 二维码水印相机

> 版本 v1.0.1

基于纯网页技术的二维码水印相机应用，支持 iOS 和 Android 设备。

## 功能特点

- 实时相机预览
- 二维码扫描识别
- 前后摄像头切换
- 自动添加二维码水印
- 保存和分享照片

## 快速开始

### 本地测试

```bash
# 使用 Python
python -m http.server 8000

# 或使用 Node.js
npx http-server -p 8000
```

访问：`http://localhost:8000`

## 使用方法

1. 点击"启动相机"并授予权限
2. 点击"扫描二维码"识别二维码内容
3. 点击拍照按钮
4. 下载或分享带水印的照片

## 技术栈

- HTML5 / CSS3 / JavaScript (ES6+)
- getUserMedia API - 相机访问
- Canvas API - 图像处理
- QRCode.js - 二维码生成
- jsQR - 二维码识别

## 浏览器要求

- iOS: Safari 11.3+
- Android: Chrome 53+ / Firefox 68+
- Desktop: Chrome 53+ / Firefox 36+ / Safari 11+

支持低版本浏览器，已集成兼容性 polyfills

## 常见问题

**相机无法启动**
- 检查浏览器权限设置
- 确保使用 HTTPS 或 localhost
- 确认设备有可用摄像头

**照片保存位置**
- iOS: "文件"应用的"下载"文件夹
- Android: 设备的"下载"文件夹

## 许可证

MIT License
