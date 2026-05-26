#!/bin/bash
# =============================================================
#  Скрипт первого пуша SecureChat на GitHub
#  Запускать из папки проекта: bash push_to_github.sh
# =============================================================

echo "🔐 SecureChat — Push to GitHub"
echo "================================"

# 1. Инициализация репозитория
git init
git add .
git commit -m "🎉 Initial commit: SecureChat MVP v0.1.0

- E2E encrypted messenger UI (HTML/CSS/JS)
- Authorization page with validation
- Chat interface with TTL self-destruct messages
- Settings page: keys, security, threat model
- PostgreSQL database schema (7 tables)
- Full SQL script with test data and queries"

echo ""
echo "✅ Локальный репозиторий создан!"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Создайте репозиторий на GitHub:"
echo "   https://github.com/new"
echo "   Название: securechat"
echo "   Описание: 🔐 E2E Encrypted Messenger — Дипломный проект"
echo "   Видимость: Public"
echo "   ❗ НЕ добавляйте README, .gitignore, LICENSE — они уже есть"
echo ""
echo "2. Привяжите удалённый репозиторий (замените YOUR_USERNAME):"
echo "   git remote add origin https://github.com/YOUR_USERNAME/securechat.git"
echo ""
echo "3. Запушьте код:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🎉 Готово! Репозиторий будет выглядеть профессионально."
