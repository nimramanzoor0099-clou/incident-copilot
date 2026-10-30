-- Record which AI provider and model produced each saved analysis.
ALTER TABLE analyses ADD COLUMN provider TEXT NOT NULL DEFAULT 'rules' CHECK (provider IN ('rules','claude','openai','gemini'));
ALTER TABLE analyses ADD COLUMN model TEXT;

-- Before this migration the only AI provider was Claude.
UPDATE analyses SET provider = 'claude' WHERE engine = 'ai';
UPDATE analyses SET model = 'built-in' WHERE engine = 'rules';
