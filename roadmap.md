# Chain Lab - Roadmap (Signal District)

## A) 2 часа — Proto slice
**Этап**: Proto slice (2 часа)

**Цель**: получить минимально рабочий и быстрый цикл Chain Lab для проверки core fun.

**Задачи**:
- Поднять базовый loop: `aim -> fire -> simulate -> resolve -> end`.
- Реализовать 3 типа узлов: `bomb`, `pusher`, `multiplier`.
- Собрать один тестовый уровень с фиксированным layout.
- Добавить `score`, `shotsRemaining`, `retry`.

**Артефакт**: standalone страница с одним уровнем и рабочей попыткой от старта до retry.

**Критерий завершения**: игрок может пройти полный run без runtime-ошибок и перезапустить попытку в 1 клик.

## B) 1 день — Playable slice
**Этап**: Playable slice (1 день)

**Цель**: довести прототип до стабильного играбельного состояния и подготовить к мета-интеграции.

**Задачи**:
- Улучшить читаемость: trajectory preview, порядок chain step, ясный end-state.
- Укрепить chain resolver: очередь, `visited`, `maxChainSteps` safeguard.
- Добавить `getRunSummary()` с ключевыми итогами run.
- Реализовать `reward packet generation`.

**Артефакт**: стабильно играбельный модуль Chain Lab с экспортируемым run summary и reward payload.

**Критерий завершения**: 10 последовательных run проходят без критических багов; summary и reward формируются каждый раз.

## C) 7 дней — MVP readiness
**Этап**: MVP readiness (7 дней)

**Цель**: подготовить модуль к первому внешнему тестированию и интеграции в Signal District.

**Задачи**:
- Сбалансировать первые уровни (сложность, очки, награды, темп retry).
- Включить телеметрию ключевых событий run.
- Провести QA smoke и закрыть критичные дефекты.
- Провалидировать integration hooks (`onRunEnd`, reward export/import contract).

**Артефакт**: версия Chain Lab, готовая к подключению в общий shell Signal District.

**Критерий завершения**: P0-багов нет, метрики пишутся корректно, integration hooks проходят сценарные проверки.

## D) Integration phase (после MVP)
**Этап**: Integration phase (после MVP)

**Цель**: встроить Chain Lab в общую прогрессию Signal District без ломки локального gameplay-loop.

**Задачи**:
- Подключить награды Chain Lab к контурам потребления в Ops Console.
- Добавить unlock conditions режима через Raid Grid.
- Зафиксировать единый `meta-economy contract` (минимальный набор полей и версионирование).

**Артефакт**: сквозной цикл `Raid Grid -> Chain Lab -> Ops Console` с единым экономическим словарем.

**Критерий завершения**: награды корректно переносятся между режимами, unlock-логика воспроизводима, контракты стабильны.

## Tech tasks
- Разделить модули: `coreLoop`, `physicsLite`, `chainResolver`, `scoring`, `ui`, `telemetry`.
- Вынести все параметры в `CONFIG`, исключить магические числа.
- Стабилизировать fixed timestep и защиту от dt-spike.
- Добавить deterministic seed reset для воспроизводимых прогонов.
- Подготовить чистые integration API: `initGame`, `resetLevel`, `fireShot`, `update`, `render`, `getRunSummary`.

## Design tasks
- Настроить первый уровень под "быстрый вау-эффект" в первые 20-30 секунд.
- Уточнить роль каждого узла и визуально различить их состояния.
- Сбалансировать риск/награду между безопасным и жадным стилем игры.
- Согласовать диапазоны score/reward с потребностями Ops Console.
- Зафиксировать UX-правила честности (причинность, читаемость, быстрый retry).

## Telemetry tasks
- Логировать: `run_start`, `shot_fired`, `chain_step`, `chain_resolved`, `run_end`.
- Логировать интеграционные события: `reward_generated`, `reward_claimed`.
- Ввести `runId` и `schemaVersion` в каждый event.
- Подготовить локальный буфер + экспорт в общий event bus (через adapter).
- Проверить консистентность payload-ключей с meta-economy contract.

## QA checklist
- Проверка цикла: start -> fire -> resolve -> end -> retry.
- Проверка стабильности: 30 последовательных run без зависаний.
- Проверка safeguard: цепь не уходит в бесконечный цикл.
- Проверка reward: packet всегда формируется в end-state.
- Проверка интеграции: `onRunEnd` вызывается 1 раз на завершение run.
- Проверка UX: trajectory preview и порядок цепи визуально читаемы.
- Проверка баланса: winrate и длительность run в целевых диапазонах.

## Risks + fallback
- Риск: чрезмерная сложность chain logic ломает темп разработки.
- Fallback: фиксируем простой rule-set и отрезаем edge-механики до post-MVP.
- Риск: нечитаемая причинность реакций снижает ощущение честности.
- Fallback: добавить явные step-маркеры и замедленный debug-режим цепи.
- Риск: reward contract нестабилен при интеграции.
- Fallback: минимальный версионированный payload + адаптер-слой совместимости.
- Риск: scope creep в контент/полировке до проверки fun.
- Fallback: feature freeze до подтверждения метрик MVP.

## Backlog next (10 задач)
1. `[P0]` Вынести reward contract в отдельный модуль с `schemaVersion`.
2. `[P0]` Добавить unit-тесты на chain resolver (queue/visited/step cap).
3. `[P0]` Реализовать deterministic replay через `seed + input log`.
4. `[P1]` Добавить heatmap попаданий и depth-распределение в debug overlay.
5. `[P1]` Сверстать компактный end-screen с breakdown score/reward.
6. `[P1]` Добавить 2 дополнительных layout для быстрого баланс-теста.
7. `[P1]` Ввести модификаторы run из Ops Console (`extraShot`, `rewardBonus`).
8. `[P2]` Поддержать soft tutorial-подсказки в первые 2 run.
9. `[P2]` Добавить визуальный таймлайн chain events для аналитики UX.
10. `[P2]` Подготовить JSON-пресеты сложности для A/B тестов.
