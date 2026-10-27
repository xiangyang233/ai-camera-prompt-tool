# 第三方模型资源

## Kenney Blocky Characters 2.0

- 作者：Kenney。
- 官方页面：https://kenney.nl/assets/blocky-characters
- 获取日期：2026-10-27。
- 原始包：`kenney_blocky-characters_20.zip`，从官方页面的下载链接获取。
- 许可：Creative Commons Zero，CC0。包内许可原文保存在 [public/models/LICENSE.txt](../public/models/LICENSE.txt)。
- 选定文件：`Models/OBJ format/character-a.obj` 与 `Models/OBJ format/Textures/texture-a.png`。
- 项目位置：`public/models/character-a.obj` 和 `public/models/texture-a.png`。

选择静态 OBJ 是因为核心功能不需要动画或骨骼；OBJ 与贴图合计 27,499 字节。原始 OBJ 和贴图未修改，原始 MTL 不参与加载，运行时直接应用该贴图与本地材质。

加载后按模型高度统一缩放至 2.2 场景单位，并将整体包围盒中心移至原点。角色正面为 +Z，主体左侧为 +X。新增由简单几何体组成的绿色左侧挎包和金色搭扣，用于加强左右辨识；模型本体与贴图保持原样。相机围绕包含配件的整体中心运动。

SHA-256：

```text
character-a.obj
ed5d8652981c0004fd00582b35517a0bd02804eb7290e036aec2f4b7acf503d0

texture-a.png
257e944c582ce7cda206fbd8ceb717be648f9721756baf377a36478c11c0059a
```

使用模型前已阅读下载包内许可。项目同时保留许可文件和作者信息，来源可追溯。
