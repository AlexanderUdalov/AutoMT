# Деплой и эксплуатация AutoMT

Общая инструкция: https://github.com/AlexanderUdalov/personal-infra/blob/main/docs/DEPLOYMENT.md
Смена IP: https://github.com/AlexanderUdalov/personal-infra/blob/main/docs/CHANGE_SERVER.md

## Выпуск

GitHub Actions → Deploy → Run workflow. ref — точный проверенный SHA, operation=deploy.
operation=verify проверяет архив без обновления приложения; status показывает состояние.
rollback с backup=id восстанавливает код и Python environment выбранной копии.
Workflow выполняет тесты и сборку. Сервер делает online-копию SQLite и копию кода,
обновляет только разрешённые файлы, перезапускает site-automt.service и проверяет /api/health.
При ошибке возвращается прежний код. Рабочая база не подменяется.

## Конфигурация

Production привязан к primary в private personal-infra/servers.json.
GitHub Variables: DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USER, DEPLOY_HOST_KEY_ALIAS, DEPLOY_KNOWN_HOSTS.
GitHub Secret: DEPLOY_SSH_KEY. Runtime-секреты приложения остаются на сервере.
После смены IP выполнить общий sync_deploy_config.py --apply.
Service: site-automt.service. Loopback backend: 5000.
Инфраструктуру nginx/DNS/VPN не менять как побочный эффект релиза приложения.

## Диагностика и восстановление

На подтверждённом сервере: systemctl status site-automt.service --no-pager;
journalctl -u site-automt.service -n 50 --no-pager. Полные журналы не публиковать.
Копии: /var/lib/portfolio-deploy/automt/backups. Последние копии видны в operation=status.
Receiver и права устанавливаются bootstrap из personal-infra/deploy/.
Восстановление БД — отдельная административная операция после остановки сервиса.

## Локальная разработка

Dev-порты: app 4100 / isolated API tests 4107. Production-порты не менялись. Vite использует strictPort.
