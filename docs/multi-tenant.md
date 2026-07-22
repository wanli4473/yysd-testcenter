# 多租户约定（阶段 0）

## 子域名规则

- 格式：`{slug}.youyisida.com`（小写英文字母、数字、连字符；2–32 字符）
- 默认租户 slug：`yysd`（优益思达）
- 根域 `youyisida.com` / `www.youyisida.com` / 本地 `localhost` 一律映射到 `yysd`
- **保留字（不可作租户 slug）**：`www` `api` `admin` `platform` `mail` `static` `cdn` `test` `dev` `staging`

## DNS / HTTPS（运维）

1. 阿里云 DNS：`*.youyisida.com` CNAME 或 A 到网站服务器（与主站相同）。
2. 通配符证书（需 DNS 验证）：
   ```bash
   certbot certonly --dns-<provider> -d youyisida.com -d '*.youyisida.com'
   ```
3. Nginx：使用仓库内 `server/deploy/nginx-site.conf`（已含 `*.youyisida.com`）。
4. 备案：子域名通配一般随主域；若备案系统要求逐条接入，按阿里云控制台提示处理。

## 默认租户与超管

| 项 | 约定 |
|----|------|
| 默认公司 | 名称「优益思达」，slug `yysd`；现有用户/老师/成绩全部迁入 |
| 平台超管 | 环境变量 `ADMIN_PHONES`（与现网一致）；可进 `platform.html` 主控台 |
| 公司管理员 | 主控台为该公司填写的 `admin_phone`（教师账号）；管本公司师生分配 |

## 字段与权限清单

### 表 `orgs`

| 字段 | 含义 |
|------|------|
| id | 主键 |
| slug | 子域名短码 |
| name | 公司显示名 |
| logo_url | Logo（可空，用默认） |
| status | `trial` / `active` / `suspended` |
| expires_at | 到期日 ISO（可空=不限期） |
| admin_phone | 公司管理员手机号 |
| contract_note | 合同备注（可选） |
| created_at | 创建时间 |

### 用户隔离

- `users.org_id` / `teachers.org_id`：每人只属一家公司；手机号全局唯一。
- 成绩、日历、师生关系：经用户/老师间接归属公司；列表接口按 `org_id` 过滤。
- 题库 `library/`：全平台共用（第一版）。

### 谁能看谁

| 角色 | 范围 |
|------|------|
| 平台超管 | 主控台管所有公司；客服进入某公司时临时可见该公司 |
| 公司管理员 | 仅本公司老师/学生/分配 |
| 老师 | 仅被分配的本公司学生（管理员可见本公司全部） |
| 学生 | 仅自己的成绩与任务 |

## 验收（阶段 0）

- [x] DNS `*.youyisida.com` 已解析（2026-07-22 验证 random slug → 139.224.0.221）
- [ ] HTTPS 通配符证书生效（当前为 SAN 列表；ease/youyisi 已覆盖）
- [x] 打开 `https://ease.youyisida.com/` 能出页面（品牌改造已完成）
