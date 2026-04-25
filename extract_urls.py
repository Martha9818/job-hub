import json

with open(r'e:\claude\job-hub\tmp_jobs.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

jobs = data.get('data', [])
seen = {}
for j in jobs:
    company = j['company']
    url = j.get('source_url', '')
    if company not in seen:
        seen[company] = url
        print(f"{j['id']}|{company}|{url}")
