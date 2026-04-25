"""验证种子数据中是否还有虚假链接"""
import re

filepath = r'e:\claude\job-hub\server\src\common\database.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 找所有种子数据行中的 source_url（最后一个 URL）
# 匹配 ['jXX', ..., 'url'] 格式
pattern = r"\['j\d+',.*?'(https?://[^']+)'\s*\]"
urls = re.findall(pattern, content)

fake_patterns = ['zhipin.com/job_detail', 'zhaopin.com/jobs/', 'liepin.com/job/', 
                 '51job.com/job/', 'mechanical.com.cn/job/']
fake = [u for u in set(urls) if any(p in u for p in fake_patterns)]

print(f'Total seed URLs found: {len(urls)}')
print(f'Fake URLs remaining: {len(fake)}')
if fake:
    for u in fake:
        print(f'  FAKE: {u}')
print(f'\nSample URLs (first 10 unique):')
for u in sorted(set(urls))[:10]:
    print(f'  {u}')
