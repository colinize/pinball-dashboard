# Worker Infrastructure & Metadata Enhancement Design

**Date:** 2026-02-03
**Status:** Approved

## Overview

Split architecture where cloud services (Vercel, Supabase) remain always-accessible while a local worker handles media downloads to an external drive.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD (always accessible)               │
├─────────────────────────────────────────────────────────────────┤
│  Vercel (free)              Supabase (free)                     │
│  ┌──────────────┐           ┌──────────────────────────┐        │
│  │  Dashboard   │ ────────► │  sources                 │        │
│  │  (React)     │           │  content_items           │        │
│  └──────────────┘           │  worker_status           │        │
│                             └──────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │ polls/updates
                                       │
┌─────────────────────────────────────────────────────────────────┐
│                      LOCAL (when machine is on)                 │
├─────────────────────────────────────────────────────────────────┤
│  launchd daemon (auto-start, auto-restart)                      │
│  ┌──────────────────────────────────────────────────┐          │
│  │  content-monitor worker                          │          │
│  │  - Checks RSS/YouTube feeds on schedule          │          │
│  │  - Creates items in Supabase                     │          │
│  │  - Downloads media to external drive             │          │
│  │  - Updates status in Supabase                    │          │
│  │  - Writes heartbeat every 60s                    │          │
│  └──────────────────────────────────────────────────┘          │
│                              │                                  │
│                              ▼                                  │
│                    /Volumes/[ExternalDrive]/content-monitor/    │
└─────────────────────────────────────────────────────────────────┘
```

## Worker Behavior

### Respects Dashboard Settings

Per-source settings control behavior:
- `auto_archive` → Download media to external drive
- `auto_transcribe` → Generate transcripts after archiving
- `auto_approve` → Skip review queue
- `aggregate` → Include in aggregate feed

### Processing Pipeline

```
pending → archiving → transcribing → complete
              ↓            ↓
          (skipped if   (skipped if
       !auto_archive)  !auto_transcribe)
```

### Startup Reconciliation

On worker start:
1. Scan external drive for existing media files
2. Match against Supabase items by `archive_path`
3. Mark items as `complete` if file exists but status is stuck
4. Log orphaned files (on disk but not in DB) for manual review

### File Structure

```
/Volumes/[Drive]/content-monitor/
├── media/
│   ├── youtube/
│   │   └── {channel_name}/{video_id}.{ext}
│   └── podcast/
│       └── {source_name}/{episode_slug}.{ext}
├── transcripts/
│   └── {source_name}/{item_id}.txt
└── logs/
    └── worker.log
```

### Heartbeat Mechanism

- Worker writes to `worker_status` table every 60s
- Dashboard polls this table
- No ngrok dependency

## Dashboard UI Changes

### Worker Status Indicator

Replace "Pipeline Error" with:

| State | Display | Meaning |
|-------|---------|---------|
| Heartbeat < 5 min | 🟢 Worker Online | Processing active |
| Heartbeat 5-60 min | 🟡 Worker Idle | May be sleeping/paused |
| Heartbeat > 60 min | ⚫ Worker Offline | Not running |

### Enhanced Item Cards

**Podcasts:**
```
Running a Successful Arcade | Legendary Artist Doug Watson
Dec 17, 2024 • 1:23:45 • Don & Jeff       complete
└─ published   └─ duration  └─ author
```

**YouTube:**
```
We Played King Kong at the Stern Factory!!
Apr 28, 2025 • 45:23 • 12.4K views        complete
└─ published  └─ duration └─ views
```

### Podcast Thumbnails

- Extract `<itunes:image>` or `<image><url>` from RSS feed
- Store in `source.config.metadata.feed_image_url`
- Display in ItemCard (falls back to emoji if missing)

## Implementation Phases

### Phase 1: Database & Worker Infrastructure
- Create `worker_status` table in Supabase
- Add heartbeat writing to content-monitor worker
- Create launchd plist for always-on daemon
- Add startup reconciliation

### Phase 2: Dashboard - Worker Status
- Remove ngrok health check
- Add worker status API and hook
- Replace "Pipeline Error" with worker status indicator

### Phase 3: Dashboard - Enhanced Metadata
- Update ItemCard to show published_at, duration, author
- Update RSS checker to extract itunes:image
- Update SourceHeader for podcast artwork
- Add richer columns to Sources page

### Phase 4: Populate Data
- Run initial checks on all YouTube sources
- Run initial checks on all RSS sources
- Verify metadata displaying correctly

## File Changes

```
content-monitor/
├── content_monitor/
│   ├── worker.py              (add heartbeat)
│   ├── checkers/rss.py        (extract itunes:image)
│   └── reconcile.py           (new - startup sync)
├── scripts/
│   └── check_all_sources.py   (new - bulk initial check)
└── com.content-monitor.plist  (new - launchd daemon)

pinball-dashboard/
├── src/
│   ├── api/worker.ts          (new - worker status)
│   ├── components/Layout.tsx  (worker status indicator)
│   ├── pages/SourceDetail.tsx (enhanced ItemCard)
│   └── pages/Sources.tsx      (richer columns)
```

## Constraints

- No new paid services
- All free tiers: Vercel, Supabase, local compute
- Media stored on external drive (local machine required)
- Dashboard/metadata always accessible from anywhere
