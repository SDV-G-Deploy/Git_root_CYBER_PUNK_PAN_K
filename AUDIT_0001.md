# AUDIT_0001

## Metadata
- Date (UTC): 2026-03-14 11:55
- Auditor agent: codex_alt (OpenClaw subagent)
- Target URL: https://github.com/SDV-G-Deploy/Git_root_CYBER_PUNK_PAN_K
- Branch audited: `main`
- Commit audited: `fdc40b8fe34eca884480db0315de7dab26940800`

## Executive summary
Проект в рабочем состоянии: модульная runtime-архитектура в `src/`, воспроизводимый локальный QA-контур (валидация уровней, pack-builder, smoke) и понятная документация по текущему active path. Основные риски смещены не в «игра не работает», а в устойчивость разработки: отсутствует CI/CD-контур в GitHub, есть параллельный legacy-код в корне (риск рассинхронизации), и часть DX-процесса ориентирована на PowerShell-обёртки.

Итог: технический долг умеренный, критичных security-уязвимостей уровня RCE/secret leak не обнаружено, но есть high-priority риск регрессий из-за отсутствия автоматизированных проверок в PR/merge-потоке.

## Findings

### High
1. **Отсутствует CI-пайплайн (`.github/workflows` не найден).**
   - Риск: регрессии в механиках/балансе/runtime будут попадать в `main` без автоматической проверки.
   - Влияние: высокое для стабильности релизов и скорости команды.

2. **Нет автоматического quality gate для PR (lint/test/smoke как обязательные проверки).**
   - Фактически проверки есть (`tools/qa/*.mjs`), но не встроены в процесс merge.
   - Риск: «человеческий фактор» при ручном прогоне.

### Medium
3. **Дублирование кодовой базы: legacy-файлы в корне (`game.js`, `main.js`, `levels.js`) + активный runtime в `src/`.**
   - Риск: изменение не в той ветке/файле, дрейф логики, ложное чувство «исправлено».

4. **DX и запуск проверок частично привязаны к PowerShell-обёрткам.**
   - Node-скрипты кроссплатформенны, но документация/входные команды в README и AGENTS ориентированы на `powershell ... scripts\*.ps1`.
   - Риск: трение для Linux/macOS contributors.

5. **Глобальная экспозиция API в браузере (`window.ChainLabGame` в `src/adapters/legacyChainLabApi.js`).**
   - Для single-player это допустимо, но увеличивает поверхность для runtime-тамперинга через консоль/внешние скрипты.

6. **Отсутствует явная политика versioning/compatibility для save-данных beyond simple sanitize.**
   - В `src/persistence.js` есть sanitization/migration флагов, но нет формального migration map по версиям save-формата.

### Low
7. **Косметический дефект в README (артефакты `\`r\`n` в секции Sprite Assets).**
   - Ухудшает читаемость и сигнал качества документации.

8. **Большой объём логики в `src/bootstrap.js` (оркестрация UI/telemetry/input/save в одном файле).**
   - Сейчас управляемо, но это точка роста сложности при масштабировании.

9. **Нет явной политики CSP/SRI в `index.html` (для веб-развёртывания).**
   - Для локального/офлайн сценария не критично, но для публичного хостинга желательно.

## Recommendations (приоритеты)
1. **P0:** Добавить GitHub Actions workflow с минимумом:
   - `node tools/qa/validate-levels.mjs`
   - `node tools/qa/build-pack.mjs`
   - `node tools/qa/runtime-smoke.mjs`
   - запуск на `pull_request` и `push` в default branch.

2. **P0:** Ввести branch protection для `main` (merge только при зелёном CI).

3. **P1:** Явно зафиксировать статус legacy-файлов:
   - либо архивировать в `/legacy`,
   - либо добавить pre-commit/CI check, который предупреждает о правках вне `src/` для gameplay-задач.

4. **P1:** Добавить platform-neutral команды в README (Node-first), PowerShell оставить как опцию.

5. **P1:** Ограничить/документировать `window.ChainLabGame` (например, только в dev-режиме).

6. **P2:** Исправить markdown-артефакты README и слегка декомпозировать `bootstrap.js` (telemetry/export handlers отдельно).

## Quick wins (1–2 часа)
- Добавить базовый `.github/workflows/qa.yml` с тремя существующими Node-проверками.
- Исправить секцию `Sprite Assets` в README (убрать `\`r\`n` артефакты).
- Добавить в README блок `npm/node`-нейтральных команд для Linux/macOS.
- Добавить короткий `SECURITY.md` (scope игры, отсутствие сетевого бэкенда, что считается out-of-scope).
- Добавить заметный баннер в legacy-файлы: `// LEGACY: not active runtime`.

---
### Проверки, выполненные в рамках аудита
Локально выполнены:
- `node tools/qa/validate-levels.mjs` → все 46 уровней solvable
- `node tools/qa/build-pack.mjs` → отчёт сформирован
- `node tools/qa/runtime-smoke.mjs` → passed

(Промежуточные артефакты QA, изменённые запуском скриптов, в коммит не включались.)
