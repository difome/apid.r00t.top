# Backend Rewrite: Node.js/Fastify → Python/FastAPI

After fully reading all backend source files, here is the complete implementation plan.

---

## Background

The current backend has **8 modules**, **10 DB models**, **3 cron schedules**, and **3 currency providers**. The API must stay 100% contract-compatible so the React 19 frontend requires zero changes.

---

## Complete Endpoint Inventory

### `/api/v2/currency`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/rates` | — | Query: `refresh` (bool) |
| GET | `/rates/list` | — | Query: `refresh` |
| GET | `/rates/stream` | — | SSE, 30s interval |
| GET | `/rates/:key/history` | — | Query: `days`, `year` |
| GET | `/rates/:key/years` | — | |
| GET | `/currencies` | — | |
| GET | `/health` | — | |
| POST | `/convert` | — | Body: `amount`, `from_currency`, `to_currencies`, `exclude_source` |
| POST | `/rates/sync` | x-admin-key | |
| POST | `/rates/add` | x-admin-key | |

### `/api/v2/commodities`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/rates` | — | Query: `refresh` |
| GET | `/rates/list` | — | Query: `category`, `lang` |
| GET | `/rates/:key/history` | — | Query: `days`, `year` |
| GET | `/rates/:key/years` | — | |
| GET | `/currencies` | — | |
| GET | `/health` | — | |
| POST | `/rates/sync` | x-admin-key | |
| POST | `/rates/add` | x-admin-key | |

### `/api/v2/admin` (all protected by `x-admin-key`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/logs` | Query: `limit` |
| GET | `/traffic` | Query: `limit` |
| GET | `/config` | Query: `key` |
| POST | `/config` | Body: `{key, value}`. If `key=parser_cron` — reschedule |
| GET | `/currencies` | With `ratesCount` |
| POST | `/currencies` | Create |
| PATCH | `/currencies/:key` | Update |
| DELETE | `/currencies/:key` | |
| POST | `/currencies/:key/sync` | Background history seeding |
| GET | `/bans` | |
| POST | `/bans` | Body: `{ip, reason?}` |
| DELETE | `/bans/:ip` | |
| GET | `/commodities` | Admin view with `ratesCount` |
| POST | `/commodities` | Create |
| PATCH | `/commodities/:symbol` | Update |
| DELETE | `/commodities/:symbol` | |
| POST | `/commodities/sync` | Returns `{success, updated, errors[]}` |
| POST | `/commodities/:symbol/sync` | Returns `{success, price?}` |
| GET | `/commodities/logs` | Query: `limit`, filters by `source=commodities` |

### `/api/v2/holidays` and `/api/holidays` (same router, registered twice)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/upcoming` | Query: `lang`, `limit` |
| GET | `/list` | Query: `lang`, `refresh` (legacy) |
| GET | `/today` | Query: `lang`, `refresh` |
| GET | `/date/:month/:day` | Query: `lang`, `refresh` |
| GET | `/:month/:day` | Same handler (legacy) |

### `/api/v2/movies` and `/api/v2/movie`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Query: `lang` |

### `/api/v2/memes` and `/api/v2/meme`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Returns meme with proxied image URL |
| GET | `/image-proxy/:encodedUrl/meme.jpg` | Binary image proxy |

### `/api/v2/facts` and `/api/v2/fact`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Query: `lang` |

### `/api/v2/webhook`
| Method | Path | Notes |
|--------|------|-------|
| POST | `/github` | HMAC-SHA256 `x-hub-signature-256`, runs `deploy.sh` |

---

## Proposed File Structure

```
apid-fastapi/
├── pyproject.toml          # uv deps, ruff, mypy, pytest config
├── .env.example
├── .pre-commit-config.yaml
├── Dockerfile              # multi-stage
├── alembic.ini
├── alembic/
│   └── versions/
├── .github/
│   └── workflows/
│       └── ci.yml
└── app/
    ├── main.py             # FastAPI app, lifespan, middleware, routers
    ├── core/
    │   ├── config.py       # Settings(BaseSettings)
    │   ├── db.py           # async SQLAlchemy engine + session factory
    │   ├── redis.py        # redis.asyncio client
    │   └── scheduler.py    # APScheduler setup + dynamic reschedule
    ├── middleware/
    │   ├── ban_check.py    # IP ban middleware
    │   ├── request_log.py  # API request logger
    │   └── error_handler.py
    ├── models/             # SQLAlchemy ORM models (all 10 tables)
    │   └── ...
    ├── modules/
    │   ├── currency/
    │   │   ├── router.py
    │   │   ├── service.py
    │   │   ├── parser.py      # CurrencyParserService
    │   │   ├── schemas.py     # Pydantic request/response models
    │   │   └── providers/
    │   │       ├── base.py
    │   │       ├── coinbase.py
    │   │       ├── cbr.py
    │   │       └── minfin.py
    │   ├── commodities/
    │   │   ├── router.py
    │   │   ├── service.py
    │   │   ├── parser.py      # CommodityParserService (Playwright)
    │   │   ├── schemas.py
    │   │   └── providers/
    │   │       └── investing.py
    │   ├── admin/
    │   │   ├── router.py
    │   │   └── service.py
    │   ├── holidays/
    │   │   ├── router.py
    │   │   └── service.py
    │   ├── movies/
    │   │   ├── router.py
    │   │   └── service.py
    │   ├── memes/
    │   │   ├── router.py
    │   │   └── service.py
    │   ├── facts/
    │   │   ├── router.py
    │   │   └── service.py
    │   └── webhook/
    │       └── router.py
    └── tests/
        ├── conftest.py          # testcontainers MariaDB+Redis fixtures
        ├── test_currency.py
        ├── test_commodities.py
        ├── test_admin.py
        ├── test_holidays.py
        ├── test_movies.py
        ├── test_memes.py
        ├── test_facts.py
        └── test_webhook.py
```

---

## Key Technical Decisions

### Database
- SQLAlchemy 2.0 with `AsyncSession` + `asyncpg`-style `aiomysql` driver for MariaDB
- Alembic for migrations — first migration replicates all 10 Prisma models exactly
- `DECIMAL(20,8)` for prices, `JSON` for `params/events/signs/prohibitions`

### DI Pattern
```python
# core/db.py
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

# modules/currency/router.py
@router.get("/rates")
async def get_rates(db: AsyncSession = Depends(get_db)):
    svc = CurrencyService(db)
    return await svc.get_legacy_rates()
```

No global singletons — services instantiated per-request via `Depends`.

### APScheduler (dynamic reschedule)
```python
# core/scheduler.py
scheduler = AsyncIOScheduler()

def reschedule_currency_parser(cron_expr: str) -> None:
    scheduler.remove_job("currency_sync", jobstore=None, ignore_not_found=True)
    trigger = CronTrigger.from_crontab(cron_expr)
    scheduler.add_job(run_currency_parser, trigger, id="currency_sync")
```

On startup (lifespan): load `parser_cron` from DB and call `reschedule_currency_parser`.  
When admin POST `/config` with `key=parser_cron`: call same function.

### Middleware
```python
# middleware/ban_check.py
class BanCheckMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        ip = request.headers.get("cf-connecting-ip") or request.client.host
        if await redis.sismember("banned_ips", ip):
            return JSONResponse({"error": "Your IP is banned", "ip": ip}, 403)
        return await call_next(request)
```

On startup (lifespan): load all `BannedIp` rows → `redis.sadd("banned_ips", ...)`.

### Auth
```python
# core/auth.py
def require_admin(x_admin_key: str = Header(None)) -> None:
    if x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(401, detail={"success": False, "message": "Unauthorized: Admin access required"})
```

### SSE (currency rates stream)
```python
@router.get("/rates/stream")
async def stream_rates(db: AsyncSession = Depends(get_db)):
    async def event_generator():
        while True:
            currencies = await CurrencyService(db).get_all_currencies()
            yield f"data: {json.dumps({'success': True, 'data': currencies})}\n\n"
            await asyncio.sleep(30)
    return EventSourceResponse(event_generator())
```
Uses `sse-starlette` package.

### Error Response Format (identical to current)
```json
{ "success": false, "message": "Validation error", "errors": {} }
```

### Cron Schedules (identical)
| Job | Schedule | Action |
|-----|----------|--------|
| `currency_sync` | configurable (default `*/30 * * * *`) | Run currency parser |
| `commodity_sync` | `*/30 * * * *` | Run commodity parser |
| `holiday_sync` | `5 0 * * *` | Sync holidays RU+UK |

---

## Open Questions

> [!IMPORTANT]
> **Репозиторій**: У завданні вказано `git remote add origin git@github.com:difome/apid.r00t.top-fastapi.git`. Куди саме створювати новий проект — в окрему папку поруч з `apid-fastif/` (наприклад `apid-fastapi/`), чи в інше місце?

> [!IMPORTANT]
> **`WEBHOOK_SECRET`**: Вебхук використовує `process.env.WEBHOOK_SECRET`, якого немає у `.env.example`. Переносити цю змінну у `Settings` або лишити опціональним параметром?

> [!NOTE]
> **Playwright для commodities**: Парсер commodities використовує Playwright для отримання auth-токена з metalcharts.org, а потім звичайний HTTPS для даних. Це переноситься 1:1 з `playwright-python`. Під час тестів у CI — мокається через `respx`.

> [!NOTE]
> **`mc_auth.json`**: Поточний парсер зберігає auth-токен у файлі `mc_auth.json` з TTL 10 хв. У Python-версії — те саме: файл в робочій директорії контейнера.

---

## Execution Order

1. **Infra**: `pyproject.toml`, `.env.example`, `core/config.py`, `core/db.py`, `core/redis.py`, `main.py` (lifespan skeleton)
2. **DB models** (all 10) + Alembic first migration
3. **`currency` module** — full (router + service + providers + tests) → reference pattern
4. **`commodities` module** — router + service + Playwright parser + investing provider + tests
5. **`holidays` module** — Cheerio→BS4/selectolax scraping + tests
6. **`movies`, `memes`, `facts`** modules + tests
7. **`webhook` module** + test
8. **`admin` module** — all CRUD endpoints + ban management + tests
9. **Middleware** — ban check + request logger + error handler
10. **APScheduler** + dynamic reschedule via admin config endpoint
11. **Dockerfile** (multi-stage) + `docker-compose.yml` update + `.github/workflows/ci.yml`
12. **Final verification** — compare every endpoint path/response field with current Fastify backend 1:1

---

## Verification Plan

### Automated Tests
```bash
uv run pytest --cov=app --cov-fail-under=80 -v
uv run ruff check app tests
uv run mypy app
```

### Manual Verification
- Start new Python backend alongside current one on different port
- Run both side-by-side, compare responses for each endpoint
- Verify frontend works with new backend by pointing `VITE_API_URL` at it
