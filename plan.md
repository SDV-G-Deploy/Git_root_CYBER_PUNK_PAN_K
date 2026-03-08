# Chain Lab - MVP Plan (Signal District)

## 1) MVP Goal
- Играбельный Chain Lab: игрок проходит 1 арену с механикой "1 выстрел на ход", запускает читаемую цепную реакцию, получает счет и награду.
- Сессия длится 1-3 минуты, есть быстрый retry.
- По завершению формируется reward payload для мета-слоя.

## 2) Product context
- Chain Lab = боевой модуль "системного хаоса" в общей петле Signal District.
- Связь с Raid Grid: Chain Lab дает редкие усилители, которые повышают эффективность рейдов.
- Связь с Ops Console: результаты Chain Lab конвертируются в долгосрочные апгрейды/правила автоматизации.
- Основной ресурс режима: `tech_modules`.
- Дополнительные выходы: `chain_data` (метрики цепей), `bonus_tokens` (редко, для специальных апгрейдов).

## 3) Scope In / Scope Out

### Scope In
- 1 арена, фиксированный layout.
- 3 типа узлов (`bomb`, `pusher`, `multiplier`).
- Прицеливание мышью + trajectory preview (пунктир).
- 1 выстрел на ход, симуляция полета и коллизий.
- Очередь chain resolve с защитой от циклов.
- Счет, финал сессии, retry, reward packet.

### Scope Out
- Несколько арен/биомов и генерация уровней.
- Сложная физика (материалы, вращения, реалистичные рикошеты).
- Богатые VFX/SFX-пайплайны.
- Онлайн-таблицы, аккаунты, облачная синхронизация.

## 4) Архитектура файлов (web, HTML/CSS/JS)
- `index.html` - canvas, HUD, контейнер финала, кнопка retry.
- `styles.css` - базовая визуальная читаемость арены, HUD, состояний win/lose.
- `src/chain/main.js` - bootstrap режима, loop orchestration.
- `src/chain/coreLoop.js` - фазы хода: input/aim/fire/simulate/resolve/end.
- `src/chain/physicsLite.js` - движение снаряда, коллизии, clamp по границам.
- `src/chain/chainResolver.js` - очередь триггеров, depth, защита от бесконечного цикла.
- `src/chain/scoring.js` - очки, combo, multiplier, итог run.
- `src/chain/ui.js` - trajectory preview, рендер арены, HUD, end-state.
- `src/chain/telemetry.js` - события режима + подготовка payload для общей шины.
- `src/chain/persistenceHooks.js` - `exportReward()`, `importMetaModifiers()`, адаптер к Ops Console.

## 5) Игровой цикл
`input -> aim preview -> fire -> simulate -> resolve chain -> score -> reward -> end`

- `input`: игрок выбирает угол/силу.
- `aim preview`: показывается прогноз траектории до выстрела.
- `fire`: создается projectile, списывается ход.
- `simulate`: полет/коллизии с узлами.
- `resolve chain`: обрабатывается очередь chain events.
- `score`: начисляются очки и множители.
- `reward`: вычисляется reward packet по итогам run.
- `end`: win/lose + retry/claim.

## 6) Game State schema
```js
{
  run: {
    runId: "uuid",
    status: "input|aim|simulate|resolve|score|reward|end",
    levelId: "chain_lab_01",
    score: 0,
    shotsRemaining: 5,
    combo: 0,
    chainDepth: 0,
    chainMultiplier: 1
  },
  arena: {
    bounds: { width: 960, height: 540 },
    projectile: null,
    nodes: [],
    triggersQueue: [],
    resolvedNodeIds: []
  },
  metaHooks: {
    importedModifiers: {
      chainMultiplierBonus: 0,
      extraShot: 0,
      rewardBonusPct: 0
    },
    rewardPayload: {
      mode: "chain_lab",
      tech_modules: 0,
      chain_data: { maxDepth: 0, totalSteps: 0 },
      bonus_tokens: 0,
      score: 0,
      completed: false
    }
  }
}
```

## 7) Сущности
- `Projectile` - позиция, скорость, радиус, lifetime.
- `Node` - объект арены с типом и состоянием (`idle/triggered/resolved`).
- `Trigger` - правило активации соседей (по радиусу/событию).
- `ChainEvent` - единица очереди резолва (source, target, depth, reason).
- `Arena` - конфиг поля, спавн, лимиты, win condition.
- `RewardPacket` - структурированный результат для мета-слоя.

## 8) Телеметрия (MVP + интеграция)
- `run_start` - старт попытки.
- `shot_fired` - факт выстрела, вектор, ход.
- `chain_step` - каждый шаг цепи (depth, source, target).
- `chain_resolved` - итог цепи (steps, maxDepth, scoreDelta).
- `run_end` - win/lose и итоговые показатели.
- `reward_generated` - reward packet сформирован.
- `reward_claimed` - reward packet подтвержден и отправлен в meta слой.

## 9) DoD
- Режим standalone-playable в браузере без внешних зависимостей.
- Полный игровой цикл от прицеливания до end-state работает стабильно.
- Reward payload сериализуется в JSON и доступен через `exportReward()`.
- Есть clean hooks для приема meta-модификаторов и отдачи награды.
- Базовая телеметрия пишет события в локальный буфер/консоль.

## 10) Риски / антипаттерны
- Смешивание рендера, физики и резолва в одном файле (god object).
- Скрытые правила цепи без визуально читаемой причинности.
- Бесконечные/взрывоопасные цепи без queue limits и visited-set.
- Reward логика, жестко пришитая к UI, без изолированного export hook.
- Перегрузка MVP контентом до стабилизации core loop.

## 11) План: 2 часа / 1 день / 1 неделя
- За 2 часа: каркас файлов, loop phases, базовый рендер арены, один рабочий выстрел.
- За 1 день: 3 типа узлов, chain resolver с depth, scoring, retry, телеметрия MVP.
- За 1 неделю: баланс наград, полировка читаемости цепи, persistence hooks, интеграционный smoke-test с meta payload.

## 12) Integration-ready checklist
- Есть стабильный `init/update/render/reset` API режима.
- Есть `exportReward()` с версионированным форматом payload.
- Есть `importMetaModifiers()` для входящих бафов от Ops Console.
- Имена ресурсов и ключи payload совпадают с общим словарем экономики.
- События телеметрии маппятся на общую event-шину Signal District.
- End-state режима возвращает `completed|failed` + причину для мета-логики.
- Retry не ломает глобальный профиль и не дублирует выдачу награды.
