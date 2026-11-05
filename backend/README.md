# Campus Chaos backend

Django Ninja API that stores guest players and their saves.

## Setup

Run these from the `backend` folder:

```bash
py -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py runserver 8000
```

Interactive API docs are at http://localhost:8000/api/docs.

The game finds this API through `VITE_API_URL` in `frontend/.env`. To create that file, copy `frontend/.env.example`.

## API

| Method | Path           | Auth | Result                                           |
| ------ | -------------- | ---- | ------------------------------------------------ |
| POST   | `/api/players` | None | `201` with `{ "code": "ABCDEF" }`                |
| GET    | `/api/save`    | Code | `200` with the save, or `404` if there isn't one |
| PUT    | `/api/save`    | Code | `204`, replacing the save                        |

Send the player code as `Authorization: Bearer ABCDEF`.

A save looks like this:

```json
{
  "version": 1,
  "scene": "CampusScene",
  "position": { "x": 65, "y": 38 },
  "stats": { "gpa": 5, "energy": 100, "dignity": 100, "sanity": 100 },
  "flags": {}
}
```

`position` is in tiles. `stats` must match `frontend/src/stats.ts`, so update `players/schemas.py` when a stat changes.

## Limits

- Creating players: 10 per minute per IP address.
- Wrong codes: 20 per IP address locks that address out for 15 minutes, counted from the last wrong code.

Both counters use Django's default in-memory cache, which is per process. Before running more than one worker, set `CACHES` to something shared such as Redis. Behind a reverse proxy, set `NINJA_NUM_PROXIES` and read the client IP from the forwarded header in `PlayerCodeAuth`, otherwise all players share one IP address.

## Tests

```bash
.venv/Scripts/python.exe manage.py test
```
