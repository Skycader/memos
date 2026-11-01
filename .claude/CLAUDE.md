# Инструкции для проекта memos

## Репозитории

Проект хостится на двух репозиториях:

- GitHub: https://github.com/Skycader/memos (remote `origin`)
- GitLab: https://gitlab.com/daniil.ustimencko/memos.git (remote `gitlab`)

У remote `origin` настроены два push-URL (GitHub и GitLab), а отдельный remote `gitlab` указывает на GitLab.
Ветка по умолчанию: `main`.

## Команда `cap`

Когда пользователь пишет `cap` (commit and push):

1. Посмотреть изменения: `git status --short` и `git --no-pager diff`.
2. Добавить изменения в индекс: `git add -A`. Не добавлять секреты и мусор (`node_modules`, `dist`, `.angular`).
3. Сделать коммит с коротким сообщением о том, что было сделано (по сути изменений, а не общим "update").
4. Запушить в оба репозитория:
   - `git push origin main` (уходит на GitHub и на GitLab, если у `origin` два push-URL);
   - `git push gitlab main`, если нужно убедиться, что GitLab тоже обновлён.
5. Проверить результат: `git --no-pager log -1 --oneline` и `git status`. Сообщить пользователю, что запушено в оба репозитория.

Без `--force` и без пропуска хуков, если пользователь явно об этом не просил.

## Тесты

Запуск в headless-режиме:

`set CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe&& npx ng test --watch=false --browsers=ChromeHeadless`
