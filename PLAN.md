# 力氣錘（`pg-strongman`）— 遊戲規劃文檔

> **用途：** 本 repo 的遊戲權威規格——coding agent 改動前必讀：這個遊戲是什麼、規則、設計限制、優化方向。
> **整理方式：** 從本 repo 實作反向整理（2026-08-23）。**改玩法先改此檔再改碼**；本檔與程式碼衝突時，以「規則（§3）」描述的設計意圖為準回報差異。
> **上游契約：** [PG-GAME-AGENT-GUIDE.md](https://github.com/sampot/playgrounds/blob/main/docs/PG-GAME-AGENT-GUIDE.md)（唯一必讀；本檔不重複其全文）· 型錄條目 `playgrounds/catalog/entries/pg-strongman.yaml`

## 1. 一句話

夜市大力王風格：按住蓄力、抓準游標進入右端落槌區的瞬間放開，√蓄力×節奏決定指標爬升高度——衝破 0.92 響鈴門檻敲鐘加 250 分。

## 2. 定案速覽

| 項 | 值 |
| --- | --- |
| catalog id / kind / series | `pg-strongman` / `game` / `機台` |
| status | `listed` |
| 核心公式 | height = clamp01(√charge × timing)；score = ⌊height×749⌋＋響鈴 +250，滿分 **999** |
| 節奏 | 蓄力線性 **1500ms**；冷卻 **1500ms**；游標三角波往返週期 1240ms |
| 響鈴門檻 | BELL_THRESHOLD=0.92；高度評級 ≥0.62 重／≥0.32 中／其餘輕 |
| 落槌區 | 游標位置 0.82 處 timing 滿檔 1.0（偏左懲罰重於偏右） |
| 持久化 | 最高紀錄 → `/api/kv/pg-strongman-best`（KV 權威） |
| 素材 | Kenney CC0（木塔元素×3、獎品球×2、Impact Sounds ×3）；備援合成音 |
| 交付形 | 純 HTML＋CSS＋ESM JS；無 build；`npx vitest run` 測試 |

## 3. 完整規則（現行實作）

### 3.1 蓄力與節奏（`game.js`）

- `chargeAt(elapsedMs) = clamp01(elapsed / 1500)`——1.5 秒線性填滿（無過充懲罰）。
- 游標 `cursorPosition`：`(elapsed/620) % 2` 的三角波（≤1 正走、>1 折返），0↔1 往返週期約 1240ms。
- `swingTiming(pos)`：distance=|pos−0.82|/0.82；timing = 0.25+0.75×(1−clamp01(distance))。pos=0.82 → 1.0；pos=0 → 0.25；pos=1 → ≈0.835（落點過頭的懲罰較輕）。

### 3.2 揮錘結算

- `hit(state, charge, timing)`：height=clamp01(√clamp01(charge)×clamp01(timing))；bell = height≥0.92；score=⌊height×749⌋+(bell?250:0)；進入 cooldown 1500ms（期間再擊返回原 state）。√charge 讓「多等半秒」的邊際效益遞減——蓄力與節奏須兼得。
- 評級 `labelForHeight`：≥0.92 響鈴、≥0.62 重、≥0.32 中、其餘輕。
- `ready(state)` 由 UI 於 cooldownMs 後呼叫；分數/sessionBest/attempts 保留到按「新局」。

### 3.3 輸入與演出

- 按住揮錘鈕或空白鍵開始蓄力並 setPointerCapture；pointerup/cancel 或放開鍵落槌。cooldown 中按鈕 disabled。
- 兩段演出：落槌後 **390ms** 才顯示結果——pad.hit 塌陷動畫、climber 以 `translate(-50%, −height×234px)` 沿木塔爬升、響鈴時 bell.ring 搖鈴＋金屬撞擊組合音。round 計數器防止 reset 後舊 timeout 覆寫新局。
- score > KV 最佳值即回寫；KV 失敗靜默（單機模式仍可玩）。

### 3.4 邊界處理

- charge/timing 輸入皆 clamp01 且 NaN 防護（測試覆蓋 hit(5,5)=999）。
- resetGame 於任意 phase 可中斷：取消 rAF、round+1 使排隊中的 setTimeout 全部失效、UI 歸零。

## 4. 操作與畫面

| 輸入 | 動作 |
| --- | --- |
| 按住「蓄力揮錘」鈕／空白鍵 | 力量條上升＋游標往返 |
| 放開 | 落槌結算（390ms 延遲揭曉） |
| 新局 | 清畫面狀態重新開始 |
| 音效鈕 | 開/關（記憶體） |

- HUD 三數字窗：本次、本局最佳、最高紀錄（3 位補零）；機台面：頂端金鐘、木塔（climber 小人沿爬）、底部打擊墊、木槌 charging/swing CSS 動畫、落槌節奏計（金色區在右端）。
- status 列 role=status 播報；Mobile-first 直向；禁原生對話框。

## 5. 持久化（KV 權威）

| key | 內容 | 讀寫時機 |
| --- | --- | --- |
| `pg-strongman-best`（KV） | 歷史最高單擊分數（字串整數 ≥0） | 載入 fetch 讀取；破紀錄時 PUT；失敗靜默仍可玩 |
| （無）localStorage | — | 未使用；sessionBest 僅記憶體 |

- functions.js 為 Pages Functions 風 stub（`onRequest` 回 "ok"）。新增統計走 `/api/kv/pg-strongman-*`。

## 6. 美術／音效／署名

- `assets/art/`：elementWood001/014/028.png — Kenney **Physics Assets**；genericItem_color_080/081.png — Kenney **Generic Items #1**。皆 CC0 1.0（授權文字 `License-physics.txt` 等）。
- `assets/sfx/`：impactWood_heavy_000.ogg（落槌）、impactPlate_heavy_000.ogg（響鈴）、impactMetal_heavy_000.ogg（鈴後餘音）— Kenney **Impact Sounds**（CC0），見 `assets/sfx/License.txt`。
- 音效編排（`audio.js`）：每次 impact 先播 wood；若響鈴，延遲 **750ms** 播 plate（gain 0.9）、780ms 再疊 metal（0.45）模擬鐘聲餘韻。buffer 解碼失敗退回 WebAudio 合成（square 92Hz / sine 880Hz 1.1s）。AudioContext 於首次手勢 unlock 並預載 buffers。
- 詳 `ATTRIBUTION.md`。CC0 不要求署名但照專案慣例標示。新增素材：拷進 `assets/`、更新 ATTRIBUTION.md、同步 `sam-manifest.json` files（現 rev `22ff778` 共 15 檔）。

## 7. 測試（`npx vitest run`；vitest.config.js include game.test.js）

現有覆蓋（10 例）：newGame 完整 shape 相等；chargeAt 邊界（−1→0、750→0.5、2000→1）；swingTiming 在 0.82 滿檔、0 端最低 0.25、1 端介於其間；hit 高度=√0.64×0.5 且分數=⌊h×749⌋、phase/cooldownMs/attempts；滿力滿節奏 → bell=true、分數 749+250、評級響鈴；cooldown 不可重複計分（同一 state 引用）、ready 保留紀錄；labelForHeight 四檔門檻表列測試。

改動公式/門檻必先改測試；app.js DOM 動畫不在測試範圍。

## 8. 硬約束（不可違反）

1. 僅 HTML＋CSS＋JS（ESM）；**無 build**、不入庫 `node_modules`、不安套件；工具一律 `npx <pkg>` 臨時執行。
2. 禁瀏覽器原生 `alert`／`confirm`／`prompt`；訊息一律 status 列。
3. Mobile-first；主操作（按住-放開）不可 hover-only，空白鍵必須等價可用。
4. 分數/進度以 `/api/kv/{key}` 為權威；禁止裸 localStorage 當權威；KV 失敗須靜默降級仍可玩。
5. 不自行載入 `sdk.js`；宿主注入 `window.PG`。
6. 改動可執行邏輯前先寫失敗測試（TDD）。
7. 檔案清單變動須同步 `sam-manifest.json`。
8. `game.js` 保持不碰 DOM 的純規則層（現行架構），UI 只能消費其傳回值。

## 9. 優化建議（可玩性與樂趣）

依優先級；實作前先在此登記並補測試。原則：加深蓄力-節奏雙軸決策，不改變「一錘定音」的核心爽感。

**高優先**

1. **三振賽制**：一次投入三次連續挑戰取最高（或累計），中間縮短冷卻——把單發小品變成有起伏的小賽事，也讓「上一槌差一點」有立即雪恥的出口。
2. **臨界回饋**：height 落在 0.85–0.92 時顯示「差一點！」並在木塔上標出響鈴線位置——玩家現在看不到 0.92 對應的視覺高度，學習曲線全靠瞎猜。

**中優先**

3. **過充風險**：蓄力超過 1.0 後力量緩降（或 10% 機率滑锤），讓「等滿格」變成時機判斷而非必然等待。
4. **近況與生涯**：顯示最近 5 槌分數色階；KV 存 JSON（best、總槌數、響鈴次數），結算區展示。
5. **游標變化**：連續響鈴後下一槌游標加速 20%（streak 挑戰），失手復原——給高手極限測試。

**低優先**

6. 觸覺回饋：落槌 `navigator.vibrate(40)`、響鈴再加長震動。
7. 觀眾歡呼合成音於響鈴時疊入（短促白噪+音團），增強夜市氛圍。
