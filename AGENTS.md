# Работа в AutoMT

Прочитай README.md и Docs/OPERATIONS.md, проверь git status. Пользовательские изменения сохранять.
Deployment: отдельный ручной GitHub workflow Deploy; push запускает Check и не деплоит приложение.
Проверки и сборка заданы в .github/workflows/check.yml; деплой повторяет их для выбранного точного SHA.
Адрес сервера и SSH fingerprint в коде не фиксировать. Источник: personal-infra/servers.json.
GitHub Variables распространяются командой python scripts/sync_deploy_config.py --apply из personal-infra.
Единственный deployment secret проекта — DEPLOY_SSH_KEY, ограниченный своим forced-command receiver.
Не передавать root-ключ в GitHub; не отключать StrictHostKeyChecking.
Не добавлять env, базы, uploads, backups, локальные данные и ключи в Git или release.tar.gz.
Не редактировать server environment при обычном релизе. Откат кода не восстанавливает БД автоматически.
Общие scripts/deploy_client.py и scripts/package_release.py синхронизировать с personal-infra/deploy/.
Локальные порты перенесены: см. OPERATIONS.md и personal-infra/projects.json. Не возвращать старые defaults и не отключать Vite strictPort.
