"""批量更新 database.js 种子数据中的 source_url 为公司官网首页"""
import re

filepath = r'e:\claude\job-hub\server\src\common\database.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 公司名 -> 官网首页 映射
homepage_map = {
    '三一重工股份有限公司': 'https://www.sanygroup.com',
    '大连机床集团': 'https://www.dmtg.com',
    '中联重科': 'https://www.zoomlion.com',
    '富士康科技集团': 'https://www.foxconn.com',
    '徐工集团': 'https://www.xcmg.com',
    '格力电器': 'https://www.gree.com',
    '大族激光': 'https://www.hanslaser.com',
    '中国中车': 'https://www.crrcgc.cc',
    '海尔集团': 'https://www.haier.com',
    '潍柴动力': 'https://www.weichaipower.com',
    '比亚迪股份有限公司': 'https://www.byd.com',
    '中国船舶集团': 'https://www.cssc.net.cn',
    '西门子中国': 'https://new.siemens.com/cn',
    '美的集团': 'https://www.midea.com',
    '立讯精密': 'https://www.luxshare.com',
    '华为终端': 'https://www.huawei.com',
    '发那科机器人': 'https://www.fanuc.com.cn',
    '博世力士乐': 'https://www.boschrexroth.com',
    '蔚来汽车': 'https://www.nio.com',
    '中国一拖集团': 'https://www.yituo.com.cn',
    '小米汽车': 'https://www.xiaomi.com',
    '吉利汽车': 'https://www.geely.com',
    '中国建筑集团': 'https://www.cscec.com',
    '大疆创新': 'https://www.dji.com',
    '中国商飞': 'https://www.comac.cc',
    '大华股份': 'https://www.dahuatech.com',
    '中国兵装集团': 'https://www.csgc.com.cn',
    '山推股份': 'https://www.shantui.com',
    '宁德时代': 'https://www.catl.com',
    '汇川技术': 'https://www.inovance.com',
    '先临三维': 'https://www.shining3d.com',
    '长城汽车': 'https://www.gwm.com.cn',
    '费斯托中国': 'https://www.festo.com',
    '北方华创': 'https://www.naura.com',
    '宝钢股份': 'https://www.baosteel.com',
    '理想汽车': 'https://www.lixiang.com',
    '采埃孚中国': 'https://www.zf.com',
    '三花控股': 'https://www.sanhua.com',
    '海康威视': 'https://www.hikvision.com',
    '正泰电器': 'https://www.chint.com',
    'ABB中国': 'https://new.abb.com/cn',
    'PTC中国': 'https://www.ptc.com',
}

# 匹配种子数据行：['jXX', ..., '公司名', ..., 'https://旧链接'],
# 格式: [..., '公司名', salary_min, salary_max, 'salary_text', 'location', 'category', 'industry', 'experience', 'education', 'description', 'requirements', 'benefits', 'job_type', 'date', 'source_url'],

count = 0
for company, homepage in homepage_map.items():
    # 匹配包含公司名的种子数据行，替换最后的 source_url
    # 找到该公司的所有行，替换最后一个 URL 字段
    pattern = rf"(\['[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'{re.escape(company)}',\s*[^]]*),\s*'https?://[^']*'\s*\]"
    
    def replacer(match):
        return match.group(1) + f", '{homepage}']"
    
    new_content = re.sub(pattern, replacer, content)
    if new_content != content:
        count += 1
        content = new_content

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated {count} companies' seed data source_url to homepage URLs")
