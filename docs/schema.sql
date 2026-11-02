-- Proposed production schema. Not required for the shipped static app.
CREATE TABLE channels (
 id text PRIMARY KEY, name text NOT NULL, sort_name text NOT NULL,
 country char(2) NOT NULL, category text NOT NULL,
 adult boolean NOT NULL DEFAULT false, state text NOT NULL DEFAULT 'draft'
 CHECK (state IN ('draft','published','disabled')), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE source_snapshots (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 source_url text NOT NULL, upstream_commit text, sha256 text NOT NULL,
 fetched_at timestamptz NOT NULL, storage_key text NOT NULL,
 UNIQUE(source_url,sha256)
);
CREATE TABLE candidates (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 snapshot_id bigint NOT NULL REFERENCES source_snapshots(id), upstream_id text,
 raw_record jsonb NOT NULL, channel_id text REFERENCES channels(id),
 review_state text NOT NULL DEFAULT 'pending'
 CHECK (review_state IN ('pending','approved','rejected','blocked'))
);
CREATE TABLE feeds (
 id text PRIMARY KEY, channel_id text NOT NULL REFERENCES channels(id),
 language text NOT NULL, official_url text NOT NULL,
 mode text NOT NULL CHECK (mode IN ('external','official-embed','hls')),
 geo_policy text NOT NULL DEFAULT 'unknown' CHECK (geo_policy IN ('unknown','global','restricted')),
 allowed_countries text[] NOT NULL DEFAULT '{}',
 drm text NOT NULL DEFAULT 'unknown' CHECK (drm IN ('unknown','none','required')),
 review_expires_at timestamptz, disabled boolean NOT NULL DEFAULT true
);
CREATE TABLE rights_reviews (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 feed_id text NOT NULL REFERENCES feeds(id), reviewer_id text NOT NULL,
 decision text NOT NULL CHECK (decision IN ('pending','approved','denied','revoked')),
 permitted_use jsonb NOT NULL, private_evidence_key text,
 reviewed_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz
);
CREATE TABLE endpoints (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 feed_id text NOT NULL REFERENCES feeds(id), url text NOT NULL,
 priority integer NOT NULL DEFAULT 0, health text NOT NULL DEFAULT 'unknown',
 last_checked_at timestamptz, failure_streak integer NOT NULL DEFAULT 0,
 UNIQUE(feed_id,url)
);
CREATE TABLE health_checks (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 endpoint_id bigint NOT NULL REFERENCES endpoints(id), checked_at timestamptz NOT NULL,
 probe_country char(2), result text NOT NULL, latency_ms integer
);
CREATE TABLE programs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 feed_id text NOT NULL REFERENCES feeds(id), starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL, title text NOT NULL,
 snapshot_id bigint REFERENCES source_snapshots(id), CHECK(ends_at > starts_at),
 UNIQUE(feed_id,starts_at,title)
);
CREATE INDEX channel_browse ON channels(state,country,category,sort_name,id);
CREATE INDEX feed_channel ON feeds(channel_id);
CREATE INDEX current_program ON programs(feed_id,starts_at,ends_at);
-- Apply eligibility and latest non-expired review in a transaction at resolution.
-- Grant append-only review writes; enforce admin role/territory policy in the service.
