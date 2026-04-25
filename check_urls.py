import urllib.request
import urllib.error
import ssl
import json

# All company URLs from the database
urls = {
    '三一重工股份有限公司': 'https://sany.zhiye.com/campus?c=1',
    '大连机床集团': 'https://www.dmtg.com',
    '中联重科': 'https://wecruit.hotjob.cn/SU60a6449a2f9d2430fdc11a19/pb/custom.html?parentKey=campus',
    '富士康科技集团': 'https://hr.foxconn.com.cn/',
    '徐工集团': 'https://www.xcmg.com/aboutus/job_center.htm',
    '格力电器': 'https://zhaopin.greeyun.com/',
    '大族激光': 'https://app.mokahr.com/social-hiring/hanslaser',
    '中国中车': 'https://www.crrcgc.cc/g741.aspx',
    '海尔集团': 'https://maker.haier.net/',
    '潍柴动力': 'https://weichai.zhiye.com/campus/jobs',
    '比亚迪股份有限公司': 'https://job.byd.com/portal/mobile/school-home',
    '中国船舶集团': 'https://www.cssc.net.cn/column/col4487/index.html',
    '西门子中国': 'https://new.siemens.com/cn/zh/company/jobs.html',
    '美的集团': 'https://careers.midea.com/schoolOut/home',
    '立讯精密': 'https://www.luxshare-ict.com/joinus',
    '华为终端': 'https://career.huawei.com/reccampportal',
    '发那科机器人': 'https://www.fanuc.com.cn/joinus',
    '博世力士乐': 'https://www.boschrexroth.com/zh/cn/career',
    '蔚来汽车': 'https://campus.nio.com/',
    '中国一拖集团': 'https://www.yituo.com.cn',
    '小米汽车': 'https://hr.xiaomi.com/campus',
    '吉利汽车': 'https://job.geely.com/',
    '中国建筑集团': 'https://job.cscec.com',
    '大疆创新': 'https://we.dji.com/zh-CN/campus',
    '中国商飞': 'https://www.comac.cc/zpxx/zpxx.shtml',
    '大华股份': 'https://www.dahuatech.com/joinus/campus',
    '中国兵装集团': 'https://www.csgc.com.cn',
    '山推股份': 'https://www.shantui.com/join',
    '宁德时代': 'https://talent.catl.com/',
    '汇川技术': 'https://www.inovance.com/joinus',
    '先临三维': 'https://www.shining3d.com/joinus',
    '长城汽车': 'https://zhaopin.gwm.cn/',
    '费斯托中国': 'https://www.festo.com/cn/zh/career',
    '北方华创': 'https://www.naura.com/joinus/campus',
    '宝钢股份': 'https://www.baosteel.com/zhaopin',
    '理想汽车': 'https://www.lixiang.com/employ/campus.html',
    '采埃孚中国': 'https://www.zf.com/careers',
    '三花控股': 'https://www.sanhua.com/career',
    '海康威视': 'https://www.hikvision.com/cn/joinus',
    '正泰电器': 'https://www.chint.com/joinus',
    'ABB中国': 'https://new.abb.com/careers',
    'PTC中国': 'https://www.ptc.com/careers',
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

results = {'ok': [], 'fail': [], 'redirect': [], 'error': []}

for company, url in urls.items():
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
        })
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        code = resp.getcode()
        final_url = resp.url
        if final_url != url:
            results['redirect'].append((company, url, final_url, code))
        else:
            results['ok'].append((company, url, code))
    except urllib.error.HTTPError as e:
        results['fail'].append((company, url, e.code))
    except Exception as e:
        results['error'].append((company, url, str(e)[:80]))

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=== OK ===")
for c, u, code in results['ok']:
    print(f"  OK {c}: {u} ({code})")

print("\n=== REDIRECT ===")
for c, u, f, code in results['redirect']:
    print(f"  REDIR {c}: {u} -> {f} ({code})")

print("\n=== FAIL (HTTP Error) ===")
for c, u, code in results['fail']:
    print(f"  FAIL {c}: {u} (HTTP {code})")

print("\n=== ERROR (Connection) ===")
for c, u, err in results['error']:
    print(f"  ERR {c}: {u} ({err})")

print(f"\n总计: OK={len(results['ok'])}, Redirect={len(results['redirect'])}, Fail={len(results['fail'])}, Error={len(results['error'])}")
