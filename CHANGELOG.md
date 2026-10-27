# 更新日志

记录对使用者有影响的功能变化。日期采用 YYYY-MM-DD；本日志不表示已创建 GitHub Release 或版本标签。

## 2026-10-27

### GitHub Pages 在线使用

- 增加 [在线入口](https://xiangyang233.github.io/ai-camera-prompt-tool/)，访问者无需安装开发环境。
- 新增 GitHub Actions 自动测试、构建和部署流程，推送 `main` 后更新线上站点，也支持手动触发。
- 修正仓库子路径下的模型、贴图、图标、首页与许可链接，兼容本地根路径预览。
- 补充 README 在线介绍、部署与本地生产预览说明。

### 焦距调整

- 新增焦距滑杆与直接数值输入，范围 18～200 mm，精度 0.1 mm，默认及重置值为 50 mm。
- 焦距改变真实取景范围，并同步更新画面占比、裁切判定、顶部焦距标签和中英文提示词。
- 根据所选焦距输出广角、标准或长焦镜头描述；调整焦距时保持相机位置和距离不变。
- 空输入确认后恢复最近有效值，超出范围自动限制到上下限。

实现提交：[7afcc6e](https://github.com/xiangyang233/ai-camera-prompt-tool/commit/7afcc6e)。

### 机位量化与更具体的提示词

- 使用常见摄影术语搭配自然语言，说明相机方位、可见侧面、俯仰和取景范围。
- 水平方位和视线俯仰以约 5° 为步长输出；水平参照为主体正面，左右以主体自身为准。
- 距离转换为实际屏幕投影高度占比，以约 5% 为步长表达；裁切时说明可见部分的比例及具体裁切边缘。
- 使用实际相机角度生成数字描述，避免把方向类别的中心角当作真实角度。
- 零俯仰描述为与主体中心等高；接近正上方或正下方时突出顶部或底部，避免与实际视角冲突。
- 保留原始相机输入精度；近似数字只用于提示词，不承诺绘图模型精确复现。

实现提交：[9276299](https://github.com/xiangyang233/ai-camera-prompt-tool/commit/9276299)、[0270b29](https://github.com/xiangyang233/ai-camera-prompt-tool/commit/0270b29)。

### 角度与距离数值输入

- 水平环绕与俯仰支持 0.1° 数值输入；水平角自动折算至一周内，俯仰限制为 ±85°。
- 距离支持 0.01 倍模型高度的数值输入，与滑杆和滚轮同步。
- 输入时更新预览，回车或失去焦点确认；输入未完成时保留编辑内容，空值确认后恢复最近有效值。

实现提交：[73ea5f7](https://github.com/xiangyang233/ai-camera-prompt-tool/commit/73ea5f7)、[caa9d3a](https://github.com/xiangyang233/ai-camera-prompt-tool/commit/caa9d3a)。

### 核心首版与开源

- 使用 Kenney Blocky Characters 的 CC0 静态人物模型和本地贴图，添加左侧配件便于辨认左右。
- 实现鼠标环绕、俯仰、滚轮调距离、实时 3D 取景、四个方向入口和镜头重置。
- 支持中英文提示词、可选主体文字、一键复制和键盘微调。
- 使用原生 TypeScript、Three.js 和 Vite，按需渲染，无后端和外部模型 API。
- 原创代码与文档采用 MIT License；模型与贴图独立采用 CC0，保留来源和许可说明。

实现提交：[1686675](https://github.com/xiangyang233/ai-camera-prompt-tool/commit/1686675)、[3d64e37](https://github.com/xiangyang233/ai-camera-prompt-tool/commit/3d64e37)。

### 文档与验证

- 完善 README 项目介绍、使用流程、提示词示例、运行方式及能力范围，新增本更新日志。
- 最新功能版本通过 13 项自动测试、TypeScript 类型检查和生产构建；浏览器验证了数值输入、范围限制、滑杆同步及重置。
- 完整验证范围与限制见 [验证记录](docs/verification.md)。尚未进行跨绘图模型的成图遵循度测试。
