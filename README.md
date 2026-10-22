# 月影神庙 · 异步寻宝记

> 在线体验：**https://bell-567.github.io/treasure-hunt-animation/**

把 `treasure.js` 里的 Promise 链寻宝，扩写成八幕异步冒险，并做成一个可交互的动画页面。

---

## 一、原版代码在做什么

原版 `treasure.js` 用 `TreasureMap` 类的四个静态方法模拟寻宝 API：

| 方法 | 延迟 | 结果 |
| --- | --- | --- |
| `getInitialClue()` | 1.0s | 在图书馆找到线索 |
| `decodeAncientScript(clue)` | 1.5s | 解码出神庙位置；线索为空时 `reject` |
| `searchTemple(location)` | 2.0s | 50% 概率遇到守卫失败，否则找到箱子 |
| `openTreasureBox()` | 1.0s | 找到宝藏 |

`findTreasureWithPromises()` 用 `.then()` 串行执行，`.catch()` 统一处理失败。

几个值得注意的细节：

- **50% 的失败率**：`searchTemple` 里 `Math.random() < 0.5` 会 `reject`，所以原版每次运行都有一半概率以「任务失败」结束，而且失败后不会重试。
- **`reject` 后没有 `return`**：`decodeAncientScript` 和 `searchTemple` 在 `reject` 之后仍然继续执行 `resolve`。因为 Promise 一旦 settle 就不会再改变状态，所以结果仍然正确，但写成 `return reject(...)` 更清晰。
- 四个步骤是严格串行的，后一步依赖前一步的结果，没有并发、重试和收尾逻辑。

---

## 二、新增的寻宝情节

1. **雨夜来信**：火漆上的太阳纹章，引出「观星会」与月影神庙。
2. **古籍解码**：羊皮地图 + 星轨重叠，解出「湖心之眼」。
3. **月影湖**：摆渡人的谜语「什么东西越洗越脏？」
4. **神庙之门（可交互）**：
   - 拨动日晷走正门：稳妥但更慢；
   - 潜入地下水道：捷径，但 62% 概率被守卫发现，触发自动重试；
   - 不操作时，8 秒后自动选择正门。
5. **三重试炼**：火盆、星象盘、守卫长廊必须**同时**完成（`Promise.all`）。
6. **流沙之门**：石门下沉，逃跑与关门**竞速**（`Promise.race`）。
7. **符文之锁**：按「月 → 星 → 日」的顺序依次点亮（串行 `await`）。
8. **宝藏揭晓**：箱子里不是黄金，而是一枚星辉罗盘与半张「天空之城」地图。

---

## 三、async / await 的用法对照

```js
// 串行：后一步依赖前一步
const clue = await TreasureMap.getInitialClue();
const decoded = await TreasureMap.decodeAncientScript(clue);

// 并发：三重试炼同时开始，全部完成后才继续
const trials = await Promise.all([
  TreasureMap.lightBrazier(),
  TreasureMap.readStarChart(),
  TreasureMap.sneakPastGuards(),
]);

// 竞速：逃跑和关门谁先完成
const outcome = await Promise.race([escape, closed]);

// 自动重试：只把可重试的失败交给 onRetry
await withRetry(
  async (attempt) => {
    await pause(850);
    if (attempt < 3 && Math.random() < 0.62) throw new StoryError('守卫发现了你');
    return true;
  },
  3,
  async (attempt) => {
    shake();
    flash('danger');
    log(`第 ${attempt} 次潜入被发现，退回水道入口。`, 'danger');
    await pause(700);
  }
);

// 收尾：无论成功、失败还是被「重新开始」取消，都会执行
try {
  await findTreasure();
} catch (err) {
  if (!(err instanceof AbortRun)) log(`探险中断：${err.message}`, 'danger');
} finally {
  stopTimer();
}
```

页面还用一个 `run` 令牌实现了「重新开始」：每次重开都会让令牌自增，旧的 `pause()` / 动画帧发现自己过期后抛出 `AbortRun`，不会污染新一轮剧情。

---

## 四、文件说明

| 文件 | 说明 |
| --- | --- |
| `index.html` | 动画页面，单文件自包含（HTML + CSS + JS），直接双击即可打开 |
| `treasure-async.js` | 终端增强版，用 `console.log` 展示同一套剧情与异步模式 |
| `treasure.js` | 原始文件，未改动 |

页面包含：SVG 寻宝地图、旅行者沿路径移动、并行试炼三枚指示灯、守卫失败震动、沙漏竞速、符文依次点亮、宝箱开启与金色粒子、八步进度与实时日志；桌面和手机都有适配。

---

## 五、运行方式

```bash
# 终端版（完整节奏）
node treasure-async.js

# 终端版（快速演示）
node treasure-async.js --fast

# 动画页面：直接打开 index.html
```

无需安装任何依赖。页面使用原生 Canvas、SVG、CSS 动画与 Web API。
