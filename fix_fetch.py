
import sys
with open('d:/_DEV/_PDR/PDR-bot/app_final.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('fetch(${API_BASE}/init-user\', {', 'fetch(${API_BASE}/init-user, {')
text = text.replace('fetch(${API_BASE}/api/topics\')', 'fetch(${API_BASE}/api/topics)')
text = text.replace('fetch(${API_BASE}/api/topics\');', 'fetch(${API_BASE}/api/topics);')
text = text.replace('fetch(${API_BASE}/api/record-answer\', {', 'fetch(${API_BASE}/api/record-answer, {')
text = text.replace('fetch(${API_BASE}/api/create-invoice\', {', 'fetch(${API_BASE}/api/create-invoice, {')

with open('d:/_DEV/_PDR/PDR-bot/app_final.js', 'w', encoding='utf-8') as f:
    f.write(text)

