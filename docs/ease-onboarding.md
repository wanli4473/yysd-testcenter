# 壹则教育（ease）开通与试点验收

## 站点入口

| 用途 | 地址 |
|------|------|
| 首页 | https://ease.youyisida.com |
| 学生登录 | https://ease.youyisida.com/login.html |
| 学生注册 | https://ease.youyisida.com/register.html |
| 教师登录 | https://ease.youyisida.com/teacher-login.html |
| 教师/管理员注册 | https://ease.youyisida.com/teacher-register.html |
| 教师工作台 | https://ease.youyisida.com/teacher.html |
| 学生分配（管理员） | https://ease.youyisida.com/admin-assign.html |

总部主控台（仅 youyisida.com）：https://youyisida.com/platform.html

## 当前机构配置（已验证 2026-07-22）

- 名称：**壹则教育**
- slug：`ease`
- 状态：正常（到期 2026-10-21）
- 管理员手机（暂用验收）：15901754473
- Logo：已上传

## 注册密钥（请妥善转发，勿公开张贴）

| 角色 | 密钥 | 剩余次数 |
|------|------|----------|
| 公司管理员 | `EaseAdm7760` | 1 / 1 |
| 教师 | `EaseTch5508` | 4 / 5（已用 1） |
| 学生 | `EaseStu2273` | 10 / 10 |

分网站注册须填写对应密钥；总部 `youyisida.com` 仍用短信验证码注册。

## 推荐验收顺序（管理员 = 15901754473）

1. **管理员注册**  
   打开 https://ease.youyisida.com/teacher-register.html  
   填写手机号、密码，**教师注册密钥处填管理员密钥 `EaseAdm7760`**（不要用教师密钥）。  
   注册成功后应能进教师端，并看到「学生分配」。

2. **学生分配**  
   教师端 → 学生分配：导入或等待学生注册后，将学生分配给教师。

3. **测试学生注册**  
   用**未在总部注册过的新手机号**，打开 https://ease.youyisida.com/register.html  
   填写 **学生密钥 `EaseStu2273`**，完成注册。

4. **模考与成绩**  
   学生登录 → 真题区 → 完成一套剑桥模考 → 教师在 ease 教师端查看成绩。

5. **隔离验证**  
   在 https://youyisida.com 用超管登录，确认**看不到** ease 站测试学生的数据。

6. **到期关停（可选）**  
   主控台将 ease 到期日改为昨天 → ease 站应跳转 `suspended.html` → 恢复开通后恢复正常。

## 给壹则负责人的转发话术（可复制）

> 壹则教育在线学习平台已开通。  
> 网址：https://ease.youyisida.com  
> 管理员请打开「教师注册」，使用我们提供的**管理员注册密钥**完成首次注册（密钥单独发您，勿外传）。  
> 学生注册需**学生注册密钥**；每位学生一个手机号，不能与优益思达总部站重复。  
> 注册后登录即可使用剑桥模考与练习功能。Logo 与页面已显示「壹则教育」。

## 常见问题

| 问题 | 处理 |
|------|------|
| 手机号已注册 | 全站手机号唯一；请用新号，或联系优益思达处理 |
| 密钥次数用尽 | 总部主控台 → 该机构 →「注册密钥」加次或换新密钥 |
| 页面仍显示优益思达 | 强制刷新 `Cmd+Shift+R` 或使用无痕窗口 |
| 忘记密码（分网站） | 联系本校管理员或优益思达超管，分网站不支持短信重置 |

## 运维备注

- DNS 通配符 `*.youyisida.com` 已生效；Nginx 已改为通配符 `server_name`。
- HTTPS 证书当前覆盖 `youyisida.com`、`www`、`api`、`ease`、`youyisi`；**新开其它 slug 子域时**需执行一次 `certbot --nginx --expand` 添加 SAN，或后续配置 DNS-01 通配符证书（见 `docs/multi-tenant.md`）。
