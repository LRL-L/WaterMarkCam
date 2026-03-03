# WaterMarkCam - 二维码水印相机

> 版本 v1.0.6

基于纯网页技术的二维码水印相机应用，支持 iOS 和 Android 设备。

## 功能特点

- ✅ 实时相机预览
- ✅ 二维码扫描识别
- ✅ 前后摄像头切换
- ✅ 自动添加二维码水印
- ✅ 保存和分享照片
- ✅ **Google Drive 云端存储**（v1.0.5 新增）
- ✅ **多文件夹分类管理**（v1.0.6 新增）
- ✅ **自动登录功能**（v1.0.6 新增）
- ✅ PWA 离线支持
- ✅ 可安装到主屏幕

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

**二维码扫描困难**
- 将二维码放在屏幕中心的扫描框内
- 保持二维码清晰，避免模糊或反光
- 适当调整距离（15-30cm 最佳）
- 确保光线充足
- 点击扫描按钮后等待 1-2 秒让相机对焦

**照片保存位置**
- iOS: "文件"应用的"下载"文件夹
- Android: 设备的"下载"文件夹
- Google Drive: "WaterMarkCam Photos" 文件夹（需先连接云端）

## Google Drive 云端存储

v1.0.5 新增 Google Drive 整合功能，支持将照片上传到云端：

### 如何使用

1. 点击页面右上角 **"连接云端"** 按钮
2. 使用 Google 帐户登录并授权
3. 拍照后点击 **"上传至云端"** 按钮
4. 照片会保存到 Google Drive 的 "WaterMarkCam Photos" 文件夹

### 特点

- 🔒 **安全认证**：使用 OAuth 2.0，不存储密码
- 📁 **自动创建文件夹**：首次使用自动创建专属文件夹
- 🌐 **跨平台访问**：在任何设备上访问您的照片
- 📱 **移动端友好**：iOS Safari 和 Android Chrome 完全支持

详细说明请查看 [Google雲端功能說明.md](./Google雲端功能說明.md)

## PWA 支持

本应用支持作为 PWA（渐进式 Web 应用）安装：

- **iOS**: 在 Safari 中点击分享按钮 → "添加到主屏幕"
- **Android**: 浏览器会提示"添加到主屏幕"
- **离线功能**: 安装后可离线使用（云端上传需要网络）

## 许可证

MIT License
